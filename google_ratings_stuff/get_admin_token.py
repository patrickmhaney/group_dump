#!/usr/bin/env python3
"""
Script to generate an admin authentication token for API calls.
This token can be used to call protected endpoints like refresh-all-google-ratings.
"""

from jose import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
ALGORITHM = 'HS256'

def create_admin_token(hours=24):
    """Create a JWT token for the admin user"""
    data = {'sub': 'service.account.dc@groupdump.com'}
    expire = datetime.utcnow() + timedelta(hours=hours)
    to_encode = data.copy()
    to_encode.update({'exp': expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token

if __name__ == "__main__":
    token = create_admin_token(24)

    print("=" * 80)
    print("ADMIN TOKEN GENERATED")
    print("=" * 80)
    print(f"\nToken (valid for 24 hours):\n{token}\n")
    print("=" * 80)
    print("\nTo refresh all Google ratings, run:\n")
    print(f'curl -X POST http://localhost:8000/companies/refresh-all-google-ratings \\')
    print(f'  -H "Authorization: Bearer {token}"')
    print("\n" + "=" * 80)
    print("\nOr if your backend is running on port 8000:")
    print(f'curl -X POST http://localhost:8000/companies/refresh-all-google-ratings \\')
    print(f'  -H "Authorization: Bearer {token}"')
    print("\n" + "=" * 80)
