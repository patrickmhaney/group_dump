#!/usr/bin/env python3
"""
Bulk Load Company Script

This script creates companies in the GroupDump system using the existing service account.
It reads company data from a JSON file and uses the API to create the company.

Usage:
    python bulk_load_company.py [data_file] [--api-url URL]

Arguments:
    data_file: Path to JSON file containing company data (default: bulk_test_company.json)
    --api-url: Base URL for the API (default: http://localhost:8000)

Usage Instructions

  Basic Usage:

  python bulk_load_company.py

  Custom Data File:

  python bulk_load_company.py my_custom_company.json

  Different API URL:

  python bulk_load_company.py --api-url http://localhost:8000
  
  Note: This script uses the existing service account service.account.dc@groupdump.com
"""

import json
import requests
import argparse
import sys
from typing import Dict, Any, Optional


class CompanyLoader:
    def __init__(self, api_url: str = "http://localhost:8000"):
        self.api_url = api_url.rstrip('/')
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        
        # Service account credentials
        self.service_email = "service.account.dc@groupdump.com"
        self.service_password = "Connect2"
        
    def load_data(self, file_path: str) -> Dict[str, Any]:
        """Load company data from JSON file"""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"❌ Error: File '{file_path}' not found")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Error: Invalid JSON in '{file_path}': {e}")
            sys.exit(1)
    
    
    def authenticate(self, email: str, password: str) -> bool:
        """Authenticate and get access token"""
        print(f"🔐 Authenticating as: {email}")
        
        url = f"{self.api_url}/token"
        data = {
            "username": email,  # FastAPI OAuth2 uses 'username' field for email
            "password": password
        }
        
        response = self.session.post(url, data=data)
        
        if response.status_code == 200:
            token_data = response.json()
            self.access_token = token_data["access_token"]
            
            # Set authorization header for future requests
            self.session.headers.update({
                "Authorization": f"Bearer {self.access_token}"
            })
            
            print("✅ Authentication successful")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code} - {response.text}")
            return False
    
    def create_company(self, company_data: Dict[str, Any]) -> bool:
        """Create a company using the API"""
        print(f"🏢 Creating company: {company_data['name']}")
        
        url = f"{self.api_url}/companies"
        
        # The API expects the dumpster_sizes as a list of DumpsterSize objects
        payload = {
            "name": company_data["name"],
            "email": company_data["email"],
            "phone": company_data["phone"],
            "address": company_data["address"],
            "website": company_data.get("website"),
            "service_areas": company_data["service_areas"],
            "dumpster_sizes": company_data["dumpster_sizes"]
        }
        
        response = self.session.post(url, json=payload)
        
        if response.status_code == 200:
            created_company = response.json()
            print("✅ Company created successfully!")
            print(f"   📍 Company ID: {created_company['id']}")
            print(f"   📧 Email: {created_company['email']}")
            print(f"   📞 Phone: {created_company['phone']}")
            print(f"   🌐 Website: {created_company.get('website', 'N/A')}")
            print(f"   📊 Dumpster sizes: {len(created_company['dumpster_sizes'])} options")
            return True
        else:
            print(f"❌ Failed to create company: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error details: {error_detail}")
            except json.JSONDecodeError:
                print(f"   Response text: {response.text}")
            return False
    
    def test_api_connection(self) -> bool:
        """Test if the API is accessible"""
        print("🔍 Testing API connection...")
        
        try:
            url = f"{self.api_url}/"
            response = self.session.get(url, timeout=5)
            
            if response.status_code == 200:
                print("✅ API is accessible")
                return True
            else:
                print(f"⚠️  API responded with status {response.status_code}")
                return True  # Still accessible, just different status
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to API at {self.api_url}")
            print("   Make sure the FastAPI server is running")
            return False
        except requests.exceptions.Timeout:
            print(f"❌ API connection timed out at {self.api_url}")
            return False
        except Exception as e:
            print(f"❌ Error connecting to API: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Bulk load companies using existing service account",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python bulk_load_company.py
    python bulk_load_company.py my_company.json
    python bulk_load_company.py --api-url http://localhost:8080
        """
    )
    
    parser.add_argument(
        'data_file',
        nargs='?',
        default='bulk_test_company.json',
        help='Path to JSON file containing company data (default: bulk_test_company.json)'
    )
    
    parser.add_argument(
        '--api-url',
        default='http://localhost:8000',
        help='Base URL for the API (default: http://localhost:8000)'
    )
    
    args = parser.parse_args()
    
    print("🚀 GroupDump Company Bulk Loader")
    print("=" * 40)
    
    # Initialize loader
    loader = CompanyLoader(args.api_url)
    
    # Test API connection
    if not loader.test_api_connection():
        sys.exit(1)
    
    # Load data
    print(f"📄 Loading data from: {args.data_file}")
    data = loader.load_data(args.data_file)
    
    # Validate required data
    if 'company' not in data:
        print("❌ Error: JSON file must contain 'company' section")
        sys.exit(1)
    
    company_data = data['company']
    
    # Authenticate with service account
    if not loader.authenticate(loader.service_email, loader.service_password):
        print(f"❌ Failed to authenticate with service account: {loader.service_email}")
        print("ℹ️  Make sure the service account exists and credentials are correct")
        sys.exit(1)
    
    # Create company
    if not loader.create_company(company_data):
        sys.exit(1)
    
    print("\n🎉 Bulk load completed successfully!")
    print("\nNext steps:")
    print("- Check the API at /companies to verify the company was created")
    print("- Use the company in group creation workflows")
    print("- Test with real users creating groups and selecting this vendor")


if __name__ == "__main__":
    main()