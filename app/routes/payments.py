from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

from app.database import get_db
from app.models import User, Group, GroupMember, PaymentRequest, Rental, DropoffDate
from app.schemas import (
    PaymentMethodSetupRequest, PaymentRequestCreate,
    PaymentRequestResponse
)
from app.auth import get_current_user
from app.utils import send_email

router = APIRouter()


@router.post("/groups/{group_id}/setup-payment-method")
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


@router.post("/groups/{group_id}/generate-payment-requests")
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

    # Get final dropoff date if set
    final_dropoff_date = None
    if group.final_dropoff_date_id:
        final_dropoff_date = db.query(DropoffDate).filter(DropoffDate.id == group.final_dropoff_date_id).first()

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

    cost_per_member = request.total_cost / (len(members) + 1)  # +1 for creator

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

            # Build dropoff date line if available
            dropoff_date_line = ""
            if final_dropoff_date:
                dropoff_date_line = f"<li><strong>Scheduled Drop-off Date:</strong> {final_dropoff_date.date}</li>"

            body = f"""
            <html>
                <body>
                    <h2>Payment Request from {current_user.name}</h2>

                    <p>Hi {user.name},</p>

                    <p>You have a payment request for your share of the dumpster rental in group <strong>"{group.name}"</strong>.</p>

                    <h3>Payment Details:</h3>
                    <ul>
                        <li><strong>Amount:</strong> ${cost_per_member:.2f}</li>
                        <li><strong>For:</strong> {request.description}</li>
                        <li><strong>Pay via:</strong> {payment_info}</li>
                        {dropoff_date_line}
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


@router.get("/groups/{group_id}/payment-requests", response_model=list[PaymentRequestResponse])
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


@router.post("/groups/{group_id}/payment-requests/{request_id}/mark-paid")
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


@router.post("/groups/{group_id}/payment-requests/bulk-mark-paid")
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
