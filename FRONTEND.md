# Frontend Documentation

## Overview

The frontend is built with Next.js 16, React 19, TypeScript, and Tailwind CSS. It provides a complete admin interface for managing clients, questionnaires, and training plan recommendations.

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                    # Root layout with AuthProvider
│   ├── page.tsx                       # Home page (redirects to login/dashboard)
│   ├── login/
│   │   └── page.tsx                   # Login page
│   ├── dashboard/
│   │   └── page.tsx                   # Dashboard with client overview
│   └── clients/
│       ├── page.tsx                   # Client list
│       ├── new/
│       │   └── page.tsx               # Create new client
│       └── [id]/
│           ├── page.tsx              # Client detail page
│           ├── questionnaire/
│           │   └── page.tsx          # Questionnaire form
│           └── recommendations/
│               └── [recId]/
│                   └── page.tsx       # Recommendation view/edit
├── src/
│   ├── lib/
│   │   └── api.ts                     # API client and type definitions
│   ├── contexts/
│   │   └── AuthContext.tsx            # Authentication context
│   └── components/
│       ├── Navbar.tsx                 # Navigation component
│       └── ProtectedRoute.tsx        # Route protection wrapper
```

## Features

### 1. Authentication
- **Login Page** (`/login`) - Admin authentication
- **Auth Context** - Global authentication state management
- **Protected Routes** - Automatic redirect to login if not authenticated
- **JWT Token Management** - Stored in localStorage

### 2. Dashboard
- **Overview** (`/dashboard`) - Shows total clients and recent client list
- **Quick Actions** - Link to create new clients
- **Client Cards** - Display client info with links to detail pages

### 3. Client Management
- **Client List** (`/clients`) - View all clients
- **Create Client** (`/clients/new`) - Form to add new clients
- **Client Detail** (`/clients/[id]`) - View client info, questionnaire, and recommendations
  - Shows client information
  - Links to questionnaire
  - Displays existing recommendations
  - Button to generate new recommendations

### 4. Questionnaire
- **Questionnaire Form** (`/clients/[id]/questionnaire`) - Comprehensive form with:
  - Goals & Experience
  - Training Preferences (days per week, session length, time preferences)
  - Lifestyle Factors (activity level, stress, sleep, nutrition)
  - Health & Safety (injury history, medical conditions)
  - Additional Notes

### 5. Recommendations
- **Recommendation View** (`/clients/[id]/recommendations/[recId]`) - Display and edit:
  - Client type classification
  - Sessions per week and length
  - Training style
  - AI reasoning
  - 6-week plan structure (JSON)
  - Status management (draft, approved, active, completed)
  - Edit functionality with save

## API Integration

All API calls are handled through the `apiClient` in `src/lib/api.ts`:

- **Authentication**: `authApi.login()`, `authApi.getMe()`, `authApi.logout()`
- **Clients**: `clientsApi.getAll()`, `clientsApi.create()`, etc.
- **Questionnaires**: `questionnairesApi.getByClientId()`, `questionnairesApi.create()`, etc.
- **Recommendations**: `recommendationsApi.generateFromQuestionnaire()`, `recommendationsApi.update()`, etc.

## Environment Variables

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

For production, set this to your backend API URL.

## Getting Started

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Set up environment variables (see above)

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Workflow

1. **Login** - Admin logs in with email/password
2. **Dashboard** - View all clients
3. **Create Client** - Add new client profile
4. **Fill Questionnaire** - Complete client questionnaire
5. **Generate Recommendation** - AI creates 6-week training plan
6. **Edit & Save** - Admin can modify and save recommendations
7. **View Plans** - Access all recommendations for a client

## Styling

The app uses Tailwind CSS with a clean, modern design:
- Indigo color scheme for primary actions
- Responsive grid layouts
- Card-based components
- Form inputs with proper focus states
- Status badges for recommendations

## Next Steps

Potential enhancements:
- Client search/filter functionality
- Export recommendations to PDF
- Calendar view for training sessions
- Progress tracking
- Client communication features

