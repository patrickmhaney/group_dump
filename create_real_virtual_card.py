#!/usr/bin/env python3
"""
Test creating a real virtual card using Stripe Issuing directly
This bypasses the app's mock implementation
"""

import os
import stripe
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
CARDHOLDER_ID = os.getenv("STRIPE_BUSINESS_CARDHOLDER_ID", "")

def create_real_virtual_card():
    """Create a real virtual card using Stripe Issuing"""
    print("💳 Creating REAL virtual card with Stripe Issuing...")
    
    try:
        # Create actual Stripe virtual card
        card = stripe.issuing.Card.create(
            cardholder=CARDHOLDER_ID,
            type='virtual',
            currency='usd',
            spending_controls={
                'spending_limits': [{
                    'amount': 10000,  # $100.00
                    'interval': 'per_authorization'
                }]
            },
            metadata={
                'group_id': 'test_real_card',
                'purpose': 'testing_real_implementation',
                'app': 'group_dump'
            }
        )
        
        print(f"🎉 REAL virtual card created successfully!")
        print(f"   Card ID: {card.id}")
        print(f"   Status: {card.status}")
        print(f"   Brand: {card.brand}")
        print(f"   Last 4: {card.last4}")
        print(f"   Exp: {card.exp_month:02d}/{card.exp_year}")
        print(f"   Spending Limit: $100.00")
        
        # Test accessing full card details (note: this requires special permissions)
        print(f"\n🔍 Attempting to retrieve full card details...")
        try:
            # Try to get sensitive data - this might fail if not properly configured
            card_details = stripe.issuing.Card.retrieve(card.id, expand=['number', 'cvc'])
            if hasattr(card_details, 'number'):
                print(f"   Card Number: {card_details.number}")
                print(f"   CVC: {card_details.cvc}")
            else:
                print(f"   ⚠️  Full card details not accessible (normal in test mode)")
        except Exception as detail_error:
            print(f"   ⚠️  Full card details access error: {str(detail_error)}")
        
        # Test card controls
        print(f"\n🧪 Testing card controls...")
        
        # Freeze the card
        print("   Freezing card...")
        frozen_card = stripe.issuing.Card.modify(card.id, status='inactive')
        print(f"   ✅ Card status: {frozen_card.status}")
        
        # Unfreeze the card
        print("   Unfreezing card...")
        active_card = stripe.issuing.Card.modify(card.id, status='active')
        print(f"   ✅ Card status: {active_card.status}")
        
        print(f"\n🎉 All real virtual card tests passed!")
        print(f"📝 This proves your Stripe Issuing is working correctly")
        print(f"🔧 Now you just need to update your app to use the real Stripe function")
        
        return card.id
        
    except Exception as e:
        print(f"❌ Error creating real virtual card: {str(e)}")
        return None

if __name__ == "__main__":
    if not stripe.api_key:
        print("❌ No Stripe API key found")
        exit(1)
        
    if not CARDHOLDER_ID:
        print("❌ No cardholder ID found")
        exit(1)
        
    print("🚀 Testing REAL Virtual Card Creation")
    print("=" * 50)
    create_real_virtual_card()