# Bestrong Application Architecture

## Overview

This application helps gym owners streamline the process of creating personalized workout plans for new clients. The workflow involves:

1. **Admin Authentication** - Secure login for gym owners/trainers
2. **Client Management** - Create and manage client profiles
3. **Questionnaire** - Collect client goals, preferences, and lifestyle factors
4. **AI Recommendation** - Generate a 6-week training plan based on client type
5. **Edit & Save** - Modify and save recommendations to client profiles

## Database Schema

### Tables

#### `admin_users`
- Stores gym owners/trainers who can access the system
- Fields: id, email, password_hash, name, timestamps

#### `clients`
- Stores client information
- Fields: id, first_name, last_name, email, phone, date_of_birth, created_by, timestamps

#### `questionnaires`
- Stores client questionnaire responses
- Fields: goals, experience_level, training preferences, lifestyle factors, etc.
- Links to: client_id, filled_by (admin)

#### `recommendations`
- Stores AI-generated 6-week training plans
- Fields: client_type, sessions_per_week, session_length_minutes, training_style, plan_structure (JSONB), ai_reasoning, status
- Links to: client_id, questionnaire_id, created_by

#### `recommendation_edits`
- Tracks modifications made to AI recommendations
- Stores edit history for audit purposes

## Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # PostgreSQL connection pool
│   ├── db/
│   │   ├── schema.sql           # Database schema
│   │   └── migrations.ts        # Migration runner
│   ├── middleware/
│   │   └── auth.ts              # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.routes.ts           # Authentication endpoints
│   │   ├── client.routes.ts         # Client CRUD endpoints
│   │   ├── questionnaire.routes.ts   # Questionnaire endpoints
│   │   └── recommendation.routes.ts   # Recommendation endpoints
│   ├── services/
│   │   ├── auth.service.ts          # Authentication business logic
│   │   ├── client.service.ts        # Client business logic
│   │   ├── questionnaire.service.ts # Questionnaire business logic
│   │   ├── recommendation.service.ts # Recommendation business logic
│   │   └── ai.service.ts            # AI recommendation generation
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   └── index.ts                 # Express app entry point
└── scripts/
    └── migrate.ts               # Standalone migration script
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create new admin user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (protected)

### Clients (`/api/clients`)
All routes require authentication via Bearer token.

- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Questionnaires (`/api/questionnaires`)
All routes require authentication via Bearer token.

- `GET /api/questionnaires/:id` - Get questionnaire by ID
- `GET /api/questionnaires/client/:clientId` - Get questionnaire by client ID
- `POST /api/questionnaires` - Create new questionnaire
- `PUT /api/questionnaires/:id` - Update questionnaire
- `DELETE /api/questionnaires/:id` - Delete questionnaire

### Recommendations (`/api/recommendations`)
All routes require authentication via Bearer token.

- `POST /api/recommendations/generate/:questionnaireId` - Generate recommendation from questionnaire
- `POST /api/recommendations/generate/client/:clientId` - Generate recommendation from client (uses latest questionnaire)
- `GET /api/recommendations/:id` - Get recommendation by ID
- `GET /api/recommendations/client/:clientId` - Get all recommendations for a client
- `PUT /api/recommendations/:id` - Update/edit recommendation (saves edit history)
- `DELETE /api/recommendations/:id` - Delete recommendation

## Authentication Flow

1. Admin registers or logs in via `/api/auth/login`
2. Server returns JWT token
3. Client includes token in `Authorization: Bearer <token>` header
4. Protected routes verify token via `authenticateToken` middleware

## AI Recommendation System

The application includes an AI recommendation engine that analyzes questionnaire responses to determine client type and generate personalized 6-week training plans.

### Client Types (Stereotypes)

1. **Beginner Weight Loss Seeker** - New to fitness, weight loss focus
2. **Intermediate Strength Builder** - Some experience, strength/muscle goals
3. **Busy Professional** - Limited time, high stress, needs efficiency
4. **Injury Recovery Client** - Has injury history, needs careful programming
5. **Performance Athlete** - Advanced level, performance optimization
6. **Lifestyle Balancer** - Moderate goals, sustainable routine

### Recommendation Generation

The system analyzes:
- Experience level
- Primary/secondary goals
- Available time (days per week, session length)
- Lifestyle factors (stress, sleep, activity level)
- Injury/medical history
- Equipment access

Based on this analysis, it generates:
- Client type classification
- Sessions per week
- Session length (minutes)
- Training style
- 6-week plan structure (stored as JSONB)
- AI reasoning/explanation

### Edit Tracking

When admins modify recommendations:
- Original recommendation is marked as `is_edited = true`
- Edit history is saved to `recommendation_edits` table
- Full audit trail maintained

**Note:** Currently uses rule-based system. Ready for integration with OpenAI, Anthropic, or other AI services.

## Next Steps

1. **Frontend Pages**
   - Login page
   - Dashboard
   - Client list
   - Client detail page
   - Questionnaire form
   - Recommendation view/edit

2. **AI Service Integration** (Optional Enhancement)
   - Replace rule-based system with actual AI API
   - Add OpenAI/Anthropic integration
   - Enhance client type classification
   - Improve plan generation quality

## Environment Variables

Required in `backend/.env`:
- `PORT` - Server port (default: 3001)
- `POSTGRES_URL` - PostgreSQL connection string (recommended - Supabase format)
- Or individual parameters:
  - `POSTGRES_HOST` - PostgreSQL host
  - `POSTGRES_PORT` - PostgreSQL port (default: 5432)
  - `POSTGRES_DATABASE` - Database name
  - `POSTGRES_USER` - Database user
  - `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - Secret key for JWT tokens

## Running Migrations

```bash
cd backend
npm run migrate
```

Migrations run automatically on server startup, but you can also run them manually.

