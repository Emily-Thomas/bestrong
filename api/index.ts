import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { runMigrations, testConnection } from '../backend/src/db/migrations';
import authRoutes from '../backend/src/routes/auth.routes';
import clientRoutes from '../backend/src/routes/client.routes';
import questionnaireRoutes from '../backend/src/routes/questionnaire.routes';
import recommendationRoutes from '../backend/src/routes/recommendation.routes';

// Create Express app
const app = express();

// Middleware - CORS configuration
// Support multiple origins for Vercel preview deployments
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];
  
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  
  // Add preview deployment URLs
  if (process.env.VERCEL) {
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    const project = process.env.VERCEL_PROJECT_NAME;
    if (branch && project) {
      origins.push(`https://${project}-git-${branch}-${process.env.VERCEL_ORG_ID}.vercel.app`);
    }
  }
  
  // Default to localhost for development
  if (origins.length === 0) {
    origins.push('http://localhost:3000');
  }
  
  return origins;
};

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// API routes
app.get('/api', (_req, res) => {
  res.json({ message: 'Backend API is working' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/questionnaires', questionnaireRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Initialize database on first request (only once)
let dbInitialized = false;
async function initializeDatabase() {
  if (dbInitialized) return;
  
  try {
    const connected = await testConnection();
    if (connected) {
      await runMigrations();
      dbInitialized = true;
      console.log('✅ Database initialized');
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
}

// Vercel serverless function handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Initialize database on first request
  await initializeDatabase();
  
  // Handle the request with Express
  return new Promise((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}

