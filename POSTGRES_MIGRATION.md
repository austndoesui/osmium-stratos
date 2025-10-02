# PostgreSQL Migration Guide for Osmium Stratos

## Overview
This guide walks you through migrating your Osmium Stratos application from SQLite to PostgreSQL using Prisma ORM.

## Prerequisites
- PostgreSQL database (cloud-hosted)
- Database connection string from your cloud provider

## Migration Steps

### 1. Update Database Connection
Edit the `.env` file and replace the DATABASE_URL with your actual PostgreSQL connection string:

```env
DATABASE_URL="postgresql://username:password@your-host:5432/database_name?sslmode=require"
```

Example formats for popular cloud providers:
- **Supabase**: `postgresql://postgres:password@db.project.supabase.co:5432/postgres`
- **Railway**: `postgresql://postgres:password@containers-us-west-id.railway.app:port/railway`
- **Heroku**: `postgresql://user:password@hostname:5432/dbname`
- **DigitalOcean**: `postgresql://user:password@db-postgresql-region-cluster.db.ondigitalocean.com:25060/defaultdb?sslmode=require`

### 2. Run Database Migrations
After updating your DATABASE_URL, run:

```bash
npm run db:migrate
```

This will create all the necessary tables in your PostgreSQL database based on the Prisma schema.

### 3. Updated Modules
The following modules have been updated to use Prisma:

#### ✅ Completed:
- `handlers/prisma.js` - New Prisma connection handler
- `modules/settings.js` - Updated to use async/await with Prisma
- `modules/network.js` - Updated for PostgreSQL with Prisma
- `index.js` - Updated to initialize database connection
- `package.json` - Added Prisma scripts, removed SQLite dependency

#### 🔄 Need Updates (using callback-based patterns):
- `modules/hosts.js`
- `modules/auth.js` 
- `modules/audit_logs.js`
- `modules/account.js`
- `modules/2fa.js`
- `modules/image.js`
- `modules/instance.js`
- `modules/migrate.js`
- `handlers/api.js`
- `handlers/get-users.js`
- `handlers/cli.js`

### 4. Data Migration (Optional)
If you have existing data in SQLite that you want to migrate:

1. Export your SQLite data:
```bash
sqlite3 osmium.db ".dump" > data_backup.sql
```

2. Modify the SQL to be PostgreSQL compatible
3. Import into PostgreSQL

### 5. Testing the Migration
1. Update your DATABASE_URL in `.env`
2. Run `npm run db:migrate`
3. Start the application: `npm start`
4. Test basic functionality

### 6. Database Commands
- `npm run db:migrate` - Run pending migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:reset` - Reset database (⚠️ destructive)
- `npm run db:studio` - Open Prisma Studio GUI

## Key Changes Made

### Database Schema
- All SQLite tables converted to PostgreSQL-compatible Prisma models
- Foreign key relationships properly defined
- Column names mapped to camelCase for JavaScript conventions
- Date fields use proper DateTime types

### Code Changes
- Replaced SQLite3 callback-based queries with Prisma async/await
- Updated error handling to use try/catch blocks
- Maintained existing API interfaces where possible

## Next Steps
1. Provide your PostgreSQL connection string
2. Update remaining modules to use Prisma
3. Test all functionality
4. Deploy to production

## Rollback Plan
If you need to rollback:
1. Keep the old `handlers/db.js` file as backup
2. Restore SQLite dependency in package.json
3. Revert module changes

The old SQLite database handler is preserved for reference but should be removed after successful migration.