"""Application configuration and environment variables"""
import os
from dotenv import load_dotenv
import googlemaps

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dumpster_sharing.db")

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security warning for insecure SECRET_KEY
if SECRET_KEY == "your-secret-key-here":
    import sys
    print("\n" + "="*70, file=sys.stderr)
    print("⚠️  CRITICAL SECURITY WARNING ⚠️", file=sys.stderr)
    print("="*70, file=sys.stderr)
    print("SECRET_KEY is using the default insecure value!", file=sys.stderr)
    print("This makes your application vulnerable to attacks.", file=sys.stderr)
    print("\nTo fix:", file=sys.stderr)
    print("1. Generate a secure key: python -c \"import secrets; print(secrets.token_urlsafe(32))\"", file=sys.stderr)
    print("2. Add it to your .env file: SECRET_KEY=<generated-key>", file=sys.stderr)
    print("="*70 + "\n", file=sys.stderr)

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)

# App configuration
BASE_URL = os.getenv("BASE_URL", "https://groupdump.com")

# CORS Configuration
# For development, allow localhost. For production, only allow your domain
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:2052,https://groupdump.com,https://www.groupdump.com"
).split(",")

# Google Places API configuration
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
gmaps_client = googlemaps.Client(key=GOOGLE_PLACES_API_KEY) if GOOGLE_PLACES_API_KEY else None
