#!/usr/bin/env python3
"""
Migration script to add website column to existing companies table.
This ensures that existing databases can be updated to support the website field
without losing existing company data.
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dumpster_sharing.db")

def migrate_website_field():
    """Add website column to companies table if it doesn't exist"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if website column already exists
        try:
            result = conn.execute(text("SELECT website FROM companies LIMIT 1"))
            print("website column already exists in companies table")
            return
        except Exception:
            print("website column does not exist in companies table, adding it...")
        
        # Add the website column (nullable, since existing companies may not have websites)
        try:
            conn.execute(text("ALTER TABLE companies ADD COLUMN website VARCHAR"))
            print("Successfully added website column to companies table")
            
            conn.commit()
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Error during migration: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    print("Starting website field migration...")
    migrate_website_field()
    print("Migration process finished.")