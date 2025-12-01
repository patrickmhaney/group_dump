"""Pydantic schemas for request/response models"""
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    phone: str
    address: str
    city: str
    state: str
    zip_code: str
    password: str
    user_type: str = "renter"


class UserUpdateRequest(BaseModel):
    name: str
    phone: str
    address: str
    city: str
    state: str
    zip_code: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    phone: str
    address: str
    city: str
    state: str
    zip_code: str
    user_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserListItem(BaseModel):
    id: int
    email: str
    name: str
    phone: str
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    user_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# Dropoff Date Schemas
class DropoffDateCreate(BaseModel):
    date: str


class DropoffDateResponse(BaseModel):
    id: int
    date: str

    class Config:
        from_attributes = True


class UserDropoffDateSelectionResponse(BaseModel):
    dropoff_date_id: int
    date: str

    class Config:
        from_attributes = True


class UpdateDropoffDateSelectionsRequest(BaseModel):
    dropoff_date_ids: List[int]


class SetFinalDropoffDateRequest(BaseModel):
    final_dropoff_date_id: int


class DropoffDateAnalysis(BaseModel):
    dropoff_date_id: int
    date: str
    selected_by_count: int
    selected_by_users: List[str]
    is_universal: bool  # True if ALL group members selected this slot


# Invitee Schemas
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


# Payment Schemas
class PaymentMethodSetupRequest(BaseModel):
    preferred_method: str  # "zelle", "venmo", "cash"
    payment_details: str   # JSON string with Zelle email/phone or Venmo username


class PaymentRequestCreate(BaseModel):
    description: str
    preferred_method: str
    payment_details: str
    total_cost: float


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


# Group Schemas
class RentalInfo(BaseModel):
    dumpster_size: str  # JSON string of selected dumpster size


class GroupCreate(BaseModel):
    name: str
    address: str
    max_participants: int = 5
    vendor_id: Optional[int] = None
    dropoff_dates: Optional[List[DropoffDateCreate]] = []
    invitees: Optional[List[InviteeCreate]] = []
    payment_method_details: Optional[PaymentMethodSetupRequest] = None
    rental_info: Optional[RentalInfo] = None


class JoinGroupRequest(BaseModel):
    dropoff_date_ids: List[int]


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
    final_dropoff_date_id: Optional[int] = None
    dropoff_dates: Optional[List[DropoffDateResponse]] = []
    participants: Optional[List[ParticipantResponse]] = []
    invitees: Optional[List[InviteeResponse]] = []

    class Config:
        from_attributes = True


# Company Schemas
class DumpsterSize(BaseModel):
    cubic_yards: str
    dimensions: Optional[str] = None
    starting_price: Optional[str] = None
    starting_tonnage: Optional[str] = None
    per_ton_overage_price: Optional[str] = None
    additional_day_price: Optional[str] = None


class CompanyCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: str
    state: str
    zip_code: str
    website: str
    service_areas: Optional[str] = None
    dumpster_sizes: List[DumpsterSize]
    google_place_id: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: str
    state: str
    zip_code: str
    website: str
    service_areas: Optional[str] = None
    dumpster_sizes: List[DumpsterSize]
    rating: float
    google_place_id: Optional[str] = None
    google_rating: Optional[float] = None
    google_user_ratings_total: Optional[int] = None

    class Config:
        from_attributes = True


class CompanyListItem(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    city: str
    state: str
    zip_code: str
    website: str
    created_at: datetime

    class Config:
        from_attributes = True


# Rental Schemas
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


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


# Admin/Platform Schemas
class PlatformOverviewResponse(BaseModel):
    total_users: int
    renter_users: int
    company_users: int
    total_groups: int
    forming_groups: int
    active_groups: int
    completed_groups: int
    total_revenue: float

    class Config:
        from_attributes = True


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
