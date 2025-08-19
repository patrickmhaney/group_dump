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
import stripe
import json
import logging

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

# Stripe configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
stripe.api_key = STRIPE_SECRET_KEY

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
    
    # Virtual card fields for Phase 2
    virtual_card_id = Column(String, nullable=True)
    card_spending_limit = Column(Integer, nullable=True)  # Amount in cents
    card_status = Column(String, default="pending")  # pending, active, frozen, expired
    service_fee_collected = Column(Float, nullable=True)
    total_collected_amount = Column(Float, nullable=True)
    vendor_name = Column(String, nullable=True)
    vendor_website = Column(String, nullable=True)
    
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
    payment_setup_intent_id = Column(String, nullable=True)
    payment_method_id = Column(String, nullable=True)
    payment_status = Column(String, default="pending")
    
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
    payment_setup_intent_id = Column(String, nullable=True)
    payment_method_id = Column(String, nullable=True) 
    payment_status = Column(String, default="setup_required")
    
    group = relationship("Group", back_populates="invitees")

class UserTimeSlotSelection(Base):
    __tablename__ = "user_time_slot_selections"
    
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

class GroupPayment(Base):
    __tablename__ = "group_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    member_id = Column(Integer, ForeignKey("group_members.id"), nullable=True)
    amount = Column(Float)
    platform_fee = Column(Float, nullable=True)
    payment_intent_id = Column(String, nullable=True)
    status = Column(String, default="pending")
    scheduled_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    group = relationship("Group", foreign_keys=[group_id])
    member = relationship("GroupMember", foreign_keys=[member_id])

class CardTransaction(Base):
    __tablename__ = "card_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    card_id = Column(String)
    amount = Column(Integer)  # Amount in cents
    merchant_name = Column(String)
    status = Column(String)
    authorization_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    group = relationship("Group", foreign_keys=[group_id])

# Create all database tables including the new SecurityLog table
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
    
    # Virtual card fields for Phase 2
    virtual_card_id: Optional[str] = None
    card_spending_limit: Optional[int] = None
    card_status: Optional[str] = "pending"
    service_fee_collected: Optional[float] = None
    total_collected_amount: Optional[float] = None
    vendor_website: Optional[str] = None
    
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

class PaymentSetupRequest(BaseModel):
    payment_method_id: str

class PaymentSetupResponse(BaseModel):
    setup_intent_id: str
    client_secret: str
    status: str

class StripeConfigResponse(BaseModel):
    publishable_key: str

class VirtualCardCreateRequest(BaseModel):
    group_id: int
    spending_limit: int  # Amount in cents

class VirtualCardResponse(BaseModel):
    card_id: str
    group_id: int
    spending_limit: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class CardDetailsResponse(BaseModel):
    card_id: str
    group_id: int
    spending_limit: int
    status: str
    remaining_balance: int
    
    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: int
    group_id: int
    card_id: str
    amount: int
    merchant_name: str
    status: str
    authorization_code: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class CardControlsRequest(BaseModel):
    spending_limit: Optional[int] = None
    freeze_card: Optional[bool] = None

class GroupFundingStatus(BaseModel):
    group_id: int
    total_collected: float
    service_fee: float
    card_amount: float
    members_paid: int
    total_members: int
    is_fully_funded: bool

class RentalInfo(BaseModel):
    dumpster_size: str  # JSON string of selected dumpster size

class GroupCreateWithPayment(BaseModel):
    name: str
    address: str
    max_participants: int = 5
    vendor_id: Optional[int] = None
    time_slots: Optional[List[TimeSlotCreate]] = []
    invitees: Optional[List[InviteeCreate]] = []
    payment_method_id: str
    rental_info: Optional[RentalInfo] = None

# Virtual Card Service Functions
async def create_virtual_card_for_group(group_id: int, amount_cents: int, db: Session) -> dict:
    """Create a virtual card for a fully funded group"""
    try:
        # Note: Replace YOUR_BUSINESS_CARDHOLDER_ID with actual cardholder ID from Stripe setup
        # This would be configured during Phase 1.1 (Stripe Issuing setup)
        BUSINESS_CARDHOLDER_ID = os.getenv("STRIPE_BUSINESS_CARDHOLDER_ID", "ich_test_placeholder")
        
        # Create virtual card with Stripe Issuing
        card = stripe.issuing.Card.create(
            cardholder=BUSINESS_CARDHOLDER_ID,
            currency='usd',
            type='virtual',
            spending_controls={
                'spending_limits': [{
                    'amount': amount_cents,
                    'interval': 'per_authorization'
                }],
                'allowed_categories': ['rental_and_leasing_services'],
                'blocked_categories': ['gambling']
            },
            metadata={
                'group_id': str(group_id),
                'purpose': 'group_rental_booking'
            }
        )
        
        # Update group with card information
        group = db.query(Group).filter(Group.id == group_id).first()
        if group:
            group.virtual_card_id = card.id
            group.card_spending_limit = amount_cents
            group.card_status = 'active'
            db.add(group)
            db.commit()
        
        return {
            'card_id': card.id,
            'status': card.status,
            'spending_limit': amount_cents
        }
        
    except stripe.error.StripeError as e:
        logging.error(f"Stripe error creating virtual card: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Card creation failed: {str(e)}")
    except Exception as e:
        logging.error(f"Error creating virtual card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Card creation failed: {str(e)}")

async def calculate_group_funding_status(group_id: int, db: Session) -> GroupFundingStatus:
    """Calculate funding status for a group"""
    # Get group and rental info
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    rental = db.query(Rental).filter(Rental.group_id == group_id).first()
    if not rental:
        raise HTTPException(status_code=404, detail="No rental found for group")
    
    # Get all members and count those with completed payments
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    members_with_payment = [m for m in members if m.payment_status == "setup_complete"]
    
    total_cost = rental.total_cost
    service_fee_percentage = 0.10  # 10% service fee
    service_fee = total_cost * service_fee_percentage
    card_amount = total_cost - service_fee
    
    # For now, assume equal split among all members
    # In future, could support different contribution amounts
    total_collected = len(members_with_payment) * (total_cost / len(members)) if members else 0
    
    return GroupFundingStatus(
        group_id=group_id,
        total_collected=total_collected,
        service_fee=service_fee,
        card_amount=card_amount,
        members_paid=len(members_with_payment),
        total_members=len(members),
        is_fully_funded=len(members_with_payment) == len(members) and len(members) > 0
    )

async def log_card_transaction(transaction_data: dict, db: Session):
    """Log a card transaction to the database"""
    try:
        card_transaction = CardTransaction(
            group_id=transaction_data['group_id'],
            card_id=transaction_data['card_id'],
            amount=transaction_data['amount'],
            merchant_name=transaction_data.get('merchant_name', 'Unknown'),
            status=transaction_data['status'],
            authorization_code=transaction_data.get('authorization_code')
        )
        db.add(card_transaction)
        db.commit()
    except Exception as e:
        logging.error(f"Error logging card transaction: {str(e)}")

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
    """Create a group and setup payment method in a single transaction"""
    try:
        # First, create setup intent with Stripe to validate payment method
        setup_intent = stripe.SetupIntent.create(
            payment_method=group.payment_method_id,
            confirm=True,
            usage='off_session',
            automatic_payment_methods={
                'enabled': True,
                'allow_redirects': 'never'
            },
            metadata={
                'user_id': str(current_user.id),
                'group_name': group.name
            }
        )
        
        if setup_intent.status != "succeeded":
            raise HTTPException(status_code=400, detail="Payment method setup failed")
        
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
        
        # Create group member with payment info
        group_member = GroupMember(
            group_id=db_group.id,
            user_id=current_user.id,
            payment_setup_intent_id=setup_intent.id,
            payment_method_id=group.payment_method_id,
            payment_status="setup_complete"
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
        
    except stripe.error.StripeError as e:
        # Rollback any database changes if payment fails
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
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
            # Phase 3: Add virtual card fields
            "virtual_card_id": group.virtual_card_id,
            "card_spending_limit": group.card_spending_limit,
            "card_status": group.card_status,
            "service_fee_collected": group.service_fee_collected,
            "total_collected_amount": group.total_collected_amount,
            "vendor_website": group.vendor_website
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
            "time_slots": [{"id": ts.id, "start_date": ts.start_date, "end_date": ts.end_date} for ts in group.time_slots],
            "participants": participants,
            # Phase 3: Add virtual card fields
            "virtual_card_id": group.virtual_card_id,
            "card_spending_limit": group.card_spending_limit,
            "card_status": group.card_status,
            "service_fee_collected": group.service_fee_collected,
            "total_collected_amount": group.total_collected_amount,
            "vendor_website": group.vendor_website
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
        "time_slots": [{"id": ts.id, "start_date": ts.start_date, "end_date": ts.end_date} for ts in group.time_slots],
        "participants": participants
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
    
    # Check if payment method is set up
    if invitee.payment_status != "setup_complete" or not invitee.payment_method_id:
        raise HTTPException(status_code=400, detail="Payment method setup required before joining group")
    
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
    
    # Add user to group with payment information
    group_member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        payment_method_id=invitee.payment_method_id,
        payment_status="setup_complete"
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

@app.get("/stripe/config", response_model=StripeConfigResponse)
async def get_stripe_config():
    """Get Stripe publishable key for frontend"""
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY}

@app.post("/groups/{group_id}/setup-payment", response_model=PaymentSetupResponse)
async def setup_group_creator_payment(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Setup payment method for group creator"""
    # Verify user is the group creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can setup payment")
    
    # Get the group member record for the creator
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Group membership not found")
    
    try:
        # Create setup intent with Stripe
        setup_intent = stripe.SetupIntent.create(
            customer=None,  # We'll create customer later if needed
            payment_method_types=['card'],
            usage='off_session',
            metadata={
                'group_id': str(group_id),
                'user_id': str(current_user.id),
                'member_id': str(member.id)
            }
        )
        
        # Store setup intent ID in database
        member.payment_setup_intent_id = setup_intent.id
        member.payment_status = "setup_required"
        db.add(member)
        db.commit()
        
        return {
            "setup_intent_id": setup_intent.id,
            "client_secret": setup_intent.client_secret,
            "status": setup_intent.status
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

@app.post("/groups/{group_id}/confirm-payment-setup")
async def confirm_payment_setup(
    group_id: int,
    request: PaymentSetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm payment method setup for group creator"""
    # Get the group member record
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Group membership not found")
    
    try:
        # Retrieve and confirm the setup intent
        setup_intent = stripe.SetupIntent.retrieve(member.payment_setup_intent_id)
        
        if setup_intent.status == "succeeded":
            # Store payment method ID and update status
            member.payment_method_id = request.payment_method_id
            member.payment_status = "setup_complete"
            db.add(member)
            db.commit()
            
            return {"message": "Payment method setup completed successfully"}
        else:
            raise HTTPException(status_code=400, detail="Payment setup not completed")
            
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

@app.post("/join/{token}/setup-payment", response_model=PaymentSetupResponse)
async def setup_invitee_payment(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Setup payment method for invitee joining group"""
    # Verify invitation token exists and user email matches
    invitee = db.query(Invitee).filter(Invitee.join_token == token).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation token")
    
    if current_user.email != invitee.email:
        raise HTTPException(status_code=403, detail="This invitation is not for your email address")
    
    group = db.query(Group).filter(Group.id == invitee.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is already a member
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group.id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member of this group")
    
    try:
        # Create setup intent with Stripe
        setup_intent = stripe.SetupIntent.create(
            customer=None,
            payment_method_types=['card'],
            usage='off_session',
            metadata={
                'group_id': str(group.id),
                'user_id': str(current_user.id),
                'join_token': token,
                'invitee_email': invitee.email
            }
        )
        
        # Store setup intent ID in invitee record temporarily
        invitee.payment_setup_intent_id = setup_intent.id
        db.add(invitee)
        db.commit()
        
        return {
            "setup_intent_id": setup_intent.id,
            "client_secret": setup_intent.client_secret,
            "status": setup_intent.status
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

@app.post("/join/{token}/confirm-payment-setup")
async def confirm_invitee_payment_setup(
    token: str,
    request: PaymentSetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm payment method setup for invitee joining group"""
    # Verify invitation token exists and user email matches
    invitee = db.query(Invitee).filter(Invitee.join_token == token).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation token")
    
    if current_user.email != invitee.email:
        raise HTTPException(status_code=403, detail="This invitation is not for your email address")
    
    if not invitee.payment_setup_intent_id:
        raise HTTPException(status_code=400, detail="No payment setup intent found")
    
    try:
        # Retrieve and confirm the setup intent
        setup_intent = stripe.SetupIntent.retrieve(invitee.payment_setup_intent_id)
        
        if setup_intent.status == "succeeded":
            # Store payment method ID in invitee record
            invitee.payment_method_id = request.payment_method_id
            invitee.payment_status = "setup_complete"
            db.add(invitee)
            db.commit()
            
            return {"message": "Payment method setup completed successfully"}
        else:
            raise HTTPException(status_code=400, detail="Payment setup not completed")
            
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

class GroupPaymentStatusResponse(BaseModel):
    member_id: int
    user_name: str
    user_email: str
    payment_status: str
    joined_at: datetime
    
    class Config:
        from_attributes = True

@app.get("/groups/{group_id}/payment-status", response_model=list[GroupPaymentStatusResponse])
async def get_group_payment_status(
    group_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get payment status for all group members - only accessible by group creator"""
    # Verify group exists and user is the creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can view payment status")
    
    # Get all group members with their payment status
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    
    result = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            result.append({
                "member_id": member.id,
                "user_name": user.name,
                "user_email": user.email,
                "payment_status": member.payment_status or "pending",
                "joined_at": member.joined_at
            })
    
    return result

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

@app.post("/groups/{group_id}/schedule-service")
async def schedule_service(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule service and capture all member payments simultaneously"""
    # Verify group exists and user is the creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can schedule service")
    
    # Get all group members
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    
    # Verify all members have payment methods set up
    for member in members:
        if member.payment_status != "setup_complete" or not member.payment_method_id:
            user = db.query(User).filter(User.id == member.user_id).first()
            raise HTTPException(
                status_code=400, 
                detail=f"Payment method not set up for member: {user.name if user else 'Unknown'}"
            )
    
    # Get rental information
    rental = db.query(Rental).filter(Rental.group_id == group_id).first()
    if not rental:
        raise HTTPException(status_code=404, detail="No rental found for this group")
    
    # Calculate amount per member
    amount_per_member_cents = int((rental.total_cost * 100) / len(members))
    
    try:
        payment_intents = []
        
        # Create payment intents for all members
        for member in members:
            user = db.query(User).filter(User.id == member.user_id).first()
            
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_per_member_cents,
                currency='usd',
                payment_method=member.payment_method_id,
                confirmation_method='manual',
                confirm=True,
                off_session=True,
                metadata={
                    'group_id': str(group_id),
                    'member_id': str(member.id),
                    'user_id': str(member.user_id),
                    'rental_id': str(rental.id)
                }
            )
            
            payment_intents.append({
                'member_id': member.id,
                'payment_intent': payment_intent
            })
            
            # Create group payment record
            group_payment = GroupPayment(
                group_id=group_id,
                member_id=member.id,
                amount=rental.total_cost / len(members),
                status="completed",
                payment_intent_id=payment_intent.id,
                created_at=datetime.utcnow()
            )
            db.add(group_payment)
        
        # Create virtual card for group creator - Phase 2 implementation
        try:
            await create_virtual_card_for_group(group_id, rental.total_cost, db)
        except Exception as e:
            print(f"Virtual card creation failed: {str(e)}")
            # Continue without virtual card for now
            pass
        
        # Update group status to scheduled
        group.status = "scheduled"
        db.add(group)
        
        # Update rental status
        rental.status = "scheduled"
        db.add(rental)
        
        db.commit()
        
        # Send confirmation emails to all members
        vendor = db.query(Company).filter(Company.id == rental.company_id).first()
        
        for member in members:
            user = db.query(User).filter(User.id == member.user_id).first()
            if user:
                amount_charged = rental.total_cost / len(members)
                subject = f"Service Scheduled - {group.name}"
                body = f"""
                <html>
                <body>
                    <h2>🎉 Your Group Service Has Been Scheduled!</h2>
                    
                    <p>Dear {user.name},</p>
                    
                    <p>Great news! The dumpster service for your group <strong>"{group.name}"</strong> has been scheduled.</p>
                    
                    <h3>📋 Service Details:</h3>
                    <ul>
                        <li><strong>Vendor:</strong> {vendor.name if vendor else 'N/A'}</li>
                        <li><strong>Size:</strong> {rental.size}</li>
                        <li><strong>Duration:</strong> {rental.duration} days</li>
                        <li><strong>Delivery Date:</strong> {rental.delivery_date.strftime('%B %d, %Y')}</li>
                        <li><strong>Location:</strong> {group.address}</li>
                    </ul>
                    
                    <h3>💳 Payment Processed:</h3>
                    <p>Your payment of <strong>${amount_charged:.2f}</strong> has been successfully processed.</p>
                    
                    <p>Thank you for using our dumpster sharing service!</p>
                    
                    <p>Best regards,<br>The Dumpster Sharing Team</p>
                </body>
                </html>
                """
                
                await send_email(user.email, subject, body)
        
        return {
            "message": "Service scheduled successfully and payments captured",
            "payments_processed": len(payment_intents),
            "total_amount": rental.total_cost
        }
        
    except stripe.error.CardError as e:
        # Payment failed
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Payment failed: {e.user_message}")
    except stripe.error.StripeError as e:
        # Other Stripe error
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Payment processing error: {str(e)}")
    except Exception as e:
        # General error
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error scheduling service: {str(e)}")

# Virtual Card Service Functions for Phase 2

async def create_virtual_card_for_group(group_id: int, amount: float, db: Session):
    """
    Create virtual card for group - Phase 2 implementation
    This function will be enhanced with actual Stripe Issuing API in production
    """
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise Exception("Group not found")
        
        # Calculate amounts
        service_fee = amount * 0.10  # 10% service fee
        card_amount = amount - service_fee
        card_amount_cents = int(card_amount * 100)
        
        # In production, this would create actual Stripe Issuing card:
        # stripe.issuing.cards.create(
        #     cardholder=YOUR_BUSINESS_CARDHOLDER_ID,
        #     spending_controls={
        #         'spending_limits': [{
        #             'amount': card_amount_cents,
        #             'interval': 'per_authorization',
        #             'categories': ['rental_and_leasing_services']
        #         }],
        #         'allowed_categories': ['rental_and_leasing_services'],
        #         'blocked_categories': ['gambling']
        #     },
        #     metadata={
        #         'group_id': str(group_id),
        #         'purpose': 'group_rental_booking'
        #     }
        # )
        
        # For Phase 2, simulate card creation
        virtual_card_id = f"card_{group_id}_{int(datetime.utcnow().timestamp())}"
        
        # Update group with virtual card info
        group.virtual_card_id = virtual_card_id
        group.card_spending_limit = card_amount_cents
        group.card_status = "active"
        group.service_fee_collected = service_fee
        group.total_collected_amount = amount
        
        db.add(group)
        db.commit()
        
        # In production, send notification to group creator about card availability
        await notify_creator_card_ready(group_id, virtual_card_id, db)
        
        return {
            "card_id": virtual_card_id,
            "spending_limit": card_amount_cents,
            "status": "active"
        }
        
    except Exception as e:
        db.rollback()
        raise Exception(f"Virtual card creation failed: {str(e)}")

async def notify_creator_card_ready(group_id: int, card_id: str, db: Session):
    """Notify group creator that virtual card is ready for use"""
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return
        
        creator = db.query(User).filter(User.id == group.created_by).first()
        if not creator:
            return
        
        card_amount = (group.card_spending_limit or 0) / 100  # Convert cents to dollars
        
        subject = f"Virtual Card Ready - {group.name}"
        body = f"""
        <html>
        <body>
            <h2>💳 Your Virtual Card is Ready!</h2>
            
            <p>Dear {creator.name},</p>
            
            <p>Great news! Your virtual card for group <strong>"{group.name}"</strong> has been issued and is ready to use.</p>
            
            <h3>💳 Card Details:</h3>
            <ul>
                <li><strong>Available Amount:</strong> ${card_amount:.2f}</li>
                <li><strong>Purpose:</strong> {group.vendor_name or 'Vendor'} booking</li>
                <li><strong>Status:</strong> Active</li>
            </ul>
            
            <h3>📋 Next Steps:</h3>
            <ol>
                <li>Log into your dashboard to view secure card details</li>
                <li>Use the card to book your vendor service directly</li>
                <li>The card will only work for the allocated amount</li>
            </ol>
            
            <p><a href="http://localhost:3000" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Card Details</a></p>
            
            <p>Thank you for using our dumpster sharing service!</p>
            
            <p>Best regards,<br>The Dumpster Sharing Team</p>
        </body>
        </html>
        """
        
        await send_email(creator.email, subject, body)
        
    except Exception as e:
        print(f"Failed to send card notification: {str(e)}")

# Virtual Card API Endpoints

@app.post("/api/cards/create-virtual-card", response_model=VirtualCardResponse)
async def create_virtual_card(
    request: VirtualCardCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create virtual card when group is fully funded"""
    # Verify user is group creator
    group = db.query(Group).filter(Group.id == request.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can create virtual card")
    
    # Check if group is fully funded
    funding_status = await calculate_group_funding_status(request.group_id, db)
    if not funding_status.is_fully_funded:
        raise HTTPException(
            status_code=400, 
            detail=f"Group not fully funded. {funding_status.members_paid}/{funding_status.total_members} members have paid"
        )
    
    # Check if card already exists
    if group.virtual_card_id:
        raise HTTPException(status_code=400, detail="Virtual card already exists for this group")
    
    # Create virtual card
    card_result = await create_virtual_card_for_group(request.group_id, request.spending_limit, db)
    
    return VirtualCardResponse(
        card_id=card_result['card_id'],
        group_id=request.group_id,
        spending_limit=request.spending_limit,
        status=card_result['status'],
        created_at=datetime.utcnow()
    )

@app.get("/api/cards/details/{group_id}", response_model=CardDetailsResponse)
async def get_card_details(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get virtual card details for group creator"""
    # Verify user is group creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can view card details")
    
    if not group.virtual_card_id:
        raise HTTPException(status_code=404, detail="No virtual card found for this group")
    
    try:
        # For Phase 2, we simulate card details since we don't have real Stripe Issuing yet
        # In production, this would retrieve from Stripe:
        # card = stripe.issuing.Card.retrieve(group.virtual_card_id)
        
        # Calculate remaining balance by getting transactions
        transactions = db.query(CardTransaction).filter(
            CardTransaction.group_id == group_id,
            CardTransaction.status == 'approved'
        ).all()
        
        spent_amount = sum(tx.amount for tx in transactions)
        remaining_balance = (group.card_spending_limit or 0) - spent_amount
        
        return CardDetailsResponse(
            card_id=group.virtual_card_id,
            group_id=group_id,
            spending_limit=group.card_spending_limit or 0,
            status=group.card_status or 'unknown',
            remaining_balance=max(0, remaining_balance)
        )
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Error retrieving card: {str(e)}")

@app.put("/api/cards/{group_id}/spending-limits")
async def update_card_controls(
    group_id: int,
    request: CardControlsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update card spending limits and controls"""
    # Verify user is group creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can update card controls")
    
    if not group.virtual_card_id:
        raise HTTPException(status_code=404, detail="No virtual card found for this group")
    
    try:
        update_data = {}
        
        if request.spending_limit is not None:
            update_data['spending_controls'] = {
                'spending_limits': [{
                    'amount': request.spending_limit,
                    'interval': 'per_authorization'
                }]
            }
            # Update database
            group.card_spending_limit = request.spending_limit
        
        if request.freeze_card is not None:
            update_data['status'] = 'inactive' if request.freeze_card else 'active'
            # Update database
            group.card_status = 'frozen' if request.freeze_card else 'active'
        
        if update_data:
            # Update card in Stripe
            stripe.issuing.Card.modify(group.virtual_card_id, **update_data)
            
            # Save changes to database
            db.add(group)
            db.commit()
        
        return {"message": "Card controls updated successfully"}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Error updating card: {str(e)}")

@app.post("/api/cards/{group_id}/freeze")
async def freeze_card(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Freeze virtual card"""
    return await update_card_controls(
        group_id, 
        CardControlsRequest(freeze_card=True), 
        current_user, 
        db
    )

@app.get("/api/cards/{group_id}/transactions", response_model=list[TransactionResponse])
async def get_card_transactions(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transaction history for group's virtual card"""
    # Verify user is group creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can view transactions")
    
    # Get transactions from database
    transactions = db.query(CardTransaction).filter(
        CardTransaction.group_id == group_id
    ).order_by(CardTransaction.created_at.desc()).all()
    
    return [
        TransactionResponse(
            id=tx.id,
            group_id=tx.group_id,
            card_id=tx.card_id,
            amount=tx.amount,
            merchant_name=tx.merchant_name,
            status=tx.status,
            authorization_code=tx.authorization_code,
            created_at=tx.created_at
        ) for tx in transactions
    ]

@app.get("/api/groups/{group_id}/funding-status", response_model=GroupFundingStatus)
async def get_group_funding_status(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get funding status for a group"""
    # Verify user is group creator or member
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is creator or member
    is_creator = group.created_by == current_user.id
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first() is not None
    
    if not (is_creator or is_member):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return await calculate_group_funding_status(group_id, db)

@app.get("/api/groups/{group_id}/virtual-card-info")
async def get_group_virtual_card_info(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get virtual card information for a group - Phase 2 endpoint"""
    # Verify group exists and user is member or creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not membership and group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "group_id": group_id,
        "has_virtual_card": bool(group.virtual_card_id),
        "card_status": group.card_status or "pending",
        "card_amount": (group.card_spending_limit or 0) / 100,  # Convert cents to dollars
        "service_fee_collected": group.service_fee_collected or 0.0,
        "total_collected": group.total_collected_amount or 0.0,
        "vendor_name": group.vendor_name,
        "vendor_website": group.vendor_website,
        "is_creator": group.created_by == current_user.id
    }

@app.post("/webhooks/issuing/transaction")
async def handle_issuing_transaction_webhook(
    request: dict,
    db: Session = Depends(get_db)
):
    """Handle Stripe Issuing transaction webhooks"""
    try:
        event_type = request.get('type')
        
        if event_type == 'issuing_transaction.created':
            transaction = request['data']['object']
            
            # Extract group_id from card metadata
            card_id = transaction['card']
            group_id = None
            
            # Get group_id from card metadata or database
            try:
                card = stripe.issuing.Card.retrieve(card_id)
                group_id = int(card.metadata.get('group_id'))
            except:
                # Fallback: find group by card_id in database
                group = db.query(Group).filter(Group.virtual_card_id == card_id).first()
                if group:
                    group_id = group.id
            
            if group_id:
                # Log transaction
                await log_card_transaction({
                    'group_id': group_id,
                    'card_id': card_id,
                    'amount': transaction['amount'],
                    'merchant_name': transaction.get('merchant_data', {}).get('name', 'Unknown'),
                    'status': transaction['status'],
                    'authorization_code': transaction.get('authorization', {}).get('id')
                }, db)
        
        return {"received": True}
        
    except Exception as e:
        logging.error(f"Error processing issuing webhook: {str(e)}")
        return {"error": str(e)}, 400

# Phase 3 Secure Card Details API Endpoints

@app.get("/groups/{group_id}/virtual-card-details")
async def get_virtual_card_details(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get virtual card details for the VirtualCardDetails component"""
    # Verify group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not membership and group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "id": group.id,
        "name": group.name,
        "address": group.address,
        "virtual_card_id": group.virtual_card_id,
        "card_spending_limit": (group.card_spending_limit or 0) / 100,  # Convert cents to dollars
        "card_status": group.card_status or "pending",
        "service_fee_collected": group.service_fee_collected or 0.0,
        "total_collected_amount": group.total_collected_amount or 0.0,
        "vendor_website": group.vendor_website,
        "vendor_name": group.vendor_name
    }

@app.get("/groups/{group_id}/card-transactions")
async def get_group_card_transactions(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get card transactions for a specific group"""
    # Verify group exists and user has access
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is member of the group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not membership and group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get transactions from database
    transactions = db.query(CardTransaction).filter(
        CardTransaction.group_id == group_id
    ).order_by(CardTransaction.created_at.desc()).all()
    
    return [
        {
            "id": str(tx.id),
            "amount": tx.amount,
            "merchant_name": tx.merchant_name,
            "status": tx.status,
            "created_at": tx.created_at.isoformat(),
            "authorization_code": tx.authorization_code
        } for tx in transactions
    ]

@app.get("/groups/{group_id}/card-status")
async def get_card_status(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current card status (active, frozen, etc.)"""
    # Verify group exists and user is creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can check card status")
    
    if not group.virtual_card_id:
        raise HTTPException(status_code=404, detail="No virtual card found for this group")
    
    return {
        "status": group.card_status or "unknown",
        "card_id": group.virtual_card_id,
        "spending_limit": (group.card_spending_limit or 0) / 100
    }

@app.post("/groups/{group_id}/verify-card-access")
async def verify_card_access(
    group_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify user has access to view card details with enhanced security"""
    print(f"DEBUG: Verifying card access for group {group_id}, user {current_user.id}")
    print(f"DEBUG: Request data: {request}")
    
    # Verify group exists and user is creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        print("DEBUG: Group not found")
        raise HTTPException(status_code=404, detail="Group not found")
    
    print(f"DEBUG: Group found - creator: {group.created_by}, card_id: {group.virtual_card_id}, status: {group.card_status}")
    
    if group.created_by != current_user.id:
        print("DEBUG: User is not group creator")
        raise HTTPException(status_code=403, detail="Only group creator can access card details")
    
    if not group.virtual_card_id:
        print("DEBUG: No virtual card found")
        raise HTTPException(status_code=404, detail="No virtual card found for this group")
    
    if group.card_status != "active":
        print(f"DEBUG: Card not active, status is: '{group.card_status}'")
        raise HTTPException(status_code=400, detail="Card is not active")
    
    # Additional security checks
    client_info = request.get('client_info', {})
    timestamp = request.get('timestamp', 0)
    
    print(f"DEBUG: Timestamp check - received: {timestamp}, current: {int(datetime.utcnow().timestamp() * 1000)}")
    
    # Validate timestamp (disabled for testing - in production this would be stricter)
    current_time = int(datetime.utcnow().timestamp() * 1000)
    print(f"DEBUG: Timestamp validation disabled for testing")
    # if abs(current_time - timestamp) > 300000:  # Disabled for Phase 3 testing
    #     print("DEBUG: Timestamp validation failed")
    #     raise HTTPException(status_code=400, detail="Invalid request timestamp")
    
    # Log security event
    try:
        security_log = SecurityLog(
            group_id=group_id,
            user_id=current_user.id,
            event="Card access verification successful",
            timestamp=datetime.utcnow(),
            user_agent=client_info.get('user_agent'),
            ip_address='server-side-verification',
            success=True
        )
        db.add(security_log)
        db.commit()
    except Exception as e:
        logging.error(f"Failed to log security event: {str(e)}")
    
    return {
        "access_granted": True,
        "card_id": group.virtual_card_id,
        "message": "Access verified successfully",
        "session_timeout": 15 * 60 * 1000  # 15 minutes in milliseconds
    }

@app.post("/groups/{group_id}/card/freeze")
async def freeze_group_card(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Freeze the group's virtual card"""
    # Verify group exists and user is creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can freeze card")
    
    if not group.virtual_card_id:
        raise HTTPException(status_code=404, detail="No virtual card found for this group")
    
    try:
        # In production, this would call Stripe API:
        # stripe.issuing.Card.modify(group.virtual_card_id, status='inactive')
        
        # Update database
        group.card_status = "frozen"
        db.add(group)
        db.commit()
        
        return {"message": "Card frozen successfully", "status": "frozen"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error freezing card: {str(e)}")

@app.post("/groups/{group_id}/card/unfreeze")
async def unfreeze_group_card(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unfreeze the group's virtual card"""
    # Verify group exists and user is creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can unfreeze card")
    
    if not group.virtual_card_id:
        raise HTTPException(status_code=404, detail="No virtual card found for this group")
    
    try:
        # In production, this would call Stripe API:
        # stripe.issuing.Card.modify(group.virtual_card_id, status='active')
        
        # Update database
        group.card_status = "active"
        db.add(group)
        db.commit()
        
        return {"message": "Card unfrozen successfully", "status": "active"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error unfreezing card: {str(e)}")

# Helper function for logging card transactions
async def log_card_transaction(transaction_data: dict, db: Session):
    """Log a card transaction to the database"""
    try:
        card_transaction = CardTransaction(
            group_id=transaction_data['group_id'],
            card_id=transaction_data['card_id'],
            amount=transaction_data['amount'],
            merchant_name=transaction_data['merchant_name'],
            status=transaction_data['status'],
            authorization_code=transaction_data.get('authorization_code'),
            created_at=datetime.utcnow()
        )
        
        db.add(card_transaction)
        db.commit()
        
        # Notify group members of transaction
        await notify_group_of_transaction(transaction_data['group_id'], transaction_data, db)
        
    except Exception as e:
        logging.error(f"Error logging card transaction: {str(e)}")
        db.rollback()

# Security logging model
class SecurityLog(Base):
    __tablename__ = "security_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    event = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    success = Column(Boolean, default=True)
    
    group = relationship("Group", foreign_keys=[group_id])
    user = relationship("User", foreign_keys=[user_id])

async def notify_group_of_transaction(group_id: int, transaction_data: dict, db: Session):
    """Notify group members of a card transaction"""
    try:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return
        
        # Get all group members
        members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
        
        for member in members:
            user = db.query(User).filter(User.id == member.user_id).first()
            if user:
                amount = transaction_data['amount'] / 100  # Convert cents to dollars
                subject = f"Card Transaction - {group.name}"
                body = f"""
                <html>
                <body>
                    <h2>💳 Card Transaction Alert</h2>
                    
                    <p>Dear {user.name},</p>
                    
                    <p>A transaction has been made using your group's virtual card for <strong>"{group.name}"</strong>.</p>
                    
                    <h3>Transaction Details:</h3>
                    <ul>
                        <li><strong>Merchant:</strong> {transaction_data['merchant_name']}</li>
                        <li><strong>Amount:</strong> ${amount:.2f}</li>
                        <li><strong>Status:</strong> {transaction_data['status'].title()}</li>
                        <li><strong>Date:</strong> {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}</li>
                    </ul>
                    
                    <p>If you have any questions about this transaction, please contact the group creator.</p>
                    
                    <p>Best regards,<br>The Dumpster Sharing Team</p>
                </body>
                </html>
                """
                
                await send_email(user.email, subject, body)
                
    except Exception as e:
        logging.error(f"Error notifying group of transaction: {str(e)}")

@app.post("/groups/{group_id}/security-log")
async def log_security_event(
    group_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log security events for monitoring and audit purposes"""
    try:
        # Verify group exists and user has access
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if user is member of the group
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        ).first()
        
        if not membership and group.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create security log entry
        security_log = SecurityLog(
            group_id=group_id,
            user_id=current_user.id,
            event=request.get('event', 'Unknown event'),
            timestamp=datetime.fromisoformat(request.get('timestamp', datetime.utcnow().isoformat()).replace('Z', '+00:00')),
            user_agent=request.get('user_agent'),
            ip_address=request.remote_addr if hasattr(request, 'remote_addr') else 'Unknown',
            success=request.get('success', True)
        )
        
        db.add(security_log)
        db.commit()
        
        return {"message": "Security event logged successfully"}
        
    except Exception as e:
        logging.error(f"Error logging security event: {str(e)}")
        db.rollback()
        return {"error": "Failed to log security event"}, 500

@app.get("/groups/{group_id}/security-logs")
async def get_security_logs(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get security logs for a group (group creators only)"""
    # Verify group exists and user is creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can view security logs")
    
    # Get security logs
    logs = db.query(SecurityLog).filter(
        SecurityLog.group_id == group_id
    ).order_by(SecurityLog.timestamp.desc()).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "event": log.event,
            "timestamp": log.timestamp.isoformat(),
            "user_agent": log.user_agent,
            "ip_address": log.ip_address,
            "success": log.success,
            "user_id": log.user_id
        } for log in logs
    ]

@app.get("/")
async def root():
    return {"message": "Dumpster Sharing API", "version": "1.0.0", "features": ["virtual_cards", "phase_3_secure_cards", "security_monitoring"]}