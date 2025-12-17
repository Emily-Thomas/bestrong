# Vercel Deployment Guide

This guide explains how to deploy the BeStrong application to Vercel with both frontend and backend, including database setup and migrations.

## Prerequisites

1. A Vercel account
2. Vercel CLI installed (optional, for local testing)
3. A Vercel Postgres database (or external PostgreSQL database)

## Setup Steps

### 1. Create Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" and select "Postgres"
4. Choose a name for your database (e.g., `bestrong-db`)
5. Select a region close to your users
6. Vercel will automatically create the following environment variables:
   - `POSTGRES_URL` - Connection string for the database
   - `POSTGRES_PRISMA_URL` - Prisma-compatible connection string
   - `POSTGRES_URL_NON_POOLING` - Direct connection string

### 2. Set Environment Variables

In your Vercel project settings, add the following environment variables:

#### Required Variables

- `POSTGRES_URL` - Automatically set by Vercel Postgres (or set manually if using external DB)
- `JWT_SECRET` - A secure random string for JWT token signing (generate with: `openssl rand -base64 32`)
- `FRONTEND_URL` - Your frontend URL (e.g., `https://your-app.vercel.app`)

#### Optional Variables (for external PostgreSQL)

If you're using an external PostgreSQL database instead of Vercel Postgres:

- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

#### Example Environment Variables

```bash
POSTGRES_URL=postgres://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

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
│   │   │   └── database.ts    # Database config (supports Vercel Postgres)
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

1. Initializes the database connection (supports both Vercel Postgres and external PostgreSQL)
2. Runs migrations on first request (cached for subsequent requests)
3. Handles all API routes through Express

### Database Migrations

Migrations run automatically during the build process via the `buildCommand` in `vercel.json`:

```json
"buildCommand": "npm run build:vercel && npm run migrate:vercel"
```

The `migrate:vercel` script:
- Detects if `POSTGRES_URL` is set (Vercel Postgres) or uses individual DB variables
- Connects to the database
- Runs the schema migrations from `backend/src/db/schema.sql`

### Frontend Configuration

The frontend automatically detects the API URL:
- In production: Uses `NEXT_PUBLIC_API_URL` if set, otherwise uses relative `/api` paths
- The API client in `frontend/src/lib/api.ts` defaults to `/api` which works with Vercel rewrites

## Troubleshooting

### Database Connection Issues

1. **Check environment variables**: Ensure `POSTGRES_URL` is set correctly
2. **Verify database exists**: Check Vercel Storage dashboard
3. **Check connection string format**: Should be `postgres://user:password@host:port/database`

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

