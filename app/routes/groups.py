from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
import secrets
from jose import jwt

from app.database import get_db
from app.models import (
    User, Group, GroupMember, DropoffDate, Invitee,
    UserDropoffDateSelection, Rental, PaymentRequest, Company
)
from app.schemas import (
    GroupCreate, GroupResponse, JoinGroupRequest, InviteeCreate,
    UserDropoffDateSelectionResponse, UpdateDropoffDateSelectionsRequest,
    SetFinalDropoffDateRequest, DropoffDateAnalysis,
    ServiceDetailsResponse, MemberPaymentResponse
)
from app.auth import get_current_user
from app.utils import (
    send_email, generate_join_token, send_invitations,
    send_invitations_to_specific_invitees
)
from app.config import SECRET_KEY, ALGORITHM, BASE_URL

router = APIRouter()


@router.post("", response_model=GroupResponse)
async def create_group(group: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a group with optional payment method details and rental info"""
    try:
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
        if group.dropoff_dates:
            for dropoff_date_data in group.dropoff_dates:
                dropoff_date = DropoffDate(
                    group_id=db_group.id,
                    date=dropoff_date_data.date
                )
                db.add(dropoff_date)
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
        if group.dropoff_dates:
            # Get the created time slots
            created_dropoff_dates = db.query(DropoffDate).filter(DropoffDate.group_id == db_group.id).all()

            # Create time slot selections for the creator for all time slots
            for dropoff_date in created_dropoff_dates:
                # Check if selection already exists
                existing_selection = db.query(UserDropoffDateSelection).filter(
                    UserDropoffDateSelection.group_member_id == group_member.id,
                    UserDropoffDateSelection.dropoff_date_id == dropoff_date.id
                ).first()

                if not existing_selection:
                    dropoff_date_selection = UserDropoffDateSelection(
                        group_member_id=group_member.id,
                        dropoff_date_id=dropoff_date.id
                    )
                    db.add(dropoff_date_selection)

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

            # Send invitations after all invitees are created
            await send_invitations(db_group, current_user, db)

        # Refresh to get updated relationships
        db.refresh(db_group)

        # Build response with participants and invitees
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

        # Get invitees for this group
        invitees = []
        for invitee in db_group.invitees:
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
            "final_dropoff_date_id": db_group.final_dropoff_date_id,
            "dropoff_dates": [{"id": ts.id, "date": ts.date} for ts in db.query(DropoffDate).filter(DropoffDate.group_id == db_group.id).all()],
            "participants": participants,
            "invitees": invitees
        }
        return group_dict
    except Exception as e:
        # Rollback any database changes if anything fails
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Group creation failed: {str(e)}")


@router.get("", response_model=list[GroupResponse])
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
            "final_dropoff_date_id": group.final_dropoff_date_id,
            "dropoff_dates": [{"id": ts.id, "date": ts.date} for ts in db.query(DropoffDate).filter(DropoffDate.group_id == group.id).all()],
            "participants": participants,
            "invitees": invitees
        }
        response_groups.append(group_dict)

    return response_groups


@router.get("/invited", response_model=list[GroupResponse])
async def get_invited_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get groups where the current user's email matches an invitee email
    invitees = db.query(Invitee).filter(func.lower(Invitee.email) == func.lower(current_user.email)).all()
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
            "final_dropoff_date_id": group.final_dropoff_date_id,
            "dropoff_dates": [{"id": ts.id, "date": ts.date} for ts in db.query(DropoffDate).filter(DropoffDate.group_id == group.id).all()],
            "participants": participants,
            "invitees": invitees
        }
        response_groups.append(group_dict)

    return response_groups


@router.get("/{group_id}", response_model=GroupResponse)
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
        "dropoff_dates": [{"id": ts.id, "date": ts.date} for ts in db.query(DropoffDate).filter(DropoffDate.group_id == group.id).all()],
        "participants": participants,
        "invitees": invitees
    }


@router.post("/{group_id}/join")
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
    group_dropoff_dates = db.query(DropoffDate).filter(DropoffDate.group_id == group_id).all()

    # Validate time slot selection - only required if group has time slots
    if group_dropoff_dates and not join_request.dropoff_date_ids:
        raise HTTPException(status_code=400, detail="You must select at least one available time slot")

    # Verify that all selected time slots belong to this group
    if join_request.dropoff_date_ids:
        group_dropoff_date_ids = [ts.id for ts in group_dropoff_dates]
        for dropoff_date_id in join_request.dropoff_date_ids:
            if dropoff_date_id not in group_dropoff_date_ids:
                raise HTTPException(status_code=400, detail=f"Time slot {dropoff_date_id} does not belong to this group")

    group_member = GroupMember(
        group_id=group_id,
        user_id=current_user.id
    )
    db.add(group_member)
    db.commit()
    db.refresh(group_member)

    # Add user's time slot selections
    for dropoff_date_id in join_request.dropoff_date_ids:
        # Check if selection already exists
        existing_selection = db.query(UserDropoffDateSelection).filter(
            UserDropoffDateSelection.group_member_id == group_member.id,
            UserDropoffDateSelection.dropoff_date_id == dropoff_date_id
        ).first()

        if not existing_selection:
            dropoff_date_selection = UserDropoffDateSelection(
                group_member_id=group_member.id,
                dropoff_date_id=dropoff_date_id
            )
            db.add(dropoff_date_selection)

    db.commit()

    return {"message": "Successfully joined group"}


@router.post("/join/{token}")
async def join_group_by_token(
    token: str,
    join_request: JoinGroupRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Join a group using an invitation token - no authentication required"""
    invitee = db.query(Invitee).filter(Invitee.join_token == token).first()
    if invitee is None:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation token")

    group = db.query(Group).filter(Group.id == invitee.group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if group is full
    member_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
    if member_count >= group.max_participants:
        raise HTTPException(status_code=400, detail="Group is full")

    # Get group time slots
    group_dropoff_dates = db.query(DropoffDate).filter(DropoffDate.group_id == group.id).all()

    # Validate time slot selection - only required if group has time slots
    if group_dropoff_dates and not join_request.dropoff_date_ids:
        raise HTTPException(status_code=400, detail="You must select at least one available time slot")

    # Verify that all selected time slots belong to this group
    if join_request.dropoff_date_ids:
        group_dropoff_date_ids = [ts.id for ts in group_dropoff_dates]
        for dropoff_date_id in join_request.dropoff_date_ids:
            if dropoff_date_id not in group_dropoff_date_ids:
                raise HTTPException(status_code=400, detail=f"Time slot {dropoff_date_id} does not belong to this group")

    # Try to get current user if they're authenticated
    current_user = None
    try:
        # Check if user is authenticated
        authorization = request.headers.get("Authorization")
        if authorization:
            token_str = authorization.split(" ")[1] if " " in authorization else authorization
            payload = jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email:
                current_user = db.query(User).filter(User.email == email).first()
    except:
        # User is not authenticated, continue without user
        pass

    user_to_use = None

    if current_user and current_user.email.lower() == invitee.email.lower():
        # User is authenticated and email matches
        user_to_use = current_user
    else:
        # Create a temporary user account or find existing one
        existing_user = db.query(User).filter(func.lower(User.email) == func.lower(invitee.email)).first()
        if existing_user:
            user_to_use = existing_user
        else:
            # Create new user with minimal info
            user_to_use = User(
                email=invitee.email,
                name=invitee.name,
                hashed_password=secrets.token_hex(32),  # Random password they can reset later
                user_type="renter"  # Default to renter type
            )
            db.add(user_to_use)
            db.commit()
            db.refresh(user_to_use)

    # Check if already a member
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group.id,
        GroupMember.user_id == user_to_use.id
    ).first()

    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member of this group")

    # Add user to group
    group_member = GroupMember(
        group_id=group.id,
        user_id=user_to_use.id
    )
    db.add(group_member)
    db.commit()
    db.refresh(group_member)

    # Add user's time slot selections
    for dropoff_date_id in join_request.dropoff_date_ids:
        # Check if selection already exists
        existing_selection = db.query(UserDropoffDateSelection).filter(
            UserDropoffDateSelection.group_member_id == group_member.id,
            UserDropoffDateSelection.dropoff_date_id == dropoff_date_id
        ).first()

        if not existing_selection:
            dropoff_date_selection = UserDropoffDateSelection(
                group_member_id=group_member.id,
                dropoff_date_id=dropoff_date_id
            )
            db.add(dropoff_date_selection)

    # Remove the invitation token as it's been used
    db.delete(invitee)
    db.commit()

    # Get the updated member count after adding the new member
    updated_member_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()

    # Get group creator for email notifications
    creator = db.query(User).filter(User.id == group.created_by).first()

    # Send email notification to group creator when invitee joins
    if creator:
        subject = f"{user_to_use.name} has joined your group '{group.name}'"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #28a745;">Great news! Someone joined your group</h2>

                    <p>Hi {creator.name},</p>

                    <p><strong>{user_to_use.name}</strong> ({user_to_use.email}) has accepted your invitation and joined <strong>"{group.name}"</strong>!</p>

                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #495057;">Group Status:</h3>
                        <ul style="margin-bottom: 0;">
                            <li><strong>Current members:</strong> {updated_member_count}/{group.max_participants}</li>
                            <li><strong>Status:</strong> {"Fully formed!" if updated_member_count >= group.max_participants else f"Still forming ({group.max_participants - updated_member_count} spots remaining)"}</li>
                        </ul>
                    </div>

                    {"<div style='background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border: 2px solid #28a745;'><p style='margin: 0; color: #155724;'><strong>Your group is now fully formed!</strong> You can proceed with booking your dumpster rental.</p></div>" if updated_member_count >= group.max_participants else ""}

                    <p>Best regards,<br>The Group Dump Team</p>
                </div>
            </body>
        </html>
        """
        await send_email(creator.email, subject, body)

    # If group is now fully formed, send additional notification
    if updated_member_count >= group.max_participants:
        if creator:
            subject = f"Your group '{group.name}' is fully formed!"
            body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #28a745;">Congratulations! Your group is fully formed</h2>

                        <p>Hi {creator.name},</p>

                        <p>Great news! Your dumpster sharing group <strong>"{group.name}"</strong> has reached full capacity with all {group.max_participants} members confirmed.</p>

                        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #28a745;">
                            <h3 style="margin-top: 0; color: #155724;">What's Next?</h3>
                            <ol style="color: #155724; margin-bottom: 0;">
                                <li>Review group details on your groups page</li>
                                <li>Choose a final drop-off date on your groups page based on the availability selected by each group member</li>
                                <li>Book the dumpster rental with your vendor</li>
                                <li>Request payment from all members</li>
                            </ol>
                        </div>

                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Location:</strong> {group.address}</p>
                        </div>

                        <p>You can manage your group and coordinate next steps from your dashboard.</p>

                        <p>Best regards,<br>The Group Dump Team</p>
                    </div>
                </body>
            </html>
            """
            await send_email(creator.email, subject, body)

    return {
        "message": "Successfully joined group",
        "group": {
            "id": group.id,
            "name": group.name,
            "address": group.address
        }
    }


@router.get("/join/{token}/info")
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
    dropoff_dates = db.query(DropoffDate).filter(DropoffDate.group_id == group.id).all()

    # Get other invited group members (excluding the current invitee)
    other_invitees = db.query(Invitee).filter(
        Invitee.group_id == group.id,
        Invitee.id != invitee.id
    ).all()

    # Get rental information to calculate price per person
    rental = db.query(Rental).filter(Rental.group_id == group.id).first()
    price_per_person = None
    if rental and rental.total_cost:
        price_per_person = rental.total_cost / group.max_participants

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
            "dropoff_dates": [{"id": ts.id, "date": ts.date} for ts in dropoff_dates],
            "price_per_person": price_per_person
        },
        "invitee": {
            "name": invitee.name,
            "email": invitee.email
        },
        "other_invitees": [{"name": inv.name, "email": inv.email} for inv in other_invitees]
    }


@router.delete("/{group_id}")
async def delete_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"DEBUG: Attempting to delete group {group_id} by user {current_user.id} ({current_user.email})")

    group = db.query(Group).filter(Group.id == group_id).first()
    if group is None:
        print(f"DEBUG: Group {group_id} not found")
        raise HTTPException(status_code=404, detail="Group not found")

    print(f"DEBUG: Group {group_id} found, created_by: {group.created_by}")

    # Check if the current user is the creator of the group
    if group.created_by != current_user.id:
        print(f"DEBUG: Permission denied - user {current_user.id} is not creator {group.created_by}")
        raise HTTPException(status_code=403, detail="Only the group creator can delete this group")

    # Delete related data first (due to foreign key constraints)

    # First delete user dropoff date selections (references group_members)
    group_members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    for member in group_members:
        db.query(UserDropoffDateSelection).filter(UserDropoffDateSelection.group_member_id == member.id).delete()

    # Delete payment requests (references both group_id and group_members)
    db.query(PaymentRequest).filter(PaymentRequest.group_id == group_id).delete()

    # Now we can delete group members
    db.query(GroupMember).filter(GroupMember.group_id == group_id).delete()

    # Clear final_dropoff_date_id reference to avoid circular dependency
    group.final_dropoff_date_id = None
    db.commit()

    # Delete time slots
    db.query(DropoffDate).filter(DropoffDate.group_id == group_id).delete()

    # Delete invitees
    db.query(Invitee).filter(Invitee.group_id == group_id).delete()

    # Delete rentals
    db.query(Rental).filter(Rental.group_id == group_id).delete()

    # Finally delete the group
    try:
        db.delete(group)
        db.commit()
        print(f"DEBUG: Successfully deleted group {group_id}")
        return {"message": "Group deleted successfully"}
    except Exception as e:
        print(f"DEBUG: Error during deletion: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting group: {str(e)}")


@router.get("/{group_id}/members")
async def get_group_members(group_id: int, db: Session = Depends(get_db)):
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [{"user_id": member.user_id, "joined_at": member.joined_at} for member in members]


@router.post("/{group_id}/add-invitees")
async def add_invitees_to_group(group_id: int, invitees_data: List[InviteeCreate], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add new invitees to an existing group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if current user is the group creator
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creators can add invitees")

    # Create new invitees
    new_invitees = []
    for invitee_data in invitees_data:
        if invitee_data.name and invitee_data.email:
            # Check if email is already invited to this group
            existing_invitee = db.query(Invitee).filter(
                Invitee.group_id == group_id,
                func.lower(Invitee.email) == func.lower(invitee_data.email)
            ).first()

            if not existing_invitee:
                invitee = Invitee(
                    group_id=group_id,
                    name=invitee_data.name,
                    email=invitee_data.email,
                    phone=invitee_data.phone,
                    join_token=generate_join_token()
                )
                db.add(invitee)
                new_invitees.append(invitee)

    db.commit()

    # Send invitations to new invitees only
    if new_invitees:
        await send_invitations_to_specific_invitees(group, current_user, new_invitees, db)

    return {"message": f"Added {len(new_invitees)} new invitees and sent invitations"}


@router.get("/{group_id}/user-time-slots", response_model=List[UserDropoffDateSelectionResponse])
async def get_user_dropoff_date_selections(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's time slot selections for a specific group"""
    # Check if user is a member of the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    # Get user's time slot selections
    selections = db.query(UserDropoffDateSelection).filter(
        UserDropoffDateSelection.group_member_id == member.id
    ).all()

    result = []
    for selection in selections:
        dropoff_date = db.query(DropoffDate).filter(
            DropoffDate.id == selection.dropoff_date_id,
            DropoffDate.group_id == group_id
        ).first()
        if dropoff_date:
            result.append({
                "dropoff_date_id": dropoff_date.id,
                "date": dropoff_date.date
            })

    return result


@router.put("/{group_id}/user-time-slots")
async def update_user_dropoff_date_selections(
    group_id: int,
    request: UpdateDropoffDateSelectionsRequest,
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
    group_dropoff_dates = db.query(DropoffDate).filter(DropoffDate.group_id == group_id).all()

    # Validate that time slots exist and belong to this group if any are provided
    if request.dropoff_date_ids:
        group_dropoff_date_ids = [ts.id for ts in group_dropoff_dates]
        for dropoff_date_id in request.dropoff_date_ids:
            if dropoff_date_id not in group_dropoff_date_ids:
                raise HTTPException(status_code=400, detail=f"Time slot {dropoff_date_id} does not belong to this group")

    # Validate that at least one time slot is selected if group has time slots
    if group_dropoff_dates and not request.dropoff_date_ids:
        raise HTTPException(status_code=400, detail="You must select at least one available time slot")

    # Remove existing selections
    db.query(UserDropoffDateSelection).filter(
        UserDropoffDateSelection.group_member_id == member.id
    ).delete()

    # Add new selections
    for dropoff_date_id in request.dropoff_date_ids:
        # Double-check: Ensure this dropoff_date actually belongs to the same group as the member
        dropoff_date = db.query(DropoffDate).filter(DropoffDate.id == dropoff_date_id).first()
        if not dropoff_date or dropoff_date.group_id != group_id:
            raise HTTPException(status_code=400, detail=f"Data integrity error: dropoff_date {dropoff_date_id} does not belong to group {group_id}")

        dropoff_date_selection = UserDropoffDateSelection(
            group_member_id=member.id,
            dropoff_date_id=dropoff_date_id
        )
        db.add(dropoff_date_selection)

    db.commit()

    return {"message": "Time slot selections updated successfully"}


@router.post("/{group_id}/set-final-dropoff-date")
async def set_final_dropoff_date(
    group_id: int,
    request: SetFinalDropoffDateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set the final dropoff date for a group - only accessible by group creator"""
    # Verify group exists and user is the creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only group creator can set final dropoff date")

    # Verify the dropoff date belongs to this group
    dropoff_date = db.query(DropoffDate).filter(
        DropoffDate.id == request.final_dropoff_date_id,
        DropoffDate.group_id == group_id
    ).first()

    if not dropoff_date:
        raise HTTPException(status_code=400, detail="Invalid dropoff date for this group")

    # Update the group with the final dropoff date
    group.final_dropoff_date_id = request.final_dropoff_date_id
    db.commit()

    return {"message": "Final dropoff date set successfully", "final_dropoff_date": dropoff_date.date}


@router.get("/{group_id}/time-slot-analysis", response_model=List[DropoffDateAnalysis])
async def get_dropoff_date_analysis(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get analysis of time slot selections for all group members"""
    # Check if user is a member of the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    # Get all time slots for the group
    dropoff_dates = db.query(DropoffDate).filter(DropoffDate.group_id == group_id).all()

    # Get all group members
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    total_members = len(members)

    result = []
    for dropoff_date in dropoff_dates:
        # Get all selections for this time slot from members of this group only
        selections = db.query(UserDropoffDateSelection).join(
            GroupMember, UserDropoffDateSelection.group_member_id == GroupMember.id
        ).filter(
            UserDropoffDateSelection.dropoff_date_id == dropoff_date.id,
            GroupMember.group_id == group_id
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

        is_universal = len(selected_users) == total_members and total_members > 0

        result.append({
            "dropoff_date_id": dropoff_date.id,
            "date": dropoff_date.date,
            "selected_by_count": len(selected_users),
            "selected_by_users": selected_users,
            "is_universal": is_universal
        })

    return result


@router.get("/{group_id}/service-details", response_model=ServiceDetailsResponse)
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


@router.get("/{group_id}/payment-breakdown", response_model=list[MemberPaymentResponse])
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
            # Check if there's a payment request for this member and its status
            payment_request = db.query(PaymentRequest).filter(
                PaymentRequest.group_id == group_id,
                PaymentRequest.to_member_id == member.id
            ).first()

            payment_status = "pending"
            if payment_request:
                payment_status = payment_request.status
            elif member.user_id == group.created_by:
                # Group creator doesn't need to pay themselves
                payment_status = "creator"

            result.append({
                "member_id": member.id,
                "user_name": user.name,
                "user_email": user.email,
                "amount": cost_per_member,
                "payment_status": payment_status
            })

    return result


@router.post("/{group_id}/complete-group")
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
                <h2>Your Group is Complete!</h2>

                <p>Dear {user.name},</p>

                <p>Great news! Your dumpster sharing group <strong>"{group.name}"</strong> is now complete and the service has been arranged.</p>

                <h3>Service Details:</h3>
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
