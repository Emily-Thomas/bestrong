# Database Migration and Seeding Specification

## Overview

This document defines the database migration and seeding strategy for BeStrong, following industry best practices for version control, idempotency, and deployment automation.

## Core Principles

1. **Versioned Migrations**: Each migration is a separate file with a unique version identifier
2. **Migration Tracking**: A `schema_migrations` table tracks which migrations have been applied
3. **Idempotency**: All migrations must be safe to run multiple times
4. **Separation of Concerns**: Migrations (schema changes) are separate from seeds (data)
5. **Rollback Support**: Migrations should support both up and down operations (where possible)
6. **Transaction Safety**: Each migration runs in a transaction when possible

## Directory Structure

```
backend/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_workouts_table.sql
│   ├── 003_add_recommendation_jobs_table.sql
│   └── ... (future migrations)
├── seeds/
│   ├── development/
│   │   ├── 001_seed_admin_users.sql
│   │   └── ... (dev-only seeds)
│   └── production/
│       └── (production seeds, if any)
└── scripts/
    ├── migrate.ts              # Local development migration runner
    ├── migrate-vercel.ts       # Vercel production migration runner
    ├── seed.ts                 # Local development seed runner
    └── rollback.ts             # Rollback utility (optional, for future)
```

## Migration File Naming Convention

**Format**: `{sequence}_{description}.sql`

- **Sequence**: 3-digit zero-padded number (001, 002, 003, ...)
- **Description**: Snake_case description of what the migration does
- **Examples**:
  - `001_initial_schema.sql`
  - `002_add_workouts_table.sql`
  - `003_add_recommendation_jobs_table.sql`
  - `004_add_index_to_recommendations.sql`

## Migration File Structure

Each migration file should follow this structure:

```sql
-- Migration: 002_add_workouts_table
-- Description: Creates the workouts table for storing individual workout sessions
-- Created: 2024-01-15
-- Author: System

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  session_number INTEGER NOT NULL,
  workout_name VARCHAR(255),
  workout_data JSONB NOT NULL,
  workout_reasoning TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recommendation_id, week_number, session_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workouts_recommendation_id ON workouts(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_workouts_week_session ON workouts(recommendation_id, week_number, session_number);

-- Create trigger (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
    CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;
```

### Migration Requirements

1. **Idempotency**: Use `IF NOT EXISTS`, `DROP ... IF EXISTS`, etc.
2. **Transaction Wrappers**: Wrap in `BEGIN;` and `COMMIT;` for atomicity
3. **Header Comments**: Include migration number, description, date, author
4. **Dependency Checks**: Check for prerequisites (e.g., functions, tables) before using them
5. **No Data Changes**: Migrations should only change schema, not data (use seeds for data)

## Schema Migrations Table

A `schema_migrations` table tracks which migrations have been applied:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64), -- Optional: hash of migration file for verification
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);
```

## Migration Runner Implementation

### Local Development (`scripts/migrate.ts`)

**Purpose**: Run migrations in local development environment

**Behavior**:
1. Connect to database using `.env` file
2. Ensure `schema_migrations` table exists
3. Read all migration files from `migrations/` directory
4. Sort migrations by sequence number
5. For each migration:
   - Check if already applied (exists in `schema_migrations`)
   - If not applied:
     - Execute migration SQL
     - Record in `schema_migrations` table
     - Log success
   - If already applied:
     - Skip (idempotent)
6. Report summary of applied/skipped migrations

**Error Handling**:
- If migration fails, rollback transaction (if supported)
- Log detailed error information
- Exit with non-zero code

### Production/Vercel (`scripts/migrate-vercel.ts`)

**Purpose**: Run migrations during Vercel deployment

**Behavior**:
1. Connect to database using Vercel environment variables
2. Ensure `schema_migrations` table exists
3. Read all migration files from `migrations/` directory
4. Sort migrations by sequence number
5. For each migration:
   - Check if already applied
   - If not applied:
     - Execute migration SQL
     - Record in `schema_migrations` table
     - Log success
   - If already applied:
     - Skip (idempotent)
6. Report summary
7. **DO NOT RUN SEEDS** (seeds are separate)

**Error Handling**:
- Fail deployment if migration fails
- Log detailed error information
- Exit with non-zero code to prevent deployment

## Seeding Strategy

### Separation from Migrations

**Migrations** = Schema changes (tables, indexes, triggers, functions)
**Seeds** = Initial or test data (admin users, sample data, etc.)

### Seed File Structure

```
seeds/
├── development/
│   ├── 001_seed_admin_users.sql
│   └── 002_seed_sample_clients.sql
└── production/
    └── (empty or minimal production seeds)
```

### Seed File Format

```sql
-- Seed: 001_seed_admin_users
-- Environment: development
-- Description: Creates initial admin users for local development
-- Created: 2024-01-15

BEGIN;

-- Only insert if admin_users table is empty (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1) THEN
    INSERT INTO admin_users (email, password_hash, first_name, last_name)
    VALUES 
      ('admin@example.com', '$2a$10$...', 'Admin', 'User'),
      ('test@example.com', '$2a$10$...', 'Test', 'User');
  END IF;
END $$;

COMMIT;
```

### Seed Runner (`scripts/seed.ts`)

**Purpose**: Populate database with initial/test data

**Behavior**:
1. Check environment variable `NODE_ENV`
2. If `NODE_ENV=production`:
   - **DO NOT RUN SEEDS** (fail with error message)
3. If `NODE_ENV=development` or not set:
   - Read seed files from `seeds/development/`
   - Sort by sequence number
   - Execute each seed file
   - Log results

**Safety**:
- Never run seeds in production automatically
- Seeds should be idempotent (check before inserting)
- Seeds should be reversible (can be manually deleted)

## Turbo Configuration

### Update `turbo.json`

Add migration tasks:

```json
{
  "tasks": {
    "migrate": {
      "cache": false,
      "outputs": [],
      "env": [
        "NODE_ENV",
        "POSTGRES_URL",
        "POSTGRES_PRISMA_URL",
        "POSTGRES_URL_NON_POOLING",
        "POSTGRES_HOST",
        "POSTGRES_PORT",
        "POSTGRES_DATABASE",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD"
      ]
    },
    "migrate:vercel": {
      "cache": false,
      "outputs": [],
      "env": [
        "NODE_ENV",
        "POSTGRES_URL",
        "POSTGRES_PRISMA_URL",
        "POSTGRES_URL_NON_POOLING",
        "POSTGRES_HOST",
        "POSTGRES_PORT",
        "POSTGRES_DATABASE",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "VERCEL",
        "VERCEL_URL"
      ]
    },
    "seed": {
      "cache": false,
      "outputs": [],
      "env": [
        "NODE_ENV",
        "POSTGRES_URL",
        "POSTGRES_PRISMA_URL",
        "POSTGRES_URL_NON_POOLING",
        "POSTGRES_HOST",
        "POSTGRES_PORT",
        "POSTGRES_DATABASE",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD"
      ]
    }
  }
}
```

## Vercel Configuration

### Update `vercel.json`

```json
{
  "version": 2,
  "buildCommand": "turbo run build && turbo run migrate:vercel --filter=backend",
  "framework": "nextjs",
  "outputDirectory": "frontend/.next",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    }
  ]
}
```

**Key Points**:
- Migrations run **after** build but **before** deployment
- If migrations fail, deployment is aborted
- Seeds are **never** run in production

## Package.json Scripts

### Update `backend/package.json`

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    
    "migrate": "tsx scripts/migrate.ts",
    "migrate:vercel": "tsx scripts/migrate-vercel.ts",
    "migrate:status": "tsx scripts/migrate-status.ts",
    
    "seed": "tsx scripts/seed.ts",
    "seed:dev": "NODE_ENV=development tsx scripts/seed.ts",
    
    "db:reset": "tsx scripts/reset-db.ts",
    "db:status": "tsx scripts/migrate-status.ts"
  }
}
```

## Migration Workflow

### Creating a New Migration

1. **Create migration file**:
   ```bash
   # Determine next sequence number
   ls -1 backend/migrations/ | tail -1
   
   # Create new file: backend/migrations/004_description.sql
   ```

2. **Write migration SQL**:
   - Use idempotent statements
   - Wrap in transaction
   - Include header comments
   - Test locally

3. **Test locally**:
   ```bash
   npm run migrate
   ```

4. **Commit to version control**:
   ```bash
   git add backend/migrations/004_description.sql
   git commit -m "Add migration: 004_description"
   ```

5. **Deploy**:
   - Push to main branch
   - Vercel automatically runs migrations during build

### Migration Status

Check which migrations have been applied:

```bash
npm run migrate:status
```

This should show:
- List of all migration files
- Which ones have been applied
- When they were applied
- Any pending migrations

## Rollback Strategy

### Manual Rollback

For now, rollbacks are manual:

1. Create a new migration that reverses the changes
2. Use sequence number higher than the migration to rollback
3. Example: To rollback `004_add_column.sql`, create `005_remove_column.sql`

### Future: Automated Rollback

Future enhancement could include:
- Down migrations (reverse SQL)
- `npm run migrate:rollback` command
- Rollback to specific version

## Best Practices Checklist

### When Writing Migrations

- [ ] Use `IF NOT EXISTS` / `DROP ... IF EXISTS` for idempotency
- [ ] Wrap in transaction (`BEGIN;` / `COMMIT;`)
- [ ] Include header comments (version, description, date)
- [ ] Check for dependencies before using them
- [ ] Test locally before committing
- [ ] Keep migrations small and focused (one logical change per migration)
- [ ] Never modify existing migration files (create new ones instead)

### When Writing Seeds

- [ ] Check if data exists before inserting (idempotent)
- [ ] Only include development/test data
- [ ] Never include production secrets or sensitive data
- [ ] Document what the seed does
- [ ] Make seeds reversible (can be manually deleted)

### Deployment

- [ ] Migrations run automatically on Vercel deployment
- [ ] Seeds never run in production
- [ ] Migration failures prevent deployment
- [ ] All migrations are tracked in `schema_migrations` table

## Migration Examples

### Example 1: Adding a Table

```sql
-- Migration: 002_add_workouts_table
-- Description: Creates the workouts table for storing individual workout sessions
-- Created: 2024-01-15

BEGIN;

CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  session_number INTEGER NOT NULL,
  workout_name VARCHAR(255),
  workout_data JSONB NOT NULL,
  workout_reasoning TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recommendation_id, week_number, session_number)
);

CREATE INDEX IF NOT EXISTS idx_workouts_recommendation_id ON workouts(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_workouts_week_session ON workouts(recommendation_id, week_number, session_number);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
    CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;
```

### Example 2: Adding a Column

```sql
-- Migration: 005_add_status_to_recommendations
-- Description: Adds status column to recommendations table
-- Created: 2024-01-20

BEGIN;

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recommendations' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE recommendations ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;
END $$;

-- Create index on new column
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);

COMMIT;
```

### Example 3: Adding an Index

```sql
-- Migration: 006_add_index_to_questionnaires
-- Description: Adds index on client_id for faster lookups
-- Created: 2024-01-25

BEGIN;

CREATE INDEX IF NOT EXISTS idx_questionnaires_client_id ON questionnaires(client_id);

COMMIT;
```

## Error Handling

### Migration Failures

1. **Local Development**:
   - Log detailed error
   - Show which migration failed
   - Exit with error code
   - Developer fixes and re-runs

2. **Production/Vercel**:
   - Log detailed error
   - Show which migration failed
   - Exit with error code (prevents deployment)
   - Alert team via logs
   - Fix migration and redeploy

### Partial Migrations

- Each migration runs in a transaction
- If migration fails, transaction is rolled back
- `schema_migrations` table is not updated
- Migration can be fixed and re-run

## Testing Strategy

### Local Testing

1. **Test on clean database**:
   ```bash
   npm run db:reset  # Drops and recreates schema
   npm run migrate   # Runs all migrations
   ```

2. **Test idempotency**:
   ```bash
   npm run migrate   # Run twice, should skip already-applied migrations
   ```

3. **Test individual migration**:
   - Create test database
   - Run migration manually
   - Verify schema changes

### Production Testing

1. **Staging environment**: Test migrations on staging before production
2. **Backup**: Always backup production database before migrations
3. **Monitor**: Watch deployment logs for migration status
4. **Rollback plan**: Have plan to revert if migration fails

## Migration Status Tracking

The `schema_migrations` table provides:
- Audit trail of all applied migrations
- Ability to check migration status
- Prevention of duplicate migrations
- Historical record of schema changes

## Summary

This specification provides:
- ✅ Versioned, sequential migrations
- ✅ Migration tracking and idempotency
- ✅ Separation of migrations and seeds
- ✅ Automated migration on Vercel deployment
- ✅ Safety checks (no seeds in production)
- ✅ Clear workflow for creating and applying migrations
- ✅ Best practices for database schema management

