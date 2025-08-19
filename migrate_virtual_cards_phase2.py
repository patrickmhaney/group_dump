#!/usr/bin/env python3
"""
Migration script to add virtual card fields for Phase 2 implementation
"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Add virtual card related columns to the groups table"""
    
    # Connect to the database
    db_path = os.path.join(os.path.dirname(__file__), 'dumpster_sharing.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Starting Phase 2 virtual card migration...")
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(groups)")
        existing_columns = [column[1] for column in cursor.fetchall()]
        
        migrations = [
            ("virtual_card_id", "ALTER TABLE groups ADD COLUMN virtual_card_id TEXT"),
            ("card_spending_limit", "ALTER TABLE groups ADD COLUMN card_spending_limit INTEGER"),
            ("card_status", "ALTER TABLE groups ADD COLUMN card_status TEXT DEFAULT 'pending'"),
            ("service_fee_collected", "ALTER TABLE groups ADD COLUMN service_fee_collected REAL"),
            ("total_collected_amount", "ALTER TABLE groups ADD COLUMN total_collected_amount REAL"),
            ("vendor_name", "ALTER TABLE groups ADD COLUMN vendor_name TEXT"),
            ("vendor_website", "ALTER TABLE groups ADD COLUMN vendor_website TEXT"),
        ]
        
        for column_name, migration_sql in migrations:
            if column_name not in existing_columns:
                print(f"Adding column: {column_name}")
                cursor.execute(migration_sql)
            else:
                print(f"Column {column_name} already exists, skipping...")
        
        # Update existing groups to have proper card_status
        cursor.execute("UPDATE groups SET card_status = 'not_needed' WHERE card_status IS NULL")
        
        conn.commit()
        print("Phase 2 migration completed successfully!")
        
    except sqlite3.Error as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()