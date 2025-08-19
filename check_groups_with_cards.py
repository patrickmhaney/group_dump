#!/usr/bin/env python3
"""
Check which groups have virtual cards in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import Group, User, SessionLocal

def check_groups_with_cards():
    """Check which groups have virtual cards"""
    print("🔍 Checking groups with virtual cards...")
    
    db = SessionLocal()
    
    try:
        # Get all groups with virtual cards
        groups_with_cards = db.query(Group).filter(Group.virtual_card_id.isnot(None)).all()
        
        print(f"📋 Found {len(groups_with_cards)} groups with virtual cards:")
        
        for group in groups_with_cards:
            creator = db.query(User).filter(User.id == group.created_by).first()
            creator_name = creator.name if creator else "Unknown"
            
            print(f"\n   🏷️  Group ID: {group.id}")
            print(f"   📝 Name: {group.name}")
            print(f"   👤 Creator: {creator_name} (ID: {group.created_by})")
            print(f"   💳 Virtual Card ID: {group.virtual_card_id}")
            print(f"   💰 Spending Limit: ${(group.card_spending_limit or 0)/100:.2f}")
            print(f"   📊 Card Status: {group.card_status}")
            print(f"   💵 Service Fee: ${group.service_fee_collected or 0:.2f}")
            print(f"   💸 Total Collected: ${group.total_collected_amount or 0:.2f}")
            print(f"   🏠 Address: {group.address}")
            print(f"   👥 Max Participants: {group.max_participants}")
            print(f"   📅 Created: {group.created_at}")
            
            # Check if it's a real Stripe card
            if group.virtual_card_id and group.virtual_card_id.startswith('ic_'):
                print(f"   ✅ REAL Stripe virtual card")
            else:
                print(f"   ⚠️  Mock/Test card")
        
        # Also check all groups to see their current participant counts
        print(f"\n📊 All Groups Summary:")
        all_groups = db.query(Group).all()
        
        for group in all_groups:
            # Count current participants (assuming GroupMember table exists)
            try:
                from main import GroupMember
                participant_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
            except:
                participant_count = group.current_participants or 0
                
            creator = db.query(User).filter(User.id == group.created_by).first()
            creator_name = creator.name if creator else "Unknown"
            
            has_card = "✅" if group.virtual_card_id else "❌"
            card_type = "REAL" if (group.virtual_card_id and group.virtual_card_id.startswith('ic_')) else "MOCK"
            
            print(f"   ID: {group.id} | {group.name} | Creator: {creator_name} | "
                  f"Participants: {participant_count}/{group.max_participants} | "
                  f"Card: {has_card} {card_type if group.virtual_card_id else ''}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_groups_with_cards()