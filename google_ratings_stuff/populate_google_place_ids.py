#!/usr/bin/env python3
"""
Script to search for Google Place IDs for all companies in the database.
This will search Google Places API for each company and help you assign Place IDs.
"""

import os
import sqlite3
from dotenv import load_dotenv
import googlemaps
import time

load_dotenv()

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dumpster_sharing.db")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")

if not GOOGLE_PLACES_API_KEY:
    print("ERROR: GOOGLE_PLACES_API_KEY not found in .env file")
    print("Please add your Google Places API key to .env file")
    exit(1)

# Initialize Google Maps client
gmaps = googlemaps.Client(key=GOOGLE_PLACES_API_KEY)

def search_place_id(business_name, address, city, state, zip_code):
    """Search for a business on Google Places and return potential matches"""
    try:
        # Try a comprehensive search first
        query = f"{business_name}, {address}, {city}, {state} {zip_code}"
        print(f"\n  Searching: {query}")

        result = gmaps.places(query=query)

        if result and 'results' in result and len(result['results']) > 0:
            return result['results'][:5]  # Return top 5 matches

        # If no results, try with just name and city
        query = f"{business_name}, {city}, {state}"
        print(f"  No results. Trying: {query}")
        result = gmaps.places(query=query)

        if result and 'results' in result and len(result['results']) > 0:
            return result['results'][:5]

        return None
    except Exception as e:
        print(f"  Error searching: {e}")
        return None

def display_matches(matches):
    """Display search results for user selection"""
    print("\n  Found matches:")
    for i, match in enumerate(matches, 1):
        name = match.get('name', 'N/A')
        address = match.get('formatted_address', 'N/A')
        place_id = match.get('place_id', 'N/A')
        rating = match.get('rating', 'N/A')
        user_ratings_total = match.get('user_ratings_total', 'N/A')

        print(f"\n  [{i}] {name}")
        print(f"      Address: {address}")
        print(f"      Place ID: {place_id}")
        print(f"      Rating: {rating} ({user_ratings_total} reviews)")

    print(f"\n  [0] Skip this company")
    print(f"  [s] Search again with custom query")

def update_company_place_id(conn, company_id, place_id):
    """Update company with Google Place ID"""
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE companies SET google_place_id = ? WHERE id = ?",
        (place_id, company_id)
    )
    conn.commit()

def main():
    """Main function to populate Google Place IDs"""
    print("=" * 80)
    print("GOOGLE PLACE ID POPULATION TOOL")
    print("=" * 80)

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get all companies without a google_place_id
    cursor.execute("""
        SELECT id, name, address, city, state, zip_code, google_place_id
        FROM companies
        ORDER BY id
    """)

    companies = cursor.fetchall()

    if not companies:
        print("\nNo companies found in database.")
        conn.close()
        return

    print(f"\nFound {len(companies)} companies in database")

    # Filter companies that need Place IDs
    companies_without_place_id = [c for c in companies if not c[6]]
    companies_with_place_id = [c for c in companies if c[6]]

    print(f"  - {len(companies_with_place_id)} already have Place IDs")
    print(f"  - {len(companies_without_place_id)} need Place IDs")

    if companies_without_place_id:
        response = input(f"\nProcess companies without Place IDs? (y/n): ").lower()
        if response != 'y':
            print("Exiting...")
            conn.close()
            return
    else:
        print("\nAll companies already have Place IDs!")
        response = input("Do you want to review/update existing Place IDs? (y/n): ").lower()
        if response == 'y':
            companies_without_place_id = companies
        else:
            conn.close()
            return

    print("\n" + "=" * 80)
    print("STARTING COMPANY PROCESSING")
    print("=" * 80)

    updated_count = 0
    skipped_count = 0

    for company in companies_without_place_id:
        company_id, name, address, city, state, zip_code, existing_place_id = company

        print(f"\n{'=' * 80}")
        print(f"Company #{company_id}: {name}")
        print(f"Address: {address}, {city}, {state} {zip_code}")
        if existing_place_id:
            print(f"Current Place ID: {existing_place_id}")
        print('=' * 80)

        while True:
            # Search for matches
            matches = search_place_id(name, address, city, state, zip_code)

            if not matches:
                print("\n  ❌ No matches found on Google Places")
                response = input("  Try custom search? (y/n/skip): ").lower()
                if response == 'y':
                    custom_query = input("  Enter custom search query: ")
                    try:
                        result = gmaps.places(query=custom_query)
                        if result and 'results' in result and len(result['results']) > 0:
                            matches = result['results'][:5]
                        else:
                            print("  No results found")
                            continue
                    except Exception as e:
                        print(f"  Error: {e}")
                        continue
                else:
                    skipped_count += 1
                    break

            if matches:
                display_matches(matches)

                choice = input("\n  Select option (0-5, s): ").strip().lower()

                if choice == '0':
                    skipped_count += 1
                    break
                elif choice == 's':
                    custom_query = input("  Enter custom search query: ")
                    try:
                        result = gmaps.places(query=custom_query)
                        if result and 'results' in result and len(result['results']) > 0:
                            matches = result['results'][:5]
                            continue
                        else:
                            print("  No results found")
                            continue
                    except Exception as e:
                        print(f"  Error: {e}")
                        continue
                elif choice.isdigit() and 1 <= int(choice) <= len(matches):
                    selected = matches[int(choice) - 1]
                    place_id = selected['place_id']

                    print(f"\n  ✓ Selected: {selected['name']}")
                    print(f"    Place ID: {place_id}")

                    confirm = input("  Confirm and save? (y/n): ").lower()
                    if confirm == 'y':
                        update_company_place_id(conn, company_id, place_id)
                        print(f"  ✅ Updated company #{company_id} with Place ID")
                        updated_count += 1
                        break
                else:
                    print("  Invalid choice. Please try again.")

        # Rate limiting - be nice to the API
        time.sleep(0.5)

    conn.close()

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"  Updated: {updated_count} companies")
    print(f"  Skipped: {skipped_count} companies")
    print("\nNext step: Run the refresh ratings endpoint to fetch all ratings:")
    print("  python3 get_admin_token.py")
    print("  # Then use the curl command provided")
    print("=" * 80)

if __name__ == "__main__":
    main()
