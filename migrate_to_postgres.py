"""Migration script to create PostgreSQL schema and migrate data"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv(override=True)

# Now import SQLAlchemy and our models
from sqlalchemy import create_engine, text
from app.database import Base
import app.models  # Register models

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"🔗 Using DATABASE_URL: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'SQLite'}")

if "sqlite" in DATABASE_URL:
    print("❌ ERROR: DATABASE_URL is still pointing to SQLite!")
    print("   Check your .env file")
    sys.exit(1)

# Create engine
engine = create_engine(DATABASE_URL)

def create_schema():
    """Create all tables in PostgreSQL"""
    print("\n🏗️  Creating database schema...")
    print("=" * 60)

    print(f"\n📋 Creating tables for {len(Base.metadata.tables)} models:")
    for table_name in Base.metadata.tables.keys():
        print(f"   - {table_name}")

    Base.metadata.create_all(bind=engine)
    print("\n✅ Schema created successfully!")

    # Verify
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result]
        print(f"\n📊 Verified tables in PostgreSQL ({len(tables)}):")
        for table in tables:
            print(f"   ✓ {table}")

    return len(tables)

if __name__ == "__main__":
    try:
        table_count = create_schema()
        print(f"\n🎉 SUCCESS! {table_count} tables created in PostgreSQL!")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
