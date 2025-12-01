from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, UserUpdateRequest, Token
from app.auth import get_current_user, get_password_hash, verify_password, create_access_token
from app.utils import geocode_address
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=UserResponse)
@limiter.limit("3/hour")  # Limit registration to 3 per hour per IP
async def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(func.lower(User.email) == func.lower(user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Geocode the user's address
    coordinates = await geocode_address(user.address, user.city, user.state, user.zip_code)

    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        name=user.name,
        phone=user.phone,
        address=user.address,
        city=user.city,
        state=user.state,
        zip_code=user.zip_code,
        latitude=coordinates[0] if coordinates else None,
        longitude=coordinates[1] if coordinates else None,
        geocoded_at=func.now() if coordinates else None,
        hashed_password=hashed_password,
        user_type=user.user_type
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/token", response_model=Token)
@limiter.limit("5/minute")  # Limit login attempts to 5 per minute per IP
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == func.lower(form_data.username)).first()
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


@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/users/me", response_model=UserResponse)
async def update_user(user_update: UserUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Geocode the user's address if location data changed
    coordinates = await geocode_address(user_update.address, user_update.city, user_update.state, user_update.zip_code)

    # Update user fields
    current_user.name = user_update.name
    current_user.phone = user_update.phone
    current_user.address = user_update.address
    current_user.city = user_update.city
    current_user.state = user_update.state
    current_user.zip_code = user_update.zip_code
    current_user.latitude = coordinates[0] if coordinates else None
    current_user.longitude = coordinates[1] if coordinates else None
    current_user.geocoded_at = func.now() if coordinates else None

    db.commit()
    db.refresh(current_user)

    return current_user
