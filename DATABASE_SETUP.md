# Database Setup Guide

## Overview

You now have two PostgreSQL databases:
- **Local Development**: `dumpster_sharing_dev` on localhost
- **Cloud Production**: `dumpster_sharing` on Google Cloud SQL

## Current Setup

### Local Development Database
- **Host**: localhost (PostgreSQL 17.7 via Homebrew)
- **Database**: dumpster_sharing_dev
- **Connection**: `postgresql://haney@localhost:5432/dumpster_sharing_dev`
- **Usage**: Day-to-day development, safe testing

### Cloud Production Database
- **Host**: Google Cloud SQL
- **Database**: dumpster_sharing
- **Connection**: See `.env.production` file (contains credentials)
- **Usage**: Production/deployment only

## Switching Between Databases

Your `.env` file controls which database the app uses.

### Currently Using: Local Development
```bash
# .env currently points to local PostgreSQL
DATABASE_URL=postgresql://haney@localhost:5432/dumpster_sharing_dev
```

### To Switch to Production (Cloud SQL)
```bash
# Copy production config (contains cloud credentials)
cp .env.production .env
```

### To Switch Back to Local
```bash
# Edit .env to use local database
DATABASE_URL=postgresql://haney@localhost:5432/dumpster_sharing_dev
```

## Managing Local PostgreSQL

### Start PostgreSQL (auto-starts on boot)
```bash
brew services start postgresql@17
```

### Stop PostgreSQL
```bash
brew services stop postgresql@17
```

### Check Status
```bash
brew services list | grep postgresql
```

### Access Local Database
```bash
/opt/homebrew/opt/postgresql@17/bin/psql dumpster_sharing_dev
```

### Common psql Commands
```sql
\dt              -- List all tables
\d users         -- Describe users table
SELECT * FROM users;  -- Query data
\q               -- Quit
```

## Best Practices

1. **Default to Local**: Keep `.env` pointing to local database for development
2. **Test Locally First**: Always test changes on local DB before production
3. **Separate Data**: Local DB is for test data, Cloud DB is for real users
4. **Before Deployment**: Switch to `.env.production` to verify cloud connection works
5. **Never Commit .env Files**: Both `.env` and `.env.production` contain credentials

## File Reference

- `.env` - Active configuration (currently: local)
- `.env.production` - Production configuration (cloud SQL credentials)
- `.env.example` - Template for new environments
- `migrate_to_postgres.py` - Script to create schema in any PostgreSQL database

## Troubleshooting

### "Connection refused" on localhost
PostgreSQL service isn't running:
```bash
brew services start postgresql@17
```

### "Connection timeout" on cloud
Check Cloud SQL authorized networks includes your IP

### Wrong database being used
Check `DATABASE_URL` in `.env`:
```bash
grep DATABASE_URL .env
```

### Need to reset local database
```bash
/opt/homebrew/opt/postgresql@17/bin/dropdb dumpster_sharing_dev
/opt/homebrew/opt/postgresql@17/bin/createdb dumpster_sharing_dev
python migrate_to_postgres.py  # Recreate schema
```
