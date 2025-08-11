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
import secrets
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dumpster_sharing.db")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)

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

async def send_email(to_email: str, subject: str, body: str):
    """Send email using SMTP"""
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"Email configuration not set. Would send to {to_email}: {subject}")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, to_email, text)
        server.quit()
        
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {str(e)}")
        return False


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
    vendor_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    members = relationship("GroupMember", back_populates="group")
    rentals = relationship("Rental", back_populates="group")
    time_slots = relationship("TimeSlot", back_populates="group")
    invitees = relationship("Invitee", back_populates="group")
    vendor = relationship("Company", foreign_keys=[vendor_id])

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

class Invitee(Base):
    __tablename__ = "invitees"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    name = Column(String)
    email = Column(String)
    phone = Column(String, nullable=True)
    join_token = Column(String, unique=True)
    invitation_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    group = relationship("Group", back_populates="invitees")

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

def generate_join_token():
    """Generate a secure random token for joining groups"""
    return secrets.token_urlsafe(32)

async def send_invitations(group: Group, creator: User, db: Session):
    """Send invitation emails to all invitees of a group"""
    invitees = db.query(Invitee).filter(Invitee.group_id == group.id).all()
    
    for invitee in invitees:
        if not invitee.invitation_sent:
            subject = f"You're invited to join '{group.name}' dumpster sharing group!"
            
            # Get the base URL from environment or use default
            base_url = os.getenv("BASE_URL", "http://localhost:8080")
            join_url = f"{base_url}/join/{invitee.join_token}"
            
            # Create email body with group details and join link
            body = f"""
            <html>
                <body>
                    <h2>You've been invited to join a dumpster sharing group!</h2>
                    
                    <p>Hi {invitee.name},</p>
                    
                    <p>{creator.name} has invited you to join the dumpster sharing group "<strong>{group.name}</strong>".</p>
                    
                    <h3>Group Details:</h3>
                    <ul>
                        <li><strong>Group Name:</strong> {group.name}</li>
                        <li><strong>Location:</strong> {group.address}</li>
                        <li><strong>Max Participants:</strong> {group.max_participants}</li>
                        <li><strong>Created by:</strong> {creator.name} ({creator.email})</li>
                    </ul>
                    
                    <p>Join this group to share dumpster rental costs and coordinate pickup schedules with your neighbors!</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{join_url}" style="background-color: #4CAF50; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 4px;">
                            Join Group Now
                        </a>
                    </div>
                    
                    <p><strong>Or copy and paste this link:</strong><br>
                    <a href="{join_url}">{join_url}</a></p>
                    
                    <p>If you have any questions, feel free to contact {creator.name} at {creator.email}.</p>
                    
                    <p>Best regards,<br>The Dumpster Sharing Team</p>
                </body>
            </html>
            """
            
            # Send the email
            success = await send_email(invitee.email, subject, body)
            
            if success:
                invitee.invitation_sent = True
                db.add(invitee)
    
    db.commit()

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

class InviteeCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None

class InviteeResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    invitation_sent: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class GroupCreate(BaseModel):
    name: str
    address: str
    max_participants: int = 5
    vendor_id: Optional[int] = None
    time_slots: Optional[List[TimeSlotCreate]] = []
    invitees: Optional[List[InviteeCreate]] = []

class ParticipantResponse(BaseModel):
    id: int
    name: str
    email: str
    joined_at: datetime
    
    class Config:
        from_attributes = True

class GroupResponse(BaseModel):
    id: int
    name: str
    address: str
    max_participants: int
    current_participants: int
    status: str
    created_by: int
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    created_at: datetime
    time_slots: Optional[List[TimeSlotResponse]] = []
    participants: Optional[List[ParticipantResponse]] = []
    
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
        vendor_id=group.vendor_id,
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
    
    # Create invitees if provided
    if group.invitees:
        for invitee_data in group.invitees:
            if invitee_data.name and invitee_data.email:  # Only add if name and email are provided
                invitee = Invitee(
                    group_id=db_group.id,
                    name=invitee_data.name,
                    email=invitee_data.email,
                    phone=invitee_data.phone,
                    join_token=generate_join_token()
                )
                db.add(invitee)
        db.commit()
        
        # Send email invitations
        await send_invitations(db_group, current_user, db)
    
    group_member = GroupMember(
        group_id=db_group.id,
        user_id=current_user.id
    )
    db.add(group_member)
    db.commit()
    
    # Refresh to get time_slots and invitees
    db.refresh(db_group)
    
    # Get group members with user details for response
    members = db.query(GroupMember).filter(GroupMember.group_id == db_group.id).all()
    participants = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            participants.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "joined_at": member.joined_at
            })
    
    # Return properly formatted response
    return {
        "id": db_group.id,
        "name": db_group.name,
        "address": db_group.address,
        "max_participants": db_group.max_participants,
        "current_participants": len(participants),
        "status": db_group.status,
        "created_by": db_group.created_by,
        "vendor_id": db_group.vendor_id,
        "vendor_name": db_group.vendor.name if db_group.vendor else None,
        "created_at": db_group.created_at,
        "time_slots": [{"start_date": ts.start_date, "end_date": ts.end_date} for ts in db_group.time_slots],
        "participants": participants
    }

@app.get("/groups", response_model=list[GroupResponse])
async def get_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    groups = db.query(Group).offset(skip).limit(limit).all()
    
    # Add vendor names, participant count, and participant details to the response
    response_groups = []
    for group in groups:
        # Get group members with user details
        members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        participants = []
        for member in members:
            user = db.query(User).filter(User.id == member.user_id).first()
            if user:
                participants.append({
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "joined_at": member.joined_at
                })
        
        group_dict = {
            "id": group.id,
            "name": group.name,
            "address": group.address,
            "max_participants": group.max_participants,
            "current_participants": len(participants),
            "status": group.status,
            "created_by": group.created_by,
            "vendor_id": group.vendor_id,
            "vendor_name": group.vendor.name if group.vendor else None,
            "created_at": group.created_at,
            "time_slots": [{"start_date": ts.start_date, "end_date": ts.end_date} for ts in group.time_slots],
            "participants": participants
        }
        response_groups.append(group_dict)
    
    return response_groups

@app.get("/groups/invited", response_model=list[GroupResponse])
async def get_invited_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get groups where the current user's email matches an invitee email
    invitees = db.query(Invitee).filter(Invitee.email == current_user.email).all()
    invited_group_ids = [invitee.group_id for invitee in invitees]
    
    # Get groups where the current user is a member
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    member_group_ids = [membership.group_id for membership in memberships]
    
    # Also get groups created by the current user
    created_groups = db.query(Group).filter(Group.created_by == current_user.id).all()
    created_group_ids = [group.id for group in created_groups]
    
    # Combine all lists and remove duplicates
    all_group_ids = list(set(invited_group_ids + member_group_ids + created_group_ids))
    
    if not all_group_ids:
        return []
    
    groups = db.query(Group).filter(Group.id.in_(all_group_ids)).all()
    
    # Add vendor names, participant count, and participant details to the response
    response_groups = []
    for group in groups:
        # Get group members with user details
        members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
        participants = []
        for member in members:
            user = db.query(User).filter(User.id == member.user_id).first()
            if user:
                participants.append({
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "joined_at": member.joined_at
                })
        
        group_dict = {
            "id": group.id,
            "name": group.name,
            "address": group.address,
            "max_participants": group.max_participants,
            "current_participants": len(participants),
            "status": group.status,
            "created_by": group.created_by,
            "vendor_id": group.vendor_id,
            "vendor_name": group.vendor.name if group.vendor else None,
            "created_at": group.created_at,
            "time_slots": [{"start_date": ts.start_date, "end_date": ts.end_date} for ts in group.time_slots],
            "participants": participants
        }
        response_groups.append(group_dict)
    
    return response_groups

@app.get("/groups/{group_id}", response_model=GroupResponse)
async def get_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get group members with user details for response
    members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    participants = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            participants.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "joined_at": member.joined_at
            })
    
    return {
        "id": group.id,
        "name": group.name,
        "address": group.address,
        "max_participants": group.max_participants,
        "current_participants": len(participants),
        "status": group.status,
        "created_by": group.created_by,
        "vendor_id": group.vendor_id,
        "vendor_name": group.vendor.name if group.vendor else None,
        "created_at": group.created_at,
        "time_slots": [{"start_date": ts.start_date, "end_date": ts.end_date} for ts in group.time_slots],
        "participants": participants
    }

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

@app.post("/join/{token}")
async def join_group_by_token(token: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Join a group using an invitation token"""
    invitee = db.query(Invitee).filter(Invitee.join_token == token).first()
    if invitee is None:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation token")
    
    group = db.query(Group).filter(Group.id == invitee.group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user's email matches the invitee's email
    if current_user.email != invitee.email:
        raise HTTPException(status_code=403, detail="This invitation is not for your email address")
    
    # Check if already a member
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group.id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member of this group")
    
    # Check if group is full
    member_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
    if member_count >= group.max_participants:
        raise HTTPException(status_code=400, detail="Group is full")
    
    # Add user to group
    group_member = GroupMember(
        group_id=group.id,
        user_id=current_user.id
    )
    db.add(group_member)
    
    # Remove the invitation token as it's been used
    db.delete(invitee)
    db.commit()
    
    return {
        "message": "Successfully joined group",
        "group": {
            "id": group.id,
            "name": group.name,
            "address": group.address
        }
    }

@app.get("/join/{token}/info")
async def get_group_by_token(token: str, db: Session = Depends(get_db)):
    """Get group information using an invitation token"""
    invitee = db.query(Invitee).filter(Invitee.join_token == token).first()
    if invitee is None:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation token")
    
    group = db.query(Group).filter(Group.id == invitee.group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get group creator information
    creator = db.query(User).filter(User.id == group.created_by).first()
    
    # Get member count
    member_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
    
    return {
        "group": {
            "id": group.id,
            "name": group.name,
            "address": group.address,
            "max_participants": group.max_participants,
            "current_participants": member_count,
            "status": group.status,
            "created_at": group.created_at,
            "creator": {
                "name": creator.name,
                "email": creator.email
            } if creator else None
        },
        "invitee": {
            "name": invitee.name,
            "email": invitee.email
        }
    }

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