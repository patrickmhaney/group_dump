#!/usr/bin/env python3
"""
Add a virtual card to an existing group that has real users
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import Group, User, GroupMember, create_virtual_card_for_group, SessionLocal

async def add_virtual_card_to_group():
    """Add virtual card to an existing group with real participants"""
    print("🚀 Adding virtual card to existing group...")
    
    db = SessionLocal()
    
    try:
        # Find a group that has participants but no virtual card
        groups_without_cards = db.query(Group).filter(Group.virtual_card_id.is_(None)).all()
        
        print("📋 Groups without virtual cards:")
        for group in groups_without_cards:
            creator = db.query(User).filter(User.id == group.created_by).first()
            try:
                participant_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
            except:
                participant_count = 0
                
            creator_name = creator.name if creator else "Unknown"
            print(f"   ID: {group.id} | {group.name} | Creator: {creator_name} | Participants: {participant_count}/{group.max_participants}")
        
        # Pick group ID 13 which has 2/2 participants
        target_group_id = 13
        target_group = db.query(Group).filter(Group.id == target_group_id).first()
        
        if not target_group:
            print(f"❌ Group {target_group_id} not found")
            return
            
        creator = db.query(User).filter(User.id == target_group.created_by).first()
        print(f"\n🎯 Selected group: {target_group.name}")
        print(f"   Creator: {creator.name if creator else 'Unknown'} (ID: {target_group.created_by})")
        print(f"   Address: {target_group.address}")
        
        # Create virtual card for this group
        print(f"\n💳 Creating virtual card for group {target_group_id}...")
        amount = 250.00  # $250 total
        
        card_result = await create_virtual_card_for_group(target_group_id, amount, db)
        
        print(f"🎉 Virtual card created successfully!")
        print(f"   Card ID: {card_result['card_id']}")
        print(f"   Spending Limit: ${card_result['spending_limit']/100:.2f}")
        print(f"   Status: {card_result['status']}")
        
        # Verify the update
        db.refresh(target_group)
        print(f"\n✅ Group updated:")
        print(f"   Virtual Card ID: {target_group.virtual_card_id}")
        print(f"   Card Status: {target_group.card_status}")
        print(f"   Spending Limit: ${(target_group.card_spending_limit or 0)/100:.2f}")
        print(f"   Service Fee: ${target_group.service_fee_collected or 0:.2f}")
        
        # Check if it's a real Stripe card
        if target_group.virtual_card_id and target_group.virtual_card_id.startswith('ic_'):
            print(f"   ✅ REAL Stripe virtual card created!")
            
            # Test login with the creator
            print(f"\n🧪 Now test logging in as '{creator.name}' with email '{creator.email}' in your frontend")
            print(f"   The virtual card should appear in the Groups component")
        else:
            print(f"   ⚠️  Mock card created")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(add_virtual_card_to_group())