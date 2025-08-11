#!/usr/bin/env python3
"""
Migration script to add user_type column to existing users
and set all existing users to 'renter' type
"""

from sqlalchemy import create_engine, Column, String, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dumpster_sharing.db")

def migrate_user_type():
    """Add user_type column to users table and set existing users to 'renter'"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if user_type column already exists
        try:
            result = conn.execute(text("SELECT user_type FROM users LIMIT 1"))
            print("user_type column already exists")
            return
        except:
            print("user_type column does not exist, adding it...")
        
        # Add the user_type column with default value 'renter'
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN user_type VARCHAR DEFAULT 'renter'"))
            
            # Update all existing users to have 'renter' type
            result = conn.execute(text("UPDATE users SET user_type = 'renter' WHERE user_type IS NULL OR user_type = ''"))
            print(f"Updated {result.rowcount} users to have 'renter' type")
            
            conn.commit()
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Error during migration: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate_user_type()