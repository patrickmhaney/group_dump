from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import json

from app.database import get_db
from app.models import Company, User, Rental
from app.schemas import CompanyCreate, CompanyResponse, DumpsterSize
from app.auth import get_current_user
from app.utils import (
    geocode_address, fetch_google_place_rating,
    filter_companies_by_proximity, filter_companies_by_actual_distance
)

router = APIRouter()


@router.post("", response_model=CompanyResponse)
async def create_company(company: CompanyCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Convert dumpster_sizes to JSON string for storage
    dumpster_sizes_json = json.dumps([size.dict() for size in company.dumpster_sizes])

    # Geocode the company's address
    coordinates = await geocode_address(company.address, company.city, company.state, company.zip_code)

    db_company = Company(
        name=company.name,
        email=company.email,
        phone=company.phone,
        address=company.address,
        city=company.city,
        state=company.state,
        zip_code=company.zip_code,
        latitude=coordinates[0] if coordinates else None,
        longitude=coordinates[1] if coordinates else None,
        geocoded_at=datetime.utcnow() if coordinates else None,
        website=company.website,
        service_areas=company.service_areas,
        dumpster_sizes=dumpster_sizes_json,
        google_place_id=company.google_place_id,
        created_by=current_user.id
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)

    # If google_place_id is provided, fetch the rating
    if db_company.google_place_id:
        rating_data = await fetch_google_place_rating(db_company.google_place_id)
        if rating_data:
            db_company.google_rating = rating_data.get('rating')
            db_company.google_user_ratings_total = rating_data.get('user_ratings_total')
            db_company.google_rating_updated_at = datetime.utcnow()
            db.commit()
            db.refresh(db_company)

    # Convert back to response format
    response_data = {
        "id": db_company.id,
        "name": db_company.name,
        "email": db_company.email,
        "phone": db_company.phone,
        "address": db_company.address,
        "city": db_company.city,
        "state": db_company.state,
        "zip_code": db_company.zip_code,
        "website": db_company.website,
        "service_areas": db_company.service_areas,
        "dumpster_sizes": [DumpsterSize(**size) for size in json.loads(db_company.dumpster_sizes)] if db_company.dumpster_sizes else [],
        "rating": db_company.rating,
        "google_place_id": db_company.google_place_id,
        "google_rating": db_company.google_rating,
        "google_user_ratings_total": db_company.google_user_ratings_total
    }
    return CompanyResponse(**response_data)


@router.get("", response_model=list[CompanyResponse])
async def get_companies(current_user: User = Depends(get_current_user), skip: int = 0, limit: int = 100, proximity_filter: bool = True, db: Session = Depends(get_db)):
    if current_user.user_type == "company":
        # Company users can only see their own companies
        companies = db.query(Company).filter(Company.created_by == current_user.id).offset(skip).limit(limit).all()
    else:
        # Rental users can see all companies to select services
        companies = db.query(Company).offset(skip).limit(limit).all()

        # Filter by proximity for rental users using geographic distance if coordinates available
        if proximity_filter:
            if current_user.latitude and current_user.longitude:
                # Use accurate geographic distance with zip code fallback
                companies = await filter_companies_by_actual_distance(companies, current_user.latitude, current_user.longitude, user_zip=current_user.zip_code)
            elif current_user.zip_code:
                # Fallback to zip code approximation
                companies = filter_companies_by_proximity(companies, current_user.zip_code)
    result = []
    for company in companies:
        company_data = {
            "id": company.id,
            "name": company.name,
            "email": company.email,
            "phone": company.phone,
            "address": company.address,
            "city": company.city,
            "state": company.state,
            "zip_code": company.zip_code,
            "website": company.website,
            "service_areas": company.service_areas,
            "dumpster_sizes": [DumpsterSize(**size) for size in json.loads(company.dumpster_sizes)] if company.dumpster_sizes else [],
            "rating": company.rating,
            "google_place_id": company.google_place_id,
            "google_rating": company.google_rating,
            "google_user_ratings_total": company.google_user_ratings_total
        }
        result.append(CompanyResponse(**company_data))
    return result


@router.get("/public/by-zip", response_model=list[CompanyResponse])
async def get_companies_by_zip(zip_code: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Public endpoint to browse companies by zip code without authentication.
    Returns companies within 50 miles of the provided zip code.
    """
    companies = db.query(Company).offset(skip).limit(limit).all()

    # Filter by proximity using zip code
    if zip_code:
        companies = filter_companies_by_proximity(companies, zip_code)

    result = []
    for company in companies:
        company_data = {
            "id": company.id,
            "name": company.name,
            "email": company.email,
            "phone": company.phone,
            "address": company.address,
            "city": company.city,
            "state": company.state,
            "zip_code": company.zip_code,
            "website": company.website,
            "service_areas": company.service_areas,
            "dumpster_sizes": [DumpsterSize(**size) for size in json.loads(company.dumpster_sizes)] if company.dumpster_sizes else [],
            "rating": company.rating,
            "google_place_id": company.google_place_id,
            "google_rating": company.google_rating,
            "google_user_ratings_total": company.google_user_ratings_total
        }
        result.append(CompanyResponse(**company_data))
    return result


@router.get("/{company_id}", response_model=CompanyResponse)
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
        "city": company.city,
        "state": company.state,
        "zip_code": company.zip_code,
        "website": company.website,
        "service_areas": company.service_areas,
        "dumpster_sizes": [DumpsterSize(**size) for size in json.loads(company.dumpster_sizes)] if company.dumpster_sizes else [],
        "rating": company.rating,
        "google_place_id": company.google_place_id,
        "google_rating": company.google_rating,
        "google_user_ratings_total": company.google_user_ratings_total
    }
    return CompanyResponse(**company_data)


@router.post("/{company_id}/refresh-google-rating")
async def refresh_google_rating(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Endpoint to manually refresh Google rating for a single company"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    # Check if user has permission to update this company
    if current_user.user_type == "company" and company.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only refresh ratings for companies you created")

    if not company.google_place_id:
        raise HTTPException(status_code=400, detail="Company does not have a Google Place ID")

    # Fetch fresh rating from Google
    rating_data = await fetch_google_place_rating(company.google_place_id)
    if not rating_data:
        raise HTTPException(status_code=500, detail="Failed to fetch Google rating")

    # Update the company record
    company.google_rating = rating_data.get('rating')
    company.google_user_ratings_total = rating_data.get('user_ratings_total')
    company.google_rating_updated_at = datetime.utcnow()
    db.commit()

    return {
        "message": "Google rating updated successfully",
        "google_rating": company.google_rating,
        "google_user_ratings_total": company.google_user_ratings_total,
        "updated_at": company.google_rating_updated_at
    }


@router.post("/refresh-all-google-ratings")
async def refresh_all_google_ratings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Bulk endpoint to refresh Google ratings for ALL companies that have a google_place_id.
    This should be called manually to populate the database with ratings.
    """
    # Only allow admin users to run bulk operations
    if current_user.email != "service.account.dc@groupdump.com":
        raise HTTPException(status_code=403, detail="Only admins can refresh all ratings")

    # Get all companies with a google_place_id
    companies = db.query(Company).filter(Company.google_place_id.isnot(None)).all()

    if not companies:
        return {"message": "No companies with Google Place IDs found", "updated": 0, "failed": 0}

    results = {
        "total": len(companies),
        "updated": 0,
        "failed": 0,
        "errors": []
    }

    for company in companies:
        try:
            rating_data = await fetch_google_place_rating(company.google_place_id)
            if rating_data:
                company.google_rating = rating_data.get('rating')
                company.google_user_ratings_total = rating_data.get('user_ratings_total')
                company.google_rating_updated_at = datetime.utcnow()
                results["updated"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(f"Company {company.id} ({company.name}): Failed to fetch rating")
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"Company {company.id} ({company.name}): {str(e)}")

    db.commit()

    return results


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: int, company: CompanyCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_company = db.query(Company).filter(Company.id == company_id).first()
    if db_company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    if db_company.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit companies you created")

    # Convert dumpster_sizes to JSON string for storage
    dumpster_sizes_json = json.dumps([size.dict() for size in company.dumpster_sizes])

    # Update company fields
    db_company.name = company.name
    db_company.email = company.email
    db_company.phone = company.phone
    db_company.address = company.address
    db_company.city = company.city
    db_company.state = company.state
    db_company.zip_code = company.zip_code
    db_company.website = company.website
    db_company.service_areas = company.service_areas
    db_company.dumpster_sizes = dumpster_sizes_json

    # Update google_place_id if provided and changed
    if company.google_place_id and company.google_place_id != db_company.google_place_id:
        db_company.google_place_id = company.google_place_id
        # Fetch new rating for the new place ID
        rating_data = await fetch_google_place_rating(company.google_place_id)
        if rating_data:
            db_company.google_rating = rating_data.get('rating')
            db_company.google_user_ratings_total = rating_data.get('user_ratings_total')
            db_company.google_rating_updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_company)

    # Convert back to response format
    response_data = {
        "id": db_company.id,
        "name": db_company.name,
        "email": db_company.email,
        "phone": db_company.phone,
        "address": db_company.address,
        "city": db_company.city,
        "state": db_company.state,
        "zip_code": db_company.zip_code,
        "website": db_company.website,
        "service_areas": db_company.service_areas,
        "dumpster_sizes": [DumpsterSize(**size) for size in json.loads(db_company.dumpster_sizes)] if db_company.dumpster_sizes else [],
        "rating": db_company.rating,
        "google_place_id": db_company.google_place_id,
        "google_rating": db_company.google_rating,
        "google_user_ratings_total": db_company.google_user_ratings_total
    }
    return CompanyResponse(**response_data)


@router.delete("/{company_id}")
async def delete_company(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_company = db.query(Company).filter(Company.id == company_id).first()
    if db_company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    if db_company.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete companies you created")

    # Check if company has active rentals
    active_rentals = db.query(Rental).filter(
        Rental.company_id == company_id,
        Rental.status.in_(["pending", "scheduled"])
    ).count()

    if active_rentals > 0:
        raise HTTPException(status_code=400, detail="Cannot delete company with active rentals")

    # Delete the company
    db.delete(db_company)
    db.commit()

    return {"message": "Company deleted successfully"}
