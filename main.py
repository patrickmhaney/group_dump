from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dumpster_sharing.db")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(title="Dumpster Sharing API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    phone = Column(String)
    address = Column(String)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    groups = relationship("GroupMember", back_populates="user")

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    address = Column(String)
    max_participants = Column(Integer, default=5)
    status = Column(String, default="forming")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    members = relationship("GroupMember", back_populates="group")
    rentals = relationship("Rental", back_populates="group")
    time_slots = relationship("TimeSlot", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime, default=datetime.utcnow)
    contribution_amount = Column(Float)
    
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="groups")

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    address = Column(String)
    service_areas = Column(Text)
    pricing_tiers = Column(Text)
    commission_rate = Column(Float, default=0.08)
    rating = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    rentals = relationship("Rental", back_populates="company")

class TimeSlot(Base):
    __tablename__ = "time_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    start_date = Column(String)
    end_date = Column(String)
    
    group = relationship("Group", back_populates="time_slots")

class Rental(Base):
    __tablename__ = "rentals"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    size = Column(String)
    duration = Column(Integer)
    total_cost = Column(Float)
    delivery_date = Column(DateTime)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    group = relationship("Group", back_populates="rentals")
    company = relationship("Company", back_populates="rentals")

Base.metadata.create_all(bind=engine)

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    phone: str
    address: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    phone: str
    address: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TimeSlotCreate(BaseModel):
    start_date: str
    end_date: str

class TimeSlotResponse(BaseModel):
    start_date: str
    end_date: str
    
    class Config:
        from_attributes = True

class GroupCreate(BaseModel):
    name: str
    address: str
    max_participants: int = 5
    time_slots: Optional[List[TimeSlotCreate]] = []

class GroupResponse(BaseModel):
    id: int
    name: str
    address: str
    max_participants: int
    status: str
    created_by: int
    created_at: datetime
    time_slots: Optional[List[TimeSlotResponse]] = []
    
    class Config:
        from_attributes = True

class CompanyCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: str
    service_areas: str
    pricing_tiers: str

class CompanyResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    address: str
    service_areas: str
    pricing_tiers: str
    rating: float
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        name=user.name,
        phone=user.phone,
        address=user.address,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/groups", response_model=GroupResponse)
async def create_group(group: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_group = Group(
        name=group.name,
        address=group.address,
        max_participants=group.max_participants,
        created_by=current_user.id
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # Create time slots if provided
    if group.time_slots:
        for time_slot_data in group.time_slots:
            time_slot = TimeSlot(
                group_id=db_group.id,
                start_date=time_slot_data.start_date,
                end_date=time_slot_data.end_date
            )
            db.add(time_slot)
        db.commit()
    
    group_member = GroupMember(
        group_id=db_group.id,
        user_id=current_user.id
    )
    db.add(group_member)
    db.commit()
    
    # Refresh to get time_slots
    db.refresh(db_group)
    return db_group

@app.get("/groups", response_model=list[GroupResponse])
async def get_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    groups = db.query(Group).offset(skip).limit(limit).all()
    return groups

@app.get("/groups/{group_id}", response_model=GroupResponse)
async def get_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@app.post("/groups/{group_id}/join")
async def join_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member of this group")
    
    member_count = db.query(GroupMember).filter(GroupMember.group_id == group_id).count()
    if member_count >= group.max_participants:
        raise HTTPException(status_code=400, detail="Group is full")
    
    group_member = GroupMember(
        group_id=group_id,
        user_id=current_user.id
    )
    db.add(group_member)
    db.commit()
    
    return {"message": "Successfully joined group"}

@app.get("/groups/{group_id}/members")
async def get_group_members(group_id: int, db: Session = Depends(get_db)):
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [{"user_id": member.user_id, "joined_at": member.joined_at} for member in members]

@app.post("/companies", response_model=CompanyResponse)
async def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    db_company = Company(
        name=company.name,
        email=company.email,
        phone=company.phone,
        address=company.address,
        service_areas=company.service_areas,
        pricing_tiers=company.pricing_tiers
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@app.get("/companies", response_model=list[CompanyResponse])
async def get_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    companies = db.query(Company).offset(skip).limit(limit).all()
    return companies

@app.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

class RentalCreate(BaseModel):
    group_id: int
    company_id: int
    size: str
    duration: int
    total_cost: float
    delivery_date: datetime

class RentalResponse(BaseModel):
    id: int
    group_id: int
    company_id: int
    size: str
    duration: int
    total_cost: float
    delivery_date: datetime
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

@app.post("/rentals", response_model=RentalResponse)
async def create_rental(rental: RentalCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == rental.group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == rental.group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    company = db.query(Company).filter(Company.id == rental.company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    
    db_rental = Rental(
        group_id=rental.group_id,
        company_id=rental.company_id,
        size=rental.size,
        duration=rental.duration,
        total_cost=rental.total_cost,
        delivery_date=rental.delivery_date
    )
    db.add(db_rental)
    db.commit()
    db.refresh(db_rental)
    return db_rental

@app.get("/rentals", response_model=list[RentalResponse])
async def get_rentals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_groups = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [member.group_id for member in user_groups]
    rentals = db.query(Rental).filter(Rental.group_id.in_(group_ids)).all()
    return rentals

@app.get("/")
async def root():
    return {"message": "Dumpster Sharing API", "version": "1.0.0"}