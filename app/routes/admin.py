from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Group, Company, Rental
from app.schemas import PlatformOverviewResponse, UserListItem, CompanyListItem
from app.auth import get_admin_user

router = APIRouter()


@router.get("/platform-overview", response_model=PlatformOverviewResponse)
async def get_platform_overview(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get platform overview metrics - admin only"""

    # Total users by type
    total_users = db.query(User).count()
    renter_users = db.query(User).filter(User.user_type == "renter").count()
    company_users = db.query(User).filter(User.user_type == "company").count()

    # Groups by status
    total_groups = db.query(Group).count()
    forming_groups = db.query(Group).filter(Group.status == "forming").count()
    active_groups = db.query(Group).filter(Group.status == "active").count()
    completed_groups = db.query(Group).filter(Group.status == "completed").count()

    # Total revenue calculation
    # Revenue from commissions on completed rentals
    completed_rentals = db.query(Rental).filter(Rental.status == "completed").all()
    total_revenue = 0.0
    for rental in completed_rentals:
        # Get the company's commission rate
        company = db.query(Company).filter(Company.id == rental.company_id).first()
        if company:
            total_revenue += rental.total_cost * company.commission_rate

    return PlatformOverviewResponse(
        total_users=total_users,
        renter_users=renter_users,
        company_users=company_users,
        total_groups=total_groups,
        forming_groups=forming_groups,
        active_groups=active_groups,
        completed_groups=completed_groups,
        total_revenue=total_revenue
    )


@router.get("/users", response_model=list[UserListItem])
async def get_users_list(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users ordered by state and city - admin only"""
    users = db.query(User).order_by(User.state, User.city, User.name).all()
    return users


@router.get("/companies", response_model=list[CompanyListItem])
async def get_companies_list(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all companies ordered by state and city - admin only"""
    companies = db.query(Company).order_by(Company.state, Company.city, Company.name).all()
    return companies
