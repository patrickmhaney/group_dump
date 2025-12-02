#!/usr/bin/env python3
"""
Script to view current Google Place IDs and ratings for all companies.
Useful for checking status before/after running population scripts.
"""

import os
import sqlite3
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dumpster_sharing.db")
db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

def main():
    print("=" * 100)
    print("GOOGLE PLACE IDs AND RATINGS STATUS")
    print("=" * 100)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            name,
            city,
            state,
            google_place_id,
            google_rating,
            google_user_ratings_total,
            google_rating_updated_at
        FROM companies
        ORDER BY id
    """)

    companies = cursor.fetchall()

    if not companies:
        print("\nNo companies found in database.")
        conn.close()
        return

    # Stats
    total = len(companies)
    with_place_id = sum(1 for c in companies if c[4])
    with_rating = sum(1 for c in companies if c[5])
    without_place_id = total - with_place_id

    print(f"\n📊 SUMMARY:")
    print(f"  Total companies: {total}")
    print(f"  ✓ With Place ID: {with_place_id} ({(with_place_id/total*100):.1f}%)")
    print(f"  ✓ With Rating: {with_rating} ({(with_rating/total*100):.1f}%)")
    print(f"  ✗ Without Place ID: {without_place_id} ({(without_place_id/total*100):.1f}%)")

    print("\n" + "=" * 100)
    print("COMPANY DETAILS")
    print("=" * 100)

    for company in companies:
        company_id, name, city, state, place_id, rating, reviews, updated_at = company

        status = "✓" if place_id else "✗"
        print(f"\n[{company_id}] {status} {name} ({city}, {state})")

        if place_id:
            print(f"     Place ID: {place_id}")
            if rating:
                print(f"     Rating: ⭐ {rating:.1f} ({reviews} reviews)")
                if updated_at:
                    print(f"     Last updated: {updated_at}")
            else:
                print(f"     Rating: Not fetched yet")
        else:
            print(f"     Place ID: Not set - run populate script")

    # Show next steps
    print("\n" + "=" * 100)
    print("NEXT STEPS")
    print("=" * 100)

    if without_place_id > 0:
        print(f"\n📝 {without_place_id} companies need Place IDs:")
        print("   python3 populate_google_place_ids.py      # Interactive mode")
        print("   python3 auto_populate_place_ids.py         # Automatic mode")

    if with_place_id > with_rating:
        print(f"\n⭐ {with_place_id - with_rating} companies need ratings fetched:")
        print("   python3 get_admin_token.py")
        print("   # Then run the curl command provided")

    if with_rating == total:
        print("\n✅ All companies have Place IDs and ratings!")
        print("   To refresh ratings: python3 get_admin_token.py")

    print("\n" + "=" * 100)

    conn.close()

if __name__ == "__main__":
    main()
