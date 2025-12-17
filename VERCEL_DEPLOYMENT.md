# Vercel Deployment Guide

This guide explains how to deploy the BeStrong application to Vercel with both frontend and backend, including database setup and migrations.

## Prerequisites

1. A Vercel account
2. Vercel CLI installed (optional, for local testing)
3. A Supabase database (recommended) or other PostgreSQL database

## Setup Steps

### 1. Create Supabase Database

1. Go to [Supabase](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details:
   - **Name**: Your project name (e.g., `bestrong`)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select a region close to your users
4. Wait for the project to be created (takes a few minutes)
5. Once created, go to **Project Settings** → **Database**
6. Find the **Connection string** section
7. Copy the **URI** connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`)

### 2. Set Environment Variables in Vercel

In your Vercel project settings, add the following environment variables:

#### Required Variables

- `DATABASE_URL` or `SUPABASE_URL` - Your Supabase connection string (from step 1)
  - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
  - Replace `[PASSWORD]` with your database password
  - Replace `[PROJECT-REF]` with your Supabase project reference
- `JWT_SECRET` - A secure random string for JWT token signing (generate with: `openssl rand -base64 32`)
- `FRONTEND_URL` - Your frontend URL (e.g., `https://your-app.vercel.app`)

#### Alternative: Individual Connection Parameters

If you prefer to use individual parameters instead of a connection string:

- `POSTGRES_HOST` - Database host (e.g., `db.xxxxx.supabase.co`)
- `POSTGRES_PORT` - Database port (usually `5432`)
- `POSTGRES_DATABASE` - Database name (usually `postgres`)
- `POSTGRES_USER` - Database user (usually `postgres`)
- `POSTGRES_PASSWORD` - Your database password

#### Example Environment Variables

```bash
# Using connection string (recommended)
POSTGRES_URL=postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres

# Or using individual parameters
POSTGRES_HOST=db.xxxxx.supabase.co
POSTGRES_PORT=5432
POSTGRES_DATABASE=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password

# Other required variables
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

**Note**: Supabase provides `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, and `POSTGRES_URL_NON_POOLING`. The application will use whichever is available.

### 3. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your repository
5. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: Leave empty (or set to `frontend` if needed)
   - **Build Command**: `npm run build:vercel && npm run migrate:vercel`
   - **Output Directory**: `frontend/.next`
   - **Install Command**: `npm install && cd frontend && npm install && cd ../backend && npm install`
6. Add all environment variables
7. Click "Deploy"

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

### 4. Verify Deployment

After deployment:

1. Check the deployment logs to ensure migrations ran successfully
2. Visit `https://your-app.vercel.app/api/health` - should return `{"status":"ok","message":"Backend is running"}`
3. Visit `https://your-app.vercel.app/api/api` - should return `{"message":"Backend API is working"}`
4. Test the login page at `https://your-app.vercel.app/login`

## Project Structure

```
bestrong/
├── api/
│   └── index.ts              # Vercel serverless function handler
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts    # Database config (supports Supabase)
│   │   └── ...
│   └── scripts/
│       └── migrate-vercel.ts   # Migration script for Vercel
├── frontend/
│   └── ...
└── vercel.json                # Vercel configuration
```

## How It Works

### Backend as Serverless Functions

The Express backend is wrapped in a Vercel serverless function at `api/index.ts`. All requests to `/api/*` are routed to this function, which:

1. Initializes the database connection (supports Supabase and external PostgreSQL)
2. Runs migrations on first request (cached for subsequent requests)
3. Handles all API routes through Express

### Database Migrations

Migrations run automatically during the build process via the `buildCommand` in `vercel.json`:

```json
"buildCommand": "npm run build:vercel && npm run migrate:vercel"
```

The `migrate:vercel` script:
- Detects if `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, or `POSTGRES_URL_NON_POOLING` is set (connection string) or uses individual `POSTGRES_*` variables
- Connects to the database (Supabase requires SSL)
- Runs the schema migrations from `backend/src/db/schema.sql`

### Frontend Configuration

The frontend automatically detects the API URL:
- In production: Uses `NEXT_PUBLIC_API_URL` if set, otherwise uses relative `/api` paths
- The API client in `frontend/src/lib/api.ts` defaults to `/api` which works with Vercel rewrites

## Troubleshooting

### Database Connection Issues

1. **Check environment variables**: Ensure `POSTGRES_URL` (or individual `POSTGRES_*` variables) is set correctly
2. **Verify database exists**: Check your Supabase project dashboard
3. **Check connection string format**: Should be `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`
4. **Verify SSL**: Supabase requires SSL connections (automatically handled)
5. **Check password**: Make sure the password in the connection string matches your Supabase database password
6. **Check variable names**: Use Supabase standard names: `POSTGRES_URL`, `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`

### Migration Failures

1. Check build logs for migration errors
2. Ensure database is accessible from Vercel
3. Verify schema.sql file is correct
4. Check that tables don't already exist (migrations handle this gracefully)

### API Not Working

1. Check that `/api/health` endpoint works
2. Verify CORS settings in `api/index.ts`
3. Check that `FRONTEND_URL` environment variable is set correctly
4. Review Vercel function logs for errors

### Build Failures

1. Ensure all dependencies are installed
2. Check TypeScript compilation errors
3. Verify all environment variables are set
4. Review build logs in Vercel dashboard

## Seeding Initial Data

To seed initial admin users after deployment:

1. Create a Vercel serverless function for seeding, or
2. Use Vercel's CLI to run the seed script:

```bash
vercel env pull .env.local
cd backend
npm run seed:admins
```

Or create a one-time API endpoint for seeding (remove after use for security).

## Monitoring

- **Function Logs**: Check Vercel dashboard → Your Project → Functions → View Logs
- **Database**: Vercel Storage dashboard shows database metrics
- **Analytics**: Vercel Analytics provides performance insights

## Updating the Application

1. Push changes to your repository
2. Vercel automatically triggers a new deployment
3. Migrations run automatically during build
4. New version goes live after successful build

## Security Notes

- Never commit `.env` files or secrets
- Use Vercel's environment variables for all secrets
- Rotate `JWT_SECRET` regularly
- Enable Vercel's security features (DDoS protection, etc.)
- Review and update CORS settings for production

