# Deployment Setup Summary

This document summarizes the Vercel deployment configuration for the BeStrong application.

## What Was Configured

### 1. Vercel Configuration (`vercel.json`)
- Configured monorepo structure with frontend and backend
- Set up API rewrites to route `/api/*` requests to the serverless function
- Configured build command to run migrations automatically
- Set Node.js 20.x runtime for serverless functions

### 2. Serverless Function (`api/index.ts`)
- Created Express app wrapper for Vercel serverless functions
- Handles all API routes from the backend
- Automatically initializes database on first request
- Runs migrations if database is not initialized
- Configured CORS to support Vercel preview deployments

### 3. Database Configuration (`backend/src/config/database.ts`)
- Updated to support Supabase standard connection strings (`POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`)
- Falls back to individual Supabase standard parameters (`POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`)
- Handles SSL configuration for Supabase (required)

### 4. Migration Script (`backend/scripts/migrate-vercel.ts`)
- Created Vercel-specific migration script
- Supports both Vercel Postgres and external PostgreSQL
- Runs automatically during build process

### 5. Frontend API Configuration (`frontend/src/lib/api.ts`)
- Updated to use relative paths in production (same domain)
- Falls back to localhost for development
- Supports `NEXT_PUBLIC_API_URL` environment variable override

### 6. Build Scripts
- Added `build:vercel` script to build both frontend and backend
- Added `migrate:vercel` script for database migrations
- Integrated migrations into Vercel build process

## File Structure

```
bestrong/
├── api/
│   └── index.ts                    # Vercel serverless function handler
├── backend/
│   ├── src/
│   │   └── config/
│   │       └── database.ts         # Updated for Supabase
│   └── scripts/
│       └── migrate-vercel.ts       # Vercel migration script
├── frontend/
│   └── src/
│       └── lib/
│           └── api.ts              # Updated API client
├── vercel.json                     # Vercel configuration
├── .vercelignore                   # Files to ignore in deployment
├── docs/
│   ├── VERCEL_DEPLOYMENT.md        # Detailed deployment guide
│   └── DEPLOYMENT_SUMMARY.md       # This file
└── README.md                        # Project README
```

## Environment Variables Required

### Production (Vercel with Supabase)
- `POSTGRES_URL` - Supabase connection string (recommended - provided by Supabase)
- Or `POSTGRES_PRISMA_URL` or `POSTGRES_URL_NON_POOLING` (alternative connection strings from Supabase)
- Or individual parameters: `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Your frontend URL (optional, defaults to Vercel URL)
- `NODE_ENV` - Set to `production`

### Alternative (External PostgreSQL)
- `POSTGRES_URL` - Connection string, or
- Individual parameters: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Your frontend URL

## Deployment Process

1. **Set up Vercel Postgres** (or configure external database)
2. **Add environment variables** in Vercel dashboard
3. **Deploy** via Vercel dashboard or CLI
4. **Migrations run automatically** during build
5. **Application is live** after successful deployment

## How It Works

1. **Build Phase**:
   - Installs dependencies for root, frontend, and backend
   - Builds TypeScript backend code
   - Builds Next.js frontend
   - Runs database migrations

2. **Runtime**:
   - Frontend serves static pages and handles client-side routing
   - API requests to `/api/*` are routed to the serverless function
   - Serverless function wraps Express app and handles all API routes
   - Database is initialized on first request (cached for subsequent requests)

3. **Database**:
   - Supports Supabase (via `POSTGRES_URL` or individual `POSTGRES_*` parameters) - recommended
   - Supports external PostgreSQL (via connection string or individual parameters)
   - Migrations run during build to ensure schema is up to date
   - SSL automatically configured for Supabase connections

## Next Steps

1. Create a Vercel account and project
2. Set up Supabase database (see docs/VERCEL_DEPLOYMENT.md for details)
3. Add environment variables (DATABASE_URL or SUPABASE_URL)
4. Deploy the application
5. Verify deployment by checking:
   - `/api/health` endpoint
   - `/api/api` endpoint
   - Login page functionality

See `docs/VERCEL_DEPLOYMENT.md` for detailed deployment instructions.

