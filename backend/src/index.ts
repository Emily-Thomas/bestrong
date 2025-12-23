import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Express, type Request, type Response } from 'express';
import path from 'node:path';
import { runMigrations, testConnection } from './db/migrations';
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import inbodyScanRoutes from './routes/inbody-scan.routes';
import questionnaireRoutes from './routes/questionnaire.routes';
import recommendationRoutes from './routes/recommendation.routes';
import workoutRoutes from './routes/workout.routes';
import * as fileStorageService from './services/file-storage.service';

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

// Serve local files in development (for InBody scans)
// This route handles /api/files/* requests for local file storage
app.get('/api/files/*', async (req: Request, res: Response) => {
  try {
    const filePath = req.path.replace('/api/files/', '');
    const fileBuffer = await fileStorageService.readFileFromStorage(`/api/files/${filePath}`);
    
    // Determine content type from file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.pdf': 'application/pdf',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(fileBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(404).json({ success: false, error: `File not found: ${message}` });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// Client routes
app.use('/api/clients', clientRoutes);

// InBody scan routes
app.use('/api/inbody-scans', inbodyScanRoutes);

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
