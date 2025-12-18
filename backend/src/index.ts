import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Express, type Request, type Response } from 'express';
import { runMigrations, testConnection } from './db/migrations';
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import questionnaireRoutes from './routes/questionnaire.routes';
import recommendationRoutes from './routes/recommendation.routes';
import workoutRoutes from './routes/workout.routes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Backend API is working' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Client routes
app.use('/api/clients', clientRoutes);

// Questionnaire routes
app.use('/api/questionnaires', questionnaireRoutes);

// Recommendation routes
app.use('/api/recommendations', recommendationRoutes);

// Workout routes
app.use('/api/workouts', workoutRoutes);

// Initialize database on startup
async function initializeDatabase() {
  try {
    const connected = await testConnection();
    if (connected) {
      await runMigrations();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  await initializeDatabase();
});
