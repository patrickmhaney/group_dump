#!/usr/bin/env python3
"""
Database migration to add user ownership to companies table
"""
import sqlite3
import os
from datetime import datetime

DATABASE_URL = "dumpster_sharing.db"

def migrate_company_ownership():
    """Add created_by column to companies table"""
    if not os.path.exists(DATABASE_URL):
        print(f"Database {DATABASE_URL} not found!")
        return False
    
    # Create backup
    backup_name = f"{DATABASE_URL}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    import shutil
    shutil.copy2(DATABASE_URL, backup_name)
    print(f"Created backup: {backup_name}")
    
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(companies)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'created_by' in columns:
            print("Column 'created_by' already exists in companies table")
            return True
            
        # Add the created_by column
        cursor.execute("ALTER TABLE companies ADD COLUMN created_by INTEGER")
        
        # Get the first user (if any) to assign as default owner for existing companies
        cursor.execute("SELECT id FROM users LIMIT 1")
        first_user = cursor.fetchone()
        
        if first_user:
            # Set all existing companies to be owned by the first user
            cursor.execute("UPDATE companies SET created_by = ? WHERE created_by IS NULL", (first_user[0],))
            print(f"Assigned {cursor.rowcount} existing companies to user {first_user[0]}")
        else:
            print("No users found - existing companies will have NULL created_by")
        
        # Add foreign key constraint (note: SQLite doesn't support adding foreign keys to existing tables,
        # so the constraint is defined in the SQLAlchemy model)
        
        conn.commit()
        print("Successfully added created_by column to companies table")
        return True
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = migrate_company_ownership()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")