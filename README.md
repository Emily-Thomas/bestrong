# bestrong

Gym Management Application

## Tech Stack

- **Frontend**: Next.js 16 with React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL
- **Linting & Formatting**: Biome
- **Pre-commit Hooks**: Husky with lint-staged
- **Deployment**: Vercel

## Project Structure

```
bestrong/
├── frontend/          # Next.js frontend application
├── backend/           # Express backend API
├── .husky/           # Git hooks
└── vercel.json       # Vercel deployment configuration
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

## Setup Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Database Setup

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE bestrong;
   ```

2. Copy the environment example file:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. Update `backend/.env` with your database credentials:
   ```
   PORT=3001
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DATABASE=postgres
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password_here
   
   # Or use a connection string:
   # POSTGRES_URL=postgresql://postgres:password@localhost:5432/postgres
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   ```

4. Run database migrations:
   ```bash
   cd backend
   npm run migrate
   ```

5. Seed initial admin users:
   ```bash
   cd backend
   npm run seed:admins
   ```
   
   This creates two admin accounts:
   - **matt@bestrong.com** / password: `bestrong`
   - **emily@bestrong.com** / password: `bestrong`

### 3. Development

Start all services with the development script (recommended):

```bash
npm run dev
```

This script will:
- ✅ Check if PostgreSQL is running
- ✅ Verify backend/.env exists
- ✅ Start both frontend and backend services
- 📍 Display service URLs

**Alternative:** Run services separately or use the simple concurrent command:

```bash
# Simple concurrent start (no checks)
npm run dev:simple

# Or run them separately:

```bash
# Frontend (runs on http://localhost:3000)
cd frontend && npm run dev

# Backend (runs on http://localhost:3001)
cd backend && npm run dev
```

### 4. Building for Production

```bash
npm run build
```

## Code Quality

### Biome

This project uses [Biome](https://biomejs.dev/) for linting and formatting.

**Frontend:**
```bash
cd frontend
npm run check          # Check for linting and formatting issues
npm run check:fix      # Auto-fix issues
npm run lint           # Lint only
npm run format         # Format code
```

**Backend:**
```bash
cd backend
npm run check          # Check for linting and formatting issues
npm run check:fix      # Auto-fix issues
npm run lint           # Lint only
npm run format         # Format code
```

**Root (both projects):**
```bash
npm run lint           # Check both projects
npm run lint:fix       # Fix both projects
npm run format         # Format both projects
```

### Pre-commit Hooks

Husky is configured to run Biome checks on staged files before each commit. The pre-commit hook will automatically format and lint your code.

## Deployment to Vercel

### Prerequisites

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

### Deploy

1. From the project root:
   ```bash
   vercel
   ```

2. Follow the prompts to link your project or create a new one.

3. Add environment variables in the Vercel dashboard:
   - `POSTGRES_URL` (recommended - connection string from Supabase)
   - Or individual parameters: `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`

### Vercel Configuration

The project includes `vercel.json` at the root level configured for:
- Next.js frontend deployment
- Node.js backend API routes
- Route proxying from `/api/*` to the backend

## Available Scripts

### Root Level
- `npm run dev` - Run both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run lint` - Lint both projects
- `npm run lint:fix` - Fix linting issues in both projects
- `npm run format` - Format code in both projects

### Frontend
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run Biome checks
- `npm run check:fix` - Auto-fix Biome issues
- `npm run lint` - Lint code
- `npm run format` - Format code

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run check` - Run Biome checks
- `npm run check:fix` - Auto-fix Biome issues
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run type-check` - Type check without emitting files

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 3001)
- `POSTGRES_URL` - PostgreSQL connection string (recommended - Supabase format)
- Or individual parameters:
  - `POSTGRES_HOST` - PostgreSQL host
  - `POSTGRES_PORT` - PostgreSQL port (default: 5432)
  - `POSTGRES_DATABASE` - Database name
  - `POSTGRES_USER` - Database user
  - `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - Secret key for JWT token signing

## License

ISC
