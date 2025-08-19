#!/usr/bin/env python3
"""
Migration script to add virtual card support to the database schema
"""
import sqlite3
import os

def migrate_virtual_cards():
    """Add virtual card fields to groups and create card_transactions table"""
    db_path = "dumpster_sharing.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add virtual card fields to groups table
        print("Adding virtual card fields to groups table...")
        
        cursor.execute("PRAGMA table_info(groups)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'virtual_card_id' not in columns:
            cursor.execute("ALTER TABLE groups ADD COLUMN virtual_card_id TEXT")
            print("✓ Added virtual_card_id column")
        
        if 'card_spending_limit' not in columns:
            cursor.execute("ALTER TABLE groups ADD COLUMN card_spending_limit INTEGER")
            print("✓ Added card_spending_limit column")
            
        if 'card_status' not in columns:
            cursor.execute("ALTER TABLE groups ADD COLUMN card_status TEXT DEFAULT 'pending'")
            print("✓ Added card_status column")
            
        if 'service_fee_collected' not in columns:
            cursor.execute("ALTER TABLE groups ADD COLUMN service_fee_collected DECIMAL(10,2)")
            print("✓ Added service_fee_collected column")
        
        # Create card_transactions table
        print("Creating card_transactions table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS card_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER REFERENCES groups(id),
                card_id TEXT,
                amount INTEGER,
                merchant_name TEXT,
                status TEXT,
                authorization_code TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✓ Created card_transactions table")
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_card_transactions_group_id ON card_transactions(group_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_card_transactions_card_id ON card_transactions(card_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_groups_virtual_card_id ON groups(virtual_card_id)")
        
        conn.commit()
        print("✅ Virtual card migration completed successfully!")
        
    except sqlite3.Error as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_virtual_cards()