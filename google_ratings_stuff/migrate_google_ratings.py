#!/usr/bin/env python3
"""
Migration script to add Google Places rating fields to the companies table.
Run this script to add:
- google_place_id
- google_rating
- google_user_ratings_total
- google_rating_updated_at
"""

import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dumpster_sharing.db")
# Extract the database file path from the URL
db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

def migrate():
    """Add Google rating fields to companies table"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"Connected to database: {db_path}")

    # Check if columns already exist
    cursor.execute("PRAGMA table_info(companies)")
    columns = [column[1] for column in cursor.fetchall()]

    migrations_needed = []

    if 'google_place_id' not in columns:
        migrations_needed.append(
            "ALTER TABLE companies ADD COLUMN google_place_id TEXT"
        )

    if 'google_rating' not in columns:
        migrations_needed.append(
            "ALTER TABLE companies ADD COLUMN google_rating REAL"
        )

    if 'google_user_ratings_total' not in columns:
        migrations_needed.append(
            "ALTER TABLE companies ADD COLUMN google_user_ratings_total INTEGER"
        )

    if 'google_rating_updated_at' not in columns:
        migrations_needed.append(
            "ALTER TABLE companies ADD COLUMN google_rating_updated_at TIMESTAMP"
        )

    if not migrations_needed:
        print("✓ All Google rating columns already exist. No migration needed.")
        conn.close()
        return

    print(f"\nRunning {len(migrations_needed)} migrations...")

    for sql in migrations_needed:
        print(f"  Executing: {sql}")
        cursor.execute(sql)

    conn.commit()
    print(f"\n✓ Successfully added {len(migrations_needed)} column(s) to companies table")

    # Verify the changes
    cursor.execute("PRAGMA table_info(companies)")
    columns_after = [column[1] for column in cursor.fetchall()]

    print("\nCurrent companies table columns:")
    for col in columns_after:
        print(f"  - {col}")

    conn.close()
    print("\n✓ Migration completed successfully!")
    print("\nNext steps:")
    print("1. Add your Google Places API key to .env file: GOOGLE_PLACES_API_KEY=your_key_here")
    print("2. Add google_place_id to your companies (manually or via update endpoint)")
    print("3. Call POST /companies/refresh-all-google-ratings to populate ratings")

if __name__ == "__main__":
    migrate()
