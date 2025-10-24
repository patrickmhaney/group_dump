#!/usr/bin/env python3
"""
Test script for the new /companies/public endpoint.
Run this after restarting the server with the updated code.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_public_endpoint():
    print("=" * 60)
    print("Testing /companies/public endpoint")
    print("=" * 60)

    # Test 1: Valid zipcode
    print("\n1. Testing with valid zipcode (90210)...")
    try:
        response = requests.get(f"{BASE_URL}/companies/public", params={"zip_code": "90210"}, timeout=10)
        print(f"   Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Success! Found {len(data)} companies")
            if data:
                print(f"\n   Sample company:")
                company = data[0]
                print(f"     - Name: {company.get('name')}")
                print(f"     - City: {company.get('city')}, {company.get('state')}")
                print(f"     - Email: {company.get('email')}")
                print(f"     - Phone: {company.get('phone')}")
                print(f"     - Rating: {company.get('google_rating')} ({company.get('google_user_ratings_total')} reviews)")
                print(f"     - Dumpster sizes: {len(company.get('dumpster_sizes', []))} options")
        else:
            print(f"   ✗ Error: {response.text}")
    except Exception as e:
        print(f"   ✗ Request failed: {e}")

    # Test 2: Invalid zipcode
    print("\n2. Testing with invalid zipcode (invalid)...")
    try:
        response = requests.get(f"{BASE_URL}/companies/public", params={"zip_code": "invalid"}, timeout=10)
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 400:
            print(f"   ✓ Correctly rejected invalid zipcode")
            print(f"   Message: {response.json().get('detail')}")
        else:
            print(f"   ✗ Expected 400 status code")
    except Exception as e:
        print(f"   ✗ Request failed: {e}")

    # Test 3: Missing zipcode
    print("\n3. Testing without zipcode parameter...")
    try:
        response = requests.get(f"{BASE_URL}/companies/public", timeout=10)
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 422:
            print(f"   ✓ Correctly requires zipcode parameter")
        else:
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ✗ Request failed: {e}")

    # Test 4: Rate limiting (make 5 requests quickly)
    print("\n4. Testing rate limiting (making 5 quick requests)...")
    try:
        for i in range(5):
            response = requests.get(f"{BASE_URL}/companies/public", params={"zip_code": "10001"}, timeout=10)
            print(f"   Request {i+1}: Status {response.status_code}")
            if response.status_code == 429:
                print(f"   ✓ Rate limit working (hit limit at request {i+1})")
                break
    except Exception as e:
        print(f"   ✗ Request failed: {e}")

    print("\n" + "=" * 60)
    print("Testing complete!")
    print("=" * 60)

if __name__ == "__main__":
    test_public_endpoint()
