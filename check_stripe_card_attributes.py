#!/usr/bin/env python3
"""
Check what attributes are available on a Stripe Issuing Card object
"""

import stripe
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Stripe with test key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def check_card_attributes():
    """Check what attributes are available on existing cards"""
    print("🔍 Checking Stripe Card attributes...")
    
    try:
        # Get the test card ID from our database or recent creation
        card_id = "ic_1RxrsyA5CVpdH2imxYssKs3f"  # From our test
        
        print(f"📋 Retrieving card: {card_id}")
        card = stripe.issuing.Card.retrieve(card_id)
        
        print(f"\n💳 Card object attributes:")
        print(f"   ID: {card.id}")
        print(f"   Brand: {card.brand}")
        print(f"   Last4: {card.last4}")
        print(f"   Exp Month: {card.exp_month}")
        print(f"   Exp Year: {card.exp_year}")
        print(f"   Status: {card.status}")
        print(f"   Type: {card.type}")
        
        # Check for number and CVC attributes
        print(f"\n🔍 Checking for sensitive attributes:")
        print(f"   Has 'number' attribute: {hasattr(card, 'number')}")
        print(f"   Has 'cvc' attribute: {hasattr(card, 'cvc')}")
        
        if hasattr(card, 'number'):
            print(f"   Number: {card.number}")
        else:
            print(f"   Number: Not available in standard retrieve")
            
        if hasattr(card, 'cvc'):
            print(f"   CVC: {card.cvc}")
        else:
            print(f"   CVC: Not available in standard retrieve")
            
        # Print all available attributes
        print(f"\n📋 All card attributes:")
        for attr in dir(card):
            if not attr.startswith('_'):
                try:
                    value = getattr(card, attr)
                    if not callable(value):
                        print(f"   {attr}: {value}")
                except:
                    print(f"   {attr}: <error accessing>")
                    
        # Check if we need to retrieve sensitive details differently
        print(f"\n🔍 Stripe documentation suggests:")
        print(f"   - Full card numbers are available via special API endpoints")
        print(f"   - In test mode, some details might be available through card.number")
        print(f"   - For production, PCI compliance requires special handling")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    check_card_attributes()