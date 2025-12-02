from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Group, GroupMember, Company, Rental
from app.schemas import RentalCreate, RentalResponse
from app.auth import get_current_user

router = APIRouter()


@router.post("", response_model=RentalResponse)
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


@router.get("", response_model=list[RentalResponse])
async def get_rentals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_groups = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [member.group_id for member in user_groups]
    rentals = db.query(Rental).filter(Rental.group_id.in_(group_ids)).all()
    return rentals
