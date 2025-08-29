from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Float, UniqueConstraint
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
import stripe
import json

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

# Stripe configuration (for vendor subscriptions only)
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
stripe.api_key = STRIPE_SECRET_KEY

# App configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:8080")

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
    user_type = Column(String, default="renter")  # "renter" or "company"
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
    contribution_amount = Column(Float, nullable=True)
    
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
    dumpster_sizes = Column(Text)  # JSON string of dumpster sizes
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

class UserTimeSlotSelection(Base):
    __tablename__ = "user_time_slot_selections"
    __table_args__ = (UniqueConstraint('time_slot_id', 'group_member_id'),)
    
    id = Column(Integer, primary_key=True, index=True)
    group_member_id = Column(Integer, ForeignKey("group_members.id"))
    time_slot_id = Column(Integer, ForeignKey("time_slots.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    member = relationship("GroupMember", foreign_keys=[group_member_id])
    time_slot = relationship("TimeSlot", foreign_keys=[time_slot_id])

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

class PaymentRequest(Base):
    __tablename__ = "payment_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    from_member_id = Column(Integer, ForeignKey("group_members.id"))  # Group creator
    to_member_id = Column(Integer, ForeignKey("group_members.id"))    # Member who owes
    amount = Column(Float)
    description = Column(String)  # e.g., "Dumpster rental share"
    preferred_method = Column(String)  # "zelle", "venmo", "cash"
    payment_details = Column(Text)  # JSON with creator's Zelle email/phone or Venmo username
    status = Column(String, default="pending")  # pending, paid, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    
    group = relationship("Group", foreign_keys=[group_id])
    from_member = relationship("GroupMember", foreign_keys=[from_member_id])
    to_member = relationship("GroupMember", foreign_keys=[to_member_id])

class VendorSubscription(Base):
    __tablename__ = "vendor_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("companies.id"))
    plan_type = Column(String, default="basic")  # "basic", "premium" 
    monthly_fee = Column(Float, default=29.99)
    status = Column(String, default="active")  # active, cancelled, past_due
    billing_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    
    vendor = relationship("Company", foreign_keys=[vendor_id])

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
    user_type: str = "renter"

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    phone: str
    address: str
    user_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TimeSlotCreate(BaseModel):
    start_date: str
    end_date: str

class TimeSlotResponse(BaseModel):
    id: int
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

class JoinGroupRequest(BaseModel):
    time_slot_ids: List[int]

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
    invitees: Optional[List[InviteeResponse]] = []
    
    class Config:
        from_attributes = True

class DumpsterSize(BaseModel):
    cubic_yards: str
    dimensions: str
    starting_price: str
    starting_tonnage: str
    per_ton_overage_price: str
    additional_day_price: str

class CompanyCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: str
    service_areas: str
    dumpster_sizes: List[DumpsterSize]

class CompanyResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    address: str
    service_areas: str
    dumpster_sizes: List[DumpsterSize]
    rating: float
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class PaymentMethodSetupRequest(BaseModel):
    preferred_method: str  # "zelle", "venmo", "cash"
    payment_details: str   # JSON string with Zelle email/phone or Venmo username

class PaymentRequestCreate(BaseModel):
    description: str
    preferred_method: str
    payment_details: str

class PaymentRequestResponse(BaseModel):
    id: int
    group_id: int
    from_member_name: str
    to_member_name: str
    amount: float
    description: str
    preferred_method: str
    payment_details: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class VendorSubscriptionResponse(BaseModel):
    id: int
    vendor_id: int
    plan_type: str
    monthly_fee: float
    status: str
    billing_date: datetime
    
    class Config:
        from_attributes = True

class RentalInfo(BaseModel):
    dumpster_size: str  # JSON string of selected dumpster size

class GroupCreateWithPayment(BaseModel):
    name: str
    address: str
    max_participants: int = 5
    vendor_id: Optional[int] = None
    time_slots: Optional[List[TimeSlotCreate]] = []
    invitees: Optional[List[InviteeCreate]] = []
    payment_method_details: PaymentMethodSetupRequest
    rental_info: Optional[RentalInfo] = None

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
        hashed_password=hashed_password,
        user_type=user.user_type
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
    db.refresh(group_member)
    
    # Auto-select all time slots for the group creator
    if group.time_slots:
        # Get the created time slots
        created_time_slots = db.query(TimeSlot).filter(TimeSlot.group_id == db_group.id).all()
        
        # Create time slot selections for the creator for all time slots
        for time_slot in created_time_slots:
            time_slot_selection = UserTimeSlotSelection(
                group_member_id=group_member.id,
                time_slot_id=time_slot.id
            )
            db.add(time_slot_selection)
        
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
        "time_slots": [{"id": ts.id, "start_date": ts.start_date, "end_date": ts.end_date} for ts in db_group.time_slots],
        "participants": participants
    }

@app.post("/groups/create-with-payment", response_model=GroupResponse)
async def create_group_with_payment(
    group: GroupCreateWithPayment, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Create a group with payment method details stored"""
    try:
        
        # Create the group
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
        
        # Create group member (creator)
        group_member = GroupMember(
            group_id=db_group.id,
            user_id=current_user.id
        )
        db.add(group_member)
        db.commit()
        db.refresh(group_member)
        
        # Auto-select all time slots for the group creator
        if group.time_slots:
            created_time_slots = db.query(TimeSlot).filter(TimeSlot.group_id == db_group.id).all()
            for time_slot in created_time_slots:
                time_slot_selection = UserTimeSlotSelection(
                    group_member_id=group_member.id,
                    time_slot_id=time_slot.id
                )
                db.add(time_slot_selection)
            db.commit()
        
        # Create invitees if provided
        if group.invitees:
            for invitee_data in group.invitees:
                if invitee_data.name and invitee_data.email:
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
        
        # Create rental if service information is provided
        if group.rental_info and group.vendor_id:
            try:
                # Parse the dumpster size information
                dumpster_size_info = json.loads(group.rental_info.dumpster_size)
                
                # Calculate total cost (starting price for now - can be updated later with overage)
                total_cost = float(dumpster_size_info['starting_price'])
                
                # Create rental record with placeholder delivery date (to be set on confirmation screen)
                placeholder_delivery = datetime.utcnow() + timedelta(days=7)  # 7 days from now as placeholder
                
                rental = Rental(
                    group_id=db_group.id,
                    company_id=group.vendor_id,
                    size=f"{dumpster_size_info['cubic_yards']} cu. yd. ({dumpster_size_info['dimensions']})",
                    duration=7,  # Standard 7 days as mentioned in requirements
                    total_cost=total_cost,
                    delivery_date=placeholder_delivery,
                    status="pending"
                )
                db.add(rental)
                db.commit()
                
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                # Log the error but don't fail the group creation
                print(f"Error creating rental: {str(e)}")
        
        # Refresh to get all related data
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
            "time_slots": [{"id": ts.id, "start_date": ts.start_date, "end_date": ts.end_date} for ts in db_group.time_slots],
            "participants": participants
        }
        
    except Exception as e:
        # Rollback any database changes if anything fails
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Group creation failed: {str(e)}")

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
        
        # Get invitees for this group
        invitees = []
        for invitee in group.invitees:
            invitees.append({
                "id": invitee.id,
                "name": invitee.name,
                "email": invitee.email,
                "phone": invitee.phone,
                "join_token": invitee.join_token,
                "invitation_sent": invitee.invitation_sent,
                "created_at": invitee.created_at
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
            "time_slots": [{"id": ts.id, "start_date": ts.start_date, "end_date": ts.end_date} for ts in group.time_slots],
            "participants": participants,
            "invitees": invitees
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
        
        # Get invitees for this group
        invitees = []
        for invitee in group.invitees:
            invitees.append({
                "id": invitee.id,
                "name": invitee.name,
                "email": invitee.email,
                "phone": invitee.phone,
                "join_token": invitee.join_token,
                "invitation_sent": invitee.invitation_sent,
                "created_at": invitee.created_at
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
            "time_slots": [{"id": ts.id, "start_date": ts.start_date, "end_date": ts.end_date} for ts in group.time_slots],
            "participants": participants,
            "invitees": invitees
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
    
    # Get invitees for this group
    invitees = []
    for invitee in group.invitees:
        invitees.append({
            "id": invitee.id,
            "name": invitee.name,
            "email": invitee.email,
            "phone": invitee.phone,
            "join_token": invitee.join_token,
            "invitation_sent": invitee.invitation_sent,
            "created_at": invitee.created_at
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
        "time_slots": [{"id": ts.id, "start_date": ts.start_date, "end_date": ts.end_date} for ts in group.time_slots],
        "participants": participants,
        "invitees": invitees
    }

@app.post("/groups/{group_id}/join")
async def join_group(group_id: int, join_request: JoinGroupRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
    
    # Get group time slots
    group_time_slots = db.query(TimeSlot).filter(TimeSlot.group_id == group_id).all()
    
    # Validate time slot selection - only required if group has time slots
    if group_time_slots and not join_request.time_slot_ids:
        raise HTTPException(status_code=400, detail="You must select at least one available time slot")
    
    # Verify that all selected time slots belong to this group
    if join_request.time_slot_ids:
        group_time_slot_ids = [ts.id for ts in group_time_slots]
        for time_slot_id in join_request.time_slot_ids:
            if time_slot_id not in group_time_slot_ids:
                raise HTTPException(status_code=400, detail=f"Time slot {time_slot_id} does not belong to this group")
    
    group_member = GroupMember(
        group_id=group_id,
        user_id=current_user.id
    )
    db.add(group_member)
    db.commit()
    db.refresh(group_member)
    
    # Add user's time slot selections
    for time_slot_id in join_request.time_slot_ids:
        time_slot_selection = UserTimeSlotSelection(
            group_member_id=group_member.id,
            time_slot_id=time_slot_id
        )
        db.add(time_slot_selection)
    
    db.commit()
    
    return {"message": "Successfully joined group"}

@app.post("/join/{token}")
async def join_group_by_token(token: str, join_request: JoinGroupRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
    
    # No payment method required - just join the group
    
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
    
    # Get group time slots
    group_time_slots = db.query(TimeSlot).filter(TimeSlot.group_id == group.id).all()
    
    # Validate time slot selection - only required if group has time slots
    if group_time_slots and not join_request.time_slot_ids:
        raise HTTPException(status_code=400, detail="You must select at least one available time slot")
    
    # Verify that all selected time slots belong to this group
    if join_request.time_slot_ids:
        group_time_slot_ids = [ts.id for ts in group_time_slots]
        for time_slot_id in join_request.time_slot_ids:
            if time_slot_id not in group_time_slot_ids:
                raise HTTPException(status_code=400, detail=f"Time slot {time_slot_id} does not belong to this group")
    
    # Add user to group (no payment info needed)
    group_member = GroupMember(
        group_id=group.id,
        user_id=current_user.id
    )
    db.add(group_member)
    db.commit()
    db.refresh(group_member)
    
    # Add user's time slot selections
    for time_slot_id in join_request.time_slot_ids:
        time_slot_selection = UserTimeSlotSelection(
            group_member_id=group_member.id,
            time_slot_id=time_slot_id
        )
        db.add(time_slot_selection)
    
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
    
    # Get time slots with IDs
    time_slots = db.query(TimeSlot).filter(TimeSlot.group_id == group.id).all()
    
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
            } if creator else None,
            "time_slots": [{"id": ts.id, "start_date": ts.start_date, "end_date": ts.end_date} for ts in time_slots]
        },
        "invitee": {
            "name": invitee.name,
            "email": invitee.email
        }
    }

@app.delete("/groups/{group_id}")
async def delete_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if the current user is the creator of the group
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the group creator can delete this group")
    
    # Delete related data first (due to foreign key constraints)
    # Delete group members
    db.query(GroupMember).filter(GroupMember.group_id == group_id).delete()
    
    # Delete time slots
    db.query(TimeSlot).filter(TimeSlot.group_id == group_id).delete()
    
    # Delete invitees
    db.query(Invitee).filter(Invitee.group_id == group_id).delete()
    
    # Delete rentals
    db.query(Rental).filter(Rental.group_id == group_id).delete()
    
    # Finally delete the group
    db.delete(group)
    db.commit()
    
    return {"message": "Group deleted successfully"}

@app.get("/groups/{group_id}/members")
async def get_group_members(group_id: int, db: Session = Depends(get_db)):
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [{"user_id": member.user_id, "joined_at": member.joined_at} for member in members]

@app.post("/companies", response_model=CompanyResponse)
async def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    # Convert dumpster_sizes to JSON string for storage
    dumpster_sizes_json = json.dumps([size.dict() for size in company.dumpster_sizes])
    
    db_company = Company(
        name=company.name,
        email=company.email,
        phone=company.phone,
        address=company.address,
        service_areas=company.service_areas,
        dumpster_sizes=dumpster_sizes_json
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    
    # Convert back to response format
    response_data = {
        "id": db_company.id,
        "name": db_company.name,
        "email": db_company.email,
        "phone": db_company.phone,
        "address": db_company.address,
        "service_areas": db_company.service_areas,
        "dumpster_sizes": [DumpsterSize(**size) for size in json.loads(db_company.dumpster_sizes)],
        "rating": db_company.rating
    }
    return CompanyResponse(**response_data)

@app.get("/companies", response_model=list[CompanyResponse])
async def get_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    companies = db.query(Company).offset(skip).limit(limit).all()
    result = []
    for company in companies:
        company_data = {
            "id": company.id,
            "name": company.name,
            "email": company.email,
            "phone": company.phone,
            "address": company.address,
            "service_areas": company.service_areas,
            "dumpster_sizes": [DumpsterSize(**size) for size in json.loads(company.dumpster_sizes)],
            "rating": company.rating
        }
        result.append(CompanyResponse(**company_data))
    return result

@app.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company_data = {
        "id": company.id,
        "name": company.name,
        "email": company.email,
        "phone": company.phone,
        "address": company.address,
        "service_areas": company.service_areas,
        "dumpster_sizes": [DumpsterSize(**size) for size in json.loads(company.dumpster_sizes)],
        "rating": company.rating
    }
    return CompanyResponse(**company_data)

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

class UserTimeSlotSelectionResponse(BaseModel):
    time_slot_id: int
    start_date: str
    end_date: str
    
    class Config:
        from_attributes = True

class UpdateTimeSlotSelectionsRequest(BaseModel):
    time_slot_ids: List[int]

class TimeSlotAnalysis(BaseModel):
    time_slot_id: int
    start_date: str
    end_date: str
    selected_by_count: int
    selected_by_users: List[str]
    is_universal: bool  # True if ALL group members selected this slot

@app.get("/groups/{group_id}/user-time-slots", response_model=List[UserTimeSlotSelectionResponse])
async def get_user_time_slot_selections(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's time slot selections for a specific group"""
    # Check if user is a member of the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    
    # Get user's time slot selections
    selections = db.query(UserTimeSlotSelection).filter(
        UserTimeSlotSelection.group_member_id == member.id
    ).all()
    
    result = []
    for selection in selections:
        time_slot = db.query(TimeSlot).filter(TimeSlot.id == selection.time_slot_id).first()
        if time_slot:
            result.append({
                "time_slot_id": time_slot.id,
                "start_date": time_slot.start_date,
                "end_date": time_slot.end_date
            })
    
    return result

@app.put("/groups/{group_id}/user-time-slots")
async def update_user_time_slot_selections(
    group_id: int, 
    request: UpdateTimeSlotSelectionsRequest,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Update current user's time slot selections for a specific group"""
    # Check if user is a member of the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    
    # Get group time slots
    group_time_slots = db.query(TimeSlot).filter(TimeSlot.group_id == group_id).all()
    
    # Validate that time slots exist and belong to this group if any are provided
    if request.time_slot_ids:
        group_time_slot_ids = [ts.id for ts in group_time_slots]
        for time_slot_id in request.time_slot_ids:
            if time_slot_id not in group_time_slot_ids:
                raise HTTPException(status_code=400, detail=f"Time slot {time_slot_id} does not belong to this group")
    
    # Validate that at least one time slot is selected if group has time slots
    if group_time_slots and not request.time_slot_ids:
        raise HTTPException(status_code=400, detail="You must select at least one available time slot")
    
    # Remove existing selections
    db.query(UserTimeSlotSelection).filter(
        UserTimeSlotSelection.group_member_id == member.id
    ).delete()
    
    # Add new selections
    for time_slot_id in request.time_slot_ids:
        time_slot_selection = UserTimeSlotSelection(
            group_member_id=member.id,
            time_slot_id=time_slot_id
        )
        db.add(time_slot_selection)
    
    db.commit()
    
    return {"message": "Time slot selections updated successfully"}

@app.get("/groups/{group_id}/time-slot-analysis", response_model=List[TimeSlotAnalysis])
async def get_time_slot_analysis(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get analysis of time slot selections for all group members"""
    # Check if user is a member of the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    
    # Get all time slots for the group
    time_slots = db.query(TimeSlot).filter(TimeSlot.group_id == group_id).all()
    
    # Get all group members
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    total_members = len(members)
    
    result = []
    for time_slot in time_slots:
        # Get all selections for this time slot
        selections = db.query(UserTimeSlotSelection).filter(
            UserTimeSlotSelection.time_slot_id == time_slot.id
        ).all()
        
        # Get member IDs who selected this slot
        member_ids = [selection.group_member_id for selection in selections]
        
        # Get user names for those who selected this slot (deduplicated)
        selected_users = []
        unique_member_ids = list(set(member_ids))  # Remove duplicate member IDs
        for member_id in unique_member_ids:
            member = db.query(GroupMember).filter(GroupMember.id == member_id).first()
            if member:
                user = db.query(User).filter(User.id == member.user_id).first()
                if user and user.name not in selected_users:  # Avoid duplicate names
                    selected_users.append(user.name)
        
        result.append({
            "time_slot_id": time_slot.id,
            "start_date": time_slot.start_date,
            "end_date": time_slot.end_date,
            "selected_by_count": len(selected_users),
            "selected_by_users": selected_users,
            "is_universal": len(selected_users) == total_members and total_members > 0
        })
    
    return result

# Payment request endpoints

@app.post("/groups/{group_id}/setup-payment-method")
async def setup_payment_method(
    group_id: int,
    request: PaymentMethodSetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Setup payment method for group creator"""
    # Verify user is the group creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can setup payment method")
    
    # Store payment method details (no external processing required)
    return {"message": "Payment method setup completed", "details": request.payment_details}

@app.post("/groups/{group_id}/generate-payment-requests")
async def generate_payment_requests(
    group_id: int,
    request: PaymentRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate payment requests for all group members"""
    # Verify user is the group creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can generate payment requests")
    
    # Get rental to calculate cost per member
    rental = db.query(Rental).filter(Rental.group_id == group_id).first()
    if not rental:
        raise HTTPException(status_code=404, detail="No rental found for this group")
    
    # Get all group members except the creator
    members = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id != current_user.id
    ).all()
    
    if not members:
        return {"message": "No other members to request payment from"}
    
    # Get creator's member record
    creator_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    cost_per_member = rental.total_cost / (len(members) + 1)  # +1 for creator
    
    payment_requests_created = []
    
    for member in members:
        # Create payment request
        payment_request = PaymentRequest(
            group_id=group_id,
            from_member_id=creator_member.id,
            to_member_id=member.id,
            amount=cost_per_member,
            description=request.description,
            preferred_method=request.preferred_method,
            payment_details=request.payment_details,
            status="pending"
        )
        db.add(payment_request)
        payment_requests_created.append(payment_request)
    
    db.commit()
    
    # Send notification emails to members
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            subject = f"Payment Request - {group.name}"
            
            # Parse payment details for display
            try:
                details = json.loads(request.payment_details)
                if request.preferred_method == "zelle":
                    payment_info = f"Zelle: {details.get('email', '')} or {details.get('phone', '')}"
                elif request.preferred_method == "venmo":
                    payment_info = f"Venmo: @{details.get('username', '')}"
                else:
                    payment_info = "Cash payment"
            except:
                payment_info = request.payment_details
            
            body = f"""
            <html>
                <body>
                    <h2>💰 Payment Request from {current_user.name}</h2>
                    
                    <p>Hi {user.name},</p>
                    
                    <p>You have a payment request for your share of the dumpster rental in group <strong>"{group.name}"</strong>.</p>
                    
                    <h3>📋 Payment Details:</h3>
                    <ul>
                        <li><strong>Amount:</strong> ${cost_per_member:.2f}</li>
                        <li><strong>For:</strong> {request.description}</li>
                        <li><strong>Pay via:</strong> {payment_info}</li>
                    </ul>
                    
                    <p>Please send your payment and the group creator will mark it as received.</p>
                    
                    <p>Questions? Contact {current_user.name} at {current_user.email}</p>
                    
                    <p>Best regards,<br>The Dumpster Sharing Team</p>
                </body>
            </html>
            """
            
            await send_email(user.email, subject, body)
    
    return {
        "message": f"Generated {len(payment_requests_created)} payment requests",
        "amount_per_member": cost_per_member,
        "total_requests": len(payment_requests_created)
    }

@app.get("/groups/{group_id}/payment-requests", response_model=list[PaymentRequestResponse])
async def get_payment_requests(
    group_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get all payment requests for a group - accessible by group creator"""
    # Verify group exists and user is the creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can view payment requests")
    
    # Get all payment requests for this group
    payment_requests = db.query(PaymentRequest).filter(PaymentRequest.group_id == group_id).all()
    
    result = []
    for pr in payment_requests:
        from_user = db.query(User).join(GroupMember).filter(GroupMember.id == pr.from_member_id).first()
        to_user = db.query(User).join(GroupMember).filter(GroupMember.id == pr.to_member_id).first()
        
        result.append({
            "id": pr.id,
            "group_id": pr.group_id,
            "from_member_name": from_user.name if from_user else "Unknown",
            "to_member_name": to_user.name if to_user else "Unknown",
            "amount": pr.amount,
            "description": pr.description,
            "preferred_method": pr.preferred_method,
            "payment_details": pr.payment_details,
            "status": pr.status,
            "created_at": pr.created_at
        })
    
    return result

@app.post("/groups/{group_id}/payment-requests/{request_id}/mark-paid")
async def mark_payment_received(
    group_id: int,
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a payment request as paid - only accessible by group creator"""
    # Verify group exists and user is the creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can mark payments as received")
    
    # Get payment request
    payment_request = db.query(PaymentRequest).filter(
        PaymentRequest.id == request_id,
        PaymentRequest.group_id == group_id
    ).first()
    
    if not payment_request:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    # Mark as paid
    payment_request.status = "paid"
    payment_request.paid_at = datetime.utcnow()
    db.add(payment_request)
    db.commit()
    
    return {"message": "Payment marked as received"}

@app.post("/groups/{group_id}/payment-requests/bulk-mark-paid")
async def bulk_mark_payments_received(
    group_id: int,
    request_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark multiple payment requests as paid - bulk operation for convenience"""
    # Verify group exists and user is the creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can mark payments as received")
    
    # Get all payment requests
    payment_requests = db.query(PaymentRequest).filter(
        PaymentRequest.id.in_(request_ids),
        PaymentRequest.group_id == group_id
    ).all()
    
    updated_count = 0
    for pr in payment_requests:
        if pr.status == "pending":
            pr.status = "paid"
            pr.paid_at = datetime.utcnow()
            db.add(pr)
            updated_count += 1
    
    db.commit()
    
    return {"message": f"Marked {updated_count} payments as received"}

class ServiceDetailsResponse(BaseModel):
    vendor_name: str
    total_cost: float
    delivery_date: str
    duration: int
    size: str
    
    class Config:
        from_attributes = True

class MemberPaymentResponse(BaseModel):
    member_id: int
    user_name: str
    user_email: str
    amount: float
    payment_status: str
    
    class Config:
        from_attributes = True

@app.get("/groups/{group_id}/service-details", response_model=ServiceDetailsResponse)
async def get_service_details(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get service details for group confirmation screen"""
    # Verify group exists and user is the creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can view service details")
    
    # Get rental information for this group
    rental = db.query(Rental).filter(Rental.group_id == group_id).first()
    if not rental:
        raise HTTPException(status_code=404, detail="No rental found for this group")
    
    # Get vendor information
    vendor = db.query(Company).filter(Company.id == rental.company_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {
        "vendor_name": vendor.name,
        "total_cost": rental.total_cost,
        "delivery_date": rental.delivery_date.isoformat(),
        "duration": rental.duration,
        "size": rental.size
    }

@app.get("/groups/{group_id}/payment-breakdown", response_model=list[MemberPaymentResponse])
async def get_payment_breakdown(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment breakdown per member for confirmation screen"""
    # Verify group exists and user is the creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can view payment breakdown")
    
    # Get rental to calculate cost per member
    rental = db.query(Rental).filter(Rental.group_id == group_id).first()
    if not rental:
        raise HTTPException(status_code=404, detail="No rental found for this group")
    
    # Get all group members
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    cost_per_member = rental.total_cost / len(members) if members else 0
    
    result = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            result.append({
                "member_id": member.id,
                "user_name": user.name,
                "user_email": user.email,
                "amount": cost_per_member,
                "payment_status": member.payment_status or "pending"
            })
    
    return result

@app.post("/groups/{group_id}/complete-group")
async def complete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete the group and notify all members - no payment processing"""
    # Verify group exists and user is the creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can complete the group")
    
    # Get all group members
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    
    # Get rental information
    rental = db.query(Rental).filter(Rental.group_id == group_id).first()
    if not rental:
        raise HTTPException(status_code=404, detail="No rental found for this group")
    
    # Update group and rental status
    group.status = "completed"
    rental.status = "scheduled"
    
    db.add(group)
    db.add(rental)
    db.commit()
    
    # Send confirmation emails to all members
    vendor = db.query(Company).filter(Company.id == rental.company_id).first()
    amount_per_member = rental.total_cost / len(members)
    
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            subject = f"Group Complete - {group.name}"
            body = f"""
            <html>
            <body>
                <h2>🎉 Your Group is Complete!</h2>
                
                <p>Dear {user.name},</p>
                
                <p>Great news! Your dumpster sharing group <strong>"{group.name}"</strong> is now complete and the service has been arranged.</p>
                
                <h3>📋 Service Details:</h3>
                <ul>
                    <li><strong>Vendor:</strong> {vendor.name if vendor else 'N/A'}</li>
                    <li><strong>Size:</strong> {rental.size}</li>
                    <li><strong>Duration:</strong> {rental.duration} days</li>
                    <li><strong>Delivery Date:</strong> {rental.delivery_date.strftime('%B %d, %Y')}</li>
                    <li><strong>Location:</strong> {group.address}</li>
                    <li><strong>Your Share:</strong> ${amount_per_member:.2f}</li>
                </ul>
                
                <p>Payment coordination will be handled by the group creator. Please coordinate with {current_user.name} for payment details.</p>
                
                <p>Thank you for using our dumpster sharing service!</p>
                
                <p>Best regards,<br>The Dumpster Sharing Team</p>
            </body>
            </html>
            """
            
            await send_email(user.email, subject, body)
    
    return {
        "message": "Group completed successfully - members notified",
        "members_notified": len(members),
        "total_amount": rental.total_cost,
        "amount_per_member": amount_per_member
    }

# Vendor subscription endpoints

class VendorSubscriptionRequest(BaseModel):
    payment_method_id: str
    plan_type: str = "basic"

@app.get("/stripe/config")
async def get_stripe_config():
    """Get Stripe publishable key for vendor subscriptions"""
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY}

@app.post("/vendors/{vendor_id}/subscribe")
async def create_vendor_subscription(
    vendor_id: int,
    request: VendorSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe subscription for a vendor"""
    # Verify vendor exists
    vendor = db.query(Company).filter(Company.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if subscription already exists
    existing_subscription = db.query(VendorSubscription).filter(
        VendorSubscription.vendor_id == vendor_id,
        VendorSubscription.status == "active"
    ).first()
    
    if existing_subscription:
        raise HTTPException(status_code=400, detail="Active subscription already exists")
    
    try:
        # Create Stripe customer for the vendor
        customer = stripe.Customer.create(
            email=vendor.email,
            name=vendor.name,
            metadata={
                'vendor_id': str(vendor_id),
                'company_name': vendor.name
            }
        )
        
        # Attach payment method to customer
        stripe.PaymentMethod.attach(
            request.payment_method_id,
            customer=customer.id
        )
        
        # Set as default payment method
        stripe.Customer.modify(
            customer.id,
            invoice_settings={'default_payment_method': request.payment_method_id}
        )
        
        # Create Stripe subscription
        price_id = "price_basic_29_99"  # You'd create this price in Stripe dashboard
        if request.plan_type == "premium":
            price_id = "price_premium_49_99"
        
        stripe_subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{'price': price_id}],
            payment_behavior='default_incomplete',
            payment_settings={'save_default_payment_method': 'on_subscription'},
            expand=['latest_invoice.payment_intent'],
        )
        
        # Create local subscription record
        monthly_fee = 29.99 if request.plan_type == "basic" else 49.99
        
        subscription = VendorSubscription(
            vendor_id=vendor_id,
            plan_type=request.plan_type,
            monthly_fee=monthly_fee,
            status="active",
            billing_date=datetime.utcnow() + timedelta(days=30),
            stripe_customer_id=customer.id,
            stripe_subscription_id=stripe_subscription.id
        )
        
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        
        return {
            "message": "Subscription created successfully",
            "subscription_id": subscription.id,
            "plan_type": subscription.plan_type,
            "monthly_fee": subscription.monthly_fee,
            "next_billing_date": subscription.billing_date,
            "stripe_subscription_id": stripe_subscription.id
        }
        
    except stripe.error.StripeError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Subscription creation failed: {str(e)}")

@app.get("/vendors/{vendor_id}/subscription", response_model=VendorSubscriptionResponse)
async def get_vendor_subscription(
    vendor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current subscription for a vendor"""
    subscription = db.query(VendorSubscription).filter(
        VendorSubscription.vendor_id == vendor_id,
        VendorSubscription.status == "active"
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    return subscription

@app.get("/admin/subscriptions", response_model=list[VendorSubscriptionResponse])
async def get_all_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all vendor subscriptions - admin only for now"""
    # Simple admin check - in real app you'd have proper admin roles
    if current_user.user_type != "company":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    subscriptions = db.query(VendorSubscription).all()
    return subscriptions

@app.get("/")
async def root():
    return {"message": "Dumpster Sharing API", "version": "2.0.0 - Payment Request Model"}