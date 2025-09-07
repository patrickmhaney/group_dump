#!/usr/bin/env python3
"""
Migration script to add geocoding fields and populate lat/long for existing records
"""

import sqlite3
import asyncio
import aiohttp
from datetime import datetime
import time
from typing import Tuple, Optional

async def geocode_address(address: str, city: str, state: str, zip_code: str) -> Optional[Tuple[float, float]]:
    """
    Geocode an address using OpenStreetMap Nominatim API
    Returns (latitude, longitude) tuple or None if geocoding fails
    """
    try:
        # Format address for geocoding
        full_address = f"{address}, {city}, {state} {zip_code}, USA" if address else f"{city}, {state} {zip_code}, USA"
        
        # OpenStreetMap Nominatim API (free, no API key required)
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': full_address,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'us'
        }
        headers = {
            'User-Agent': 'DumpsterSharingApp/1.0'  # Required by Nominatim
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    if data:
                        lat = float(data[0]['lat'])
                        lon = float(data[0]['lon'])
                        return (lat, lon)
        
        return None
        
    except Exception as e:
        print(f"Geocoding error for '{full_address}': {str(e)}")
        return None

async def migrate_database():
    """Add new columns and geocode existing records"""
    
    # Connect to database
    conn = sqlite3.connect('./dumpster_sharing.db')
    cursor = conn.cursor()
    
    try:
        print("🔧 Starting geocoding migration...")
        
        # Add new columns to users table
        print("📍 Adding geocoding columns to users table...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN city TEXT")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
            print("   - city column already exists")
        
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN state TEXT")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
            print("   - state column already exists")
        
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN latitude REAL")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
            print("   - latitude column already exists")
        
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN longitude REAL")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
            print("   - longitude column already exists")
        
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN geocoded_at DATETIME")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
            print("   - geocoded_at column already exists")
        
        # Add new columns to companies table
        print("🏢 Adding geocoding columns to companies table...")
        try:
            cursor.execute("ALTER TABLE companies ADD COLUMN latitude REAL")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
            print("   - latitude column already exists")
        
        try:
            cursor.execute("ALTER TABLE companies ADD COLUMN longitude REAL")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
            print("   - longitude column already exists")
        
        try:
            cursor.execute("ALTER TABLE companies ADD COLUMN geocoded_at DATETIME")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
            print("   - geocoded_at column already exists")
        
        conn.commit()
        
        # Update existing users with city/state data (you may need to customize this based on your data)
        print("👥 Updating existing users with default city/state...")
        
        # Set default city/state for existing users based on zip codes
        # Austin users (78xxx zip codes)
        cursor.execute("""
            UPDATE users 
            SET city = 'Austin', state = 'TX' 
            WHERE zip_code LIKE '78%' AND (city IS NULL OR city = '')
        """)
        
        # Other Texas users (73xxx zip codes)
        cursor.execute("""
            UPDATE users 
            SET city = 'Austin', state = 'TX' 
            WHERE zip_code LIKE '73%' AND (city IS NULL OR city = '')
        """)
        
        conn.commit()
        
        # Geocode existing users
        print("🗺️  Geocoding existing users...")
        cursor.execute("""
            SELECT id, address, city, state, zip_code 
            FROM users 
            WHERE latitude IS NULL AND city IS NOT NULL AND state IS NOT NULL
        """)
        users = cursor.fetchall()
        
        for user in users:
            user_id, address, city, state, zip_code = user
            print(f"   Geocoding user {user_id}: {city}, {state} {zip_code}")
            
            coordinates = await geocode_address(address or "", city, state, zip_code)
            if coordinates:
                lat, lon = coordinates
                cursor.execute("""
                    UPDATE users 
                    SET latitude = ?, longitude = ?, geocoded_at = ? 
                    WHERE id = ?
                """, (lat, lon, datetime.now(), user_id))
                print(f"   ✅ Updated user {user_id} with coordinates: {lat:.4f}, {lon:.4f}")
            else:
                print(f"   ❌ Failed to geocode user {user_id}")
            
            # Rate limiting - be respectful to the API
            time.sleep(1)
        
        # Geocode existing companies
        print("🏢 Geocoding existing companies...")
        cursor.execute("""
            SELECT id, name, address, city, state, zip_code 
            FROM companies 
            WHERE latitude IS NULL
        """)
        companies = cursor.fetchall()
        
        for company in companies:
            company_id, name, address, city, state, zip_code = company
            print(f"   Geocoding company {company_id}: {name} - {city}, {state} {zip_code}")
            
            coordinates = await geocode_address(address or "", city, state, zip_code)
            if coordinates:
                lat, lon = coordinates
                cursor.execute("""
                    UPDATE companies 
                    SET latitude = ?, longitude = ?, geocoded_at = ? 
                    WHERE id = ?
                """, (lat, lon, datetime.now(), company_id))
                print(f"   ✅ Updated company {company_id} with coordinates: {lat:.4f}, {lon:.4f}")
            else:
                print(f"   ❌ Failed to geocode company {company_id}")
            
            # Rate limiting - be respectful to the API
            time.sleep(1)
        
        conn.commit()
        print("🎉 Migration completed successfully!")
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM users WHERE latitude IS NOT NULL")
        geocoded_users = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM companies WHERE latitude IS NOT NULL")
        geocoded_companies = cursor.fetchone()[0]
        
        print(f"📊 Summary:")
        print(f"   - Geocoded users: {geocoded_users}")
        print(f"   - Geocoded companies: {geocoded_companies}")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(migrate_database())