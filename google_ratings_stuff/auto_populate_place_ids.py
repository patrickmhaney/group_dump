#!/usr/bin/env python3
"""
Automated script to populate Google Place IDs for companies.
This will automatically select the best match (first result) for each company.
Use this when you're confident in the search accuracy.
For manual verification, use populate_google_place_ids.py instead.
"""

import os
import sqlite3
from dotenv import load_dotenv
import requests
import time

load_dotenv()

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dumpster_sharing.db")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

if not GOOGLE_PLACES_API_KEY:
    print("ERROR: GOOGLE_PLACES_API_KEY not found in .env file")
    exit(1)

def search_place_id(business_name, address, city, state, zip_code):
    """Search for a business using Google Places API (New) and return the best match"""
    try:
        # Use Text Search (New)
        query = f"{business_name}, {address}, {city}, {state} {zip_code}"

        url = "https://places.googleapis.com/v1/places:searchText"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount"
        }
        data = {
            "textQuery": query
        }

        response = requests.post(url, headers=headers, json=data)

        if response.status_code == 200:
            result = response.json()
            if 'places' in result and len(result['places']) > 0:
                place = result['places'][0]
                return {
                    'place_id': place.get('id', '').replace('places/', ''),
                    'name': place.get('displayName', {}).get('text', 'N/A'),
                    'formatted_address': place.get('formattedAddress', 'N/A'),
                    'rating': place.get('rating'),
                    'user_ratings_total': place.get('userRatingCount')
                }

        # Fallback to name + city search
        query = f"{business_name}, {city}, {state}"
        data['textQuery'] = query
        response = requests.post(url, headers=headers, json=data)

        if response.status_code == 200:
            result = response.json()
            if 'places' in result and len(result['places']) > 0:
                place = result['places'][0]
                return {
                    'place_id': place.get('id', '').replace('places/', ''),
                    'name': place.get('displayName', {}).get('text', 'N/A'),
                    'formatted_address': place.get('formattedAddress', 'N/A'),
                    'rating': place.get('rating'),
                    'user_ratings_total': place.get('userRatingCount')
                }

        return None
    except Exception as e:
        print(f"    Error: {e}")
        return None

def main():
    print("=" * 80)
    print("AUTO POPULATE GOOGLE PLACE IDs")
    print("=" * 80)
    print("\n⚠️  WARNING: This will automatically assign Place IDs based on best match")
    print("For manual verification, use populate_google_place_ids.py instead\n")

    response = input("Continue? (y/n): ").lower()
    if response != 'y':
        print("Exiting...")
        return

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get companies without google_place_id
    cursor.execute("""
        SELECT id, name, address, city, state, zip_code
        FROM companies
        WHERE google_place_id IS NULL OR google_place_id = ''
        ORDER BY id
    """)

    companies = cursor.fetchall()

    if not companies:
        print("\n✓ All companies already have Place IDs!")
        conn.close()
        return

    print(f"\nFound {len(companies)} companies without Place IDs")
    print("Processing...\n")

    updated = 0
    failed = 0
    failed_companies = []

    for company in companies:
        company_id, name, address, city, state, zip_code = company

        print(f"[{company_id}] {name} - ", end="")

        match = search_place_id(name, address, city, state, zip_code)

        if match:
            place_id = match['place_id']
            matched_name = match.get('name', 'N/A')
            rating = match.get('rating', 'N/A')

            cursor.execute(
                "UPDATE companies SET google_place_id = ? WHERE id = ?",
                (place_id, company_id)
            )
            conn.commit()

            print(f"✓ Matched: {matched_name} (Rating: {rating})")
            updated += 1
        else:
            print("✗ No match found")
            failed += 1
            failed_companies.append((company_id, name))

        # Rate limiting
        time.sleep(0.3)

    conn.close()

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"✓ Successfully updated: {updated} companies")
    print(f"✗ Failed to find: {failed} companies")

    if failed_companies:
        print("\nCompanies that need manual review:")
        for cid, cname in failed_companies:
            print(f"  - [{cid}] {cname}")

    print("\nNext step: Refresh ratings from Google")
    print("  python3 get_admin_token.py")
    print("  # Then use the curl command provided")
    print("=" * 80)

if __name__ == "__main__":
    main()
