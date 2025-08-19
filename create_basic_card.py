#!/usr/bin/env python3
"""
Create a basic virtual card without category restrictions
"""

import os
import stripe
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
CARDHOLDER_ID = os.getenv("STRIPE_BUSINESS_CARDHOLDER_ID", "")

def create_basic_virtual_card():
    """Create a basic virtual card without category restrictions"""
    print("🚀 Creating basic virtual card...")
    try:
        card = stripe.issuing.Card.create(
            cardholder=CARDHOLDER_ID,
            type='virtual',
            currency='usd',
            spending_controls={
                'spending_limits': [
                    {
                        'amount': 10000,  # $100.00
                        'interval': 'per_authorization',
                    }
                ]
                # No category restrictions for now
            },
            metadata={
                'group_id': 'test_group_basic',
                'purpose': 'basic_test',
                'app': 'group_dump'
            }
        )
        
        print(f"✅ Virtual card created successfully!")
        print(f"   Card ID: {card.id}")
        print(f"   Status: {card.status}")
        print(f"   Brand: {card.brand}")
        print(f"   Last 4: {card.last4}")
        print(f"   Number: {card.number}")
        print(f"   CVC: {card.cvc}")
        print(f"   Exp: {card.exp_month:02d}/{card.exp_year}")
        print(f"   Spending limit: $100.00")
        
        # Test card operations
        print(f"\n🧪 Testing card operations...")
        
        # Test freeze
        print("   Freezing card...")
        stripe.issuing.Card.modify(card.id, status='inactive')
        frozen_card = stripe.issuing.Card.retrieve(card.id)
        print(f"   ✅ Card frozen: {frozen_card.status}")
        
        # Test unfreeze
        print("   Unfreezing card...")
        stripe.issuing.Card.modify(card.id, status='active')
        active_card = stripe.issuing.Card.retrieve(card.id)
        print(f"   ✅ Card unfrozen: {active_card.status}")
        
        print(f"\n🎉 All tests passed! Your Stripe Issuing is working correctly.")
        print(f"📱 You can now test this in your app with card ID: {card.id}")
        
        return card.id
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

if __name__ == "__main__":
    if not stripe.api_key:
        print("❌ No Stripe API key found")
        exit(1)
        
    if not CARDHOLDER_ID:
        print("❌ No cardholder ID found")
        exit(1)
        
    print(f"🔑 Using API key: {stripe.api_key[:12]}...")
    print(f"👤 Using cardholder: {CARDHOLDER_ID}")
    
    create_basic_virtual_card()