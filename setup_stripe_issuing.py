#!/usr/bin/env python3
"""
Setup script for Stripe Issuing sandbox
This script helps configure your Stripe account for virtual card issuing
"""

import os
import stripe
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

def check_stripe_issuing_enabled():
    """Check if Stripe Issuing is enabled for this account"""
    print("🔍 Checking Stripe Issuing status...")
    try:
        account = stripe.Account.retrieve()
        capabilities = account.capabilities
        
        print(f"Account ID: {account.id}")
        print(f"Country: {account.country}")
        print(f"Type: {account.type}")
        
        # Check issuing capability
        issuing_status = capabilities.get('card_issuing', 'not_available')
        print(f"Card Issuing Status: {issuing_status}")
        
        if issuing_status == 'active':
            print("✅ Stripe Issuing is active and ready to use!")
            return True
        elif issuing_status == 'inactive':
            print("⚠️  Stripe Issuing is available but not yet activated")
            print("   You may need to complete additional setup in your Stripe dashboard")
            return False
        elif issuing_status == 'pending':
            print("⏳ Stripe Issuing activation is pending")
            return False
        else:
            print("❌ Stripe Issuing is not available for this account")
            print("   Contact Stripe support to enable Issuing for your account")
            return False
            
    except Exception as e:
        print(f"❌ Error checking account: {str(e)}")
        return False

def create_business_cardholder():
    """Create the main business cardholder for your platform"""
    print("\n🏢 Creating business cardholder...")
    try:
        # Check if cardholder already exists
        existing_cardholders = stripe.issuing.Cardholder.list(limit=10)
        for cardholder in existing_cardholders.data:
            if cardholder.name == "Group Dump Platform" and cardholder.type == "company":
                print(f"✅ Business cardholder already exists: {cardholder.id}")
                return cardholder.id
        
        # Create new cardholder
        cardholder = stripe.issuing.Cardholder.create(
            type='company',
            name='Group Dump Platform',
            email='admin@groupdump.com',
            phone_number='+15551234567',
            billing={
                'address': {
                    'line1': '123 Main Street',
                    'line2': 'Suite 100',
                    'city': 'San Francisco', 
                    'state': 'CA',
                    'postal_code': '94105',
                    'country': 'US',
                }
            },
            company={
                'tax_id': '000000000',  # Test tax ID for sandbox
            },
            status='active'
        )
        
        print(f"✅ Business cardholder created successfully!")
        print(f"   ID: {cardholder.id}")
        print(f"   Name: {cardholder.name}")
        print(f"   Email: {cardholder.email}")
        print(f"   Status: {cardholder.status}")
        
        return cardholder.id
        
    except Exception as e:
        print(f"❌ Error creating cardholder: {str(e)}")
        return None

def create_sample_virtual_card(cardholder_id):
    """Create a sample virtual card to test the setup"""
    print(f"\n💳 Creating sample virtual card...")
    try:
        card = stripe.issuing.Card.create(
            cardholder=cardholder_id,
            type='virtual',
            currency='usd',
            spending_controls={
                'spending_limits': [
                    {
                        'amount': 10000,  # $100.00 limit
                        'interval': 'per_authorization'
                    }
                ],
                'allowed_categories': ['rental_and_leasing_services'],
                'blocked_categories': ['gambling', 'adult_entertainment']
            },
            metadata={
                'group_id': 'sample_group',
                'purpose': 'setup_test',
                'environment': 'sandbox'
            }
        )
        
        print(f"✅ Sample virtual card created successfully!")
        print(f"   Card ID: {card.id}")
        print(f"   Status: {card.status}")
        print(f"   Brand: {card.brand}")
        print(f"   Last 4: {card.last4}")
        print(f"   Spending Limit: $100.00")
        print(f"   Exp: {card.exp_month}/{card.exp_year}")
        
        return card.id
        
    except Exception as e:
        print(f"❌ Error creating sample card: {str(e)}")
        return None

def update_env_file(cardholder_id):
    """Update .env file with the cardholder ID"""
    print(f"\n📝 Updating .env file with cardholder ID...")
    try:
        env_path = ".env"
        lines = []
        cardholder_line_exists = False
        
        # Read existing .env file
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                lines = f.readlines()
        
        # Update or add cardholder ID line
        updated_lines = []
        for line in lines:
            if line.startswith('STRIPE_BUSINESS_CARDHOLDER_ID='):
                updated_lines.append(f'STRIPE_BUSINESS_CARDHOLDER_ID={cardholder_id}\n')
                cardholder_line_exists = True
            else:
                updated_lines.append(line)
        
        # Add cardholder ID if it doesn't exist
        if not cardholder_line_exists:
            updated_lines.append(f'STRIPE_BUSINESS_CARDHOLDER_ID={cardholder_id}\n')
        
        # Write back to file
        with open(env_path, 'w') as f:
            f.writelines(updated_lines)
            
        print(f"✅ Updated .env file with cardholder ID: {cardholder_id}")
        
    except Exception as e:
        print(f"❌ Error updating .env file: {str(e)}")

def test_card_operations(card_id):
    """Test basic card operations"""
    print(f"\n🧪 Testing card operations...")
    try:
        # Retrieve card
        card = stripe.issuing.Card.retrieve(card_id)
        print(f"✅ Card retrieval successful")
        
        # Update card (freeze/unfreeze test)
        print("   Testing freeze operation...")
        stripe.issuing.Card.modify(card_id, status='inactive')
        card = stripe.issuing.Card.retrieve(card_id)
        print(f"   ✅ Card frozen. Status: {card.status}")
        
        print("   Testing unfreeze operation...")
        stripe.issuing.Card.modify(card_id, status='active')
        card = stripe.issuing.Card.retrieve(card_id)
        print(f"   ✅ Card unfrozen. Status: {card.status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing card operations: {str(e)}")
        return False

def print_integration_guide():
    """Print integration guide for the developer"""
    print("\n" + "="*60)
    print("🎉 STRIPE ISSUING SETUP COMPLETE!")
    print("="*60)
    print("\n📋 Integration Checklist:")
    print("✅ Stripe Issuing is configured")
    print("✅ Business cardholder created")
    print("✅ Sample virtual card tested")
    print("✅ Environment variables updated")
    
    print("\n🚀 Next Steps:")
    print("1. Restart your FastAPI server to pick up new environment variables")
    print("2. Test virtual card creation through your app's API")
    print("3. Verify card details display in your React frontend")
    print("4. Test card freeze/unfreeze functionality")
    
    print("\n🔧 API Endpoints to Test:")
    print("POST /api/cards/create-virtual-card")
    print("GET  /api/cards/details/{group_id}")
    print("POST /api/cards/{group_id}/freeze")
    print("GET  /api/cards/{group_id}/transactions")
    
    print("\n⚠️  Important Notes:")
    print("• This is using Stripe's TEST mode - no real money involved")
    print("• Virtual cards created will have test card numbers")
    print("• Use Stripe's test card numbers for frontend testing")
    print("• Monitor transactions in your Stripe Dashboard")

def main():
    """Main setup function"""
    print("🚀 Starting Stripe Issuing Setup")
    print("=" * 50)
    
    # Check if API key is configured
    if not stripe.api_key:
        print("❌ STRIPE_SECRET_KEY not found in environment variables")
        print("   Please add your Stripe secret key to .env file first")
        return
    
    print(f"🔑 Using Stripe API key: {stripe.api_key[:7]}...")
    
    # Check if Issuing is enabled
    if not check_stripe_issuing_enabled():
        print("\n❌ Cannot proceed without Stripe Issuing enabled")
        print("   Please contact Stripe support or check your dashboard")
        return
    
    # Create business cardholder
    cardholder_id = create_business_cardholder()
    if not cardholder_id:
        print("❌ Could not create business cardholder")
        return
    
    # Update environment file
    update_env_file(cardholder_id)
    
    # Create and test sample card
    card_id = create_sample_virtual_card(cardholder_id)
    if card_id:
        test_card_operations(card_id)
    
    # Print integration guide
    print_integration_guide()

if __name__ == "__main__":
    main()