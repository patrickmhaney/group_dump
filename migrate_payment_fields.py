#!/usr/bin/env python3

import sqlite3
import sys

def migrate_payment_fields():
    """Add payment fields to invitees table"""
    try:
        conn = sqlite3.connect('dumpster_sharing.db')
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(invitees)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Add payment_setup_intent_id column if it doesn't exist
        if 'payment_setup_intent_id' not in columns:
            cursor.execute("ALTER TABLE invitees ADD COLUMN payment_setup_intent_id TEXT")
            print("Added payment_setup_intent_id column to invitees table")
        
        # Add payment_method_id column if it doesn't exist
        if 'payment_method_id' not in columns:
            cursor.execute("ALTER TABLE invitees ADD COLUMN payment_method_id TEXT")
            print("Added payment_method_id column to invitees table")
        
        # Add payment_status column if it doesn't exist
        if 'payment_status' not in columns:
            cursor.execute("ALTER TABLE invitees ADD COLUMN payment_status TEXT DEFAULT 'setup_required'")
            print("Added payment_status column to invitees table")
        
        conn.commit()
        conn.close()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_payment_fields()