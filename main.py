"""
GroupDump API - Main Application Entry Point

A platform for neighbors to coordinate and share dumpster rental costs.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.database import Base, engine
from app.routes import auth, groups, companies, rentals, payments, admin
from app.config import CORS_ORIGINS
import app.models  # Explicitly import all models to ensure they're registered with Base

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI application
app = FastAPI(
    title="GroupDump API",
    version="1.0.0",
    description="API for coordinating shared dumpster rentals among neighbors"
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Configured in app/config.py
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(groups.router, prefix="/groups", tags=["Groups"])
app.include_router(companies.router, prefix="/companies", tags=["Companies"])
app.include_router(rentals.router, prefix="/rentals", tags=["Rentals"])
app.include_router(payments.router, prefix="/groups", tags=["Payments"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])


@app.get("/", tags=["Root"])
async def root():
    """API root endpoint - returns version and status"""
    return {
        "name": "GroupDump API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy"}
