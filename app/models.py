"""SQLAlchemy database models"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    phone = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geocoded_at = Column(DateTime, nullable=True)
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
    final_dropoff_date_id = Column(Integer, ForeignKey("dropoff_dates.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("GroupMember", back_populates="group")
    rentals = relationship("Rental", back_populates="group")
    dropoff_dates = relationship("DropoffDate", back_populates="group", foreign_keys="DropoffDate.group_id")
    invitees = relationship("Invitee", back_populates="group")
    vendor = relationship("Company", foreign_keys=[vendor_id])
    final_dropoff_date = relationship("DropoffDate", foreign_keys=[final_dropoff_date_id])


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
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String, nullable=False)  # Required field for location-based filtering
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geocoded_at = Column(DateTime, nullable=True)
    website = Column(String, nullable=False)
    service_areas = Column(Text, nullable=True)
    dumpster_sizes = Column(Text)  # JSON string of dumpster sizes
    commission_rate = Column(Float, default=0.08)
    rating = Column(Float, default=0.0)
    google_place_id = Column(String, nullable=True)  # Google Places ID
    google_rating = Column(Float, nullable=True)  # Rating from Google
    google_user_ratings_total = Column(Integer, nullable=True)  # Total number of reviews on Google
    google_rating_updated_at = Column(DateTime, nullable=True)  # Last time rating was fetched
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    rentals = relationship("Rental", back_populates="company")
    creator = relationship("User", foreign_keys=[created_by])


class DropoffDate(Base):
    __tablename__ = "dropoff_dates"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    date = Column(String)

    group = relationship("Group", back_populates="dropoff_dates", foreign_keys=[group_id])


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


class UserDropoffDateSelection(Base):
    __tablename__ = "user_dropoff_date_selections"
    __table_args__ = (UniqueConstraint('dropoff_date_id', 'group_member_id'),)

    id = Column(Integer, primary_key=True, index=True)
    group_member_id = Column(Integer, ForeignKey("group_members.id", ondelete="CASCADE"))
    dropoff_date_id = Column(Integer, ForeignKey("dropoff_dates.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)

    member = relationship("GroupMember", foreign_keys=[group_member_id])
    dropoff_date = relationship("DropoffDate", foreign_keys=[dropoff_date_id])


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
