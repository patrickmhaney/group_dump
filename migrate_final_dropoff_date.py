#!/usr/bin/env python3

import sqlite3
import sys

def migrate_final_dropoff_date():
    """Add final_dropoff_date_id field to groups table"""
    try:
        conn = sqlite3.connect('dumpster_sharing.db')
        cursor = conn.cursor()

        # Check if column already exists
        cursor.execute("PRAGMA table_info(groups)")
        columns = [col[1] for col in cursor.fetchall()]

        # Add final_dropoff_date_id column if it doesn't exist
        if 'final_dropoff_date_id' not in columns:
            cursor.execute("ALTER TABLE groups ADD COLUMN final_dropoff_date_id INTEGER REFERENCES dropoff_dates(id)")
            print("Added final_dropoff_date_id column to groups table")
        else:
            print("final_dropoff_date_id column already exists in groups table")

        conn.commit()
        conn.close()
        print("Migration completed successfully!")

    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_final_dropoff_date()