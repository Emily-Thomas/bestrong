import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as exerciseLibraryService from '../services/exercise-library.service';
import type {
  CreateExerciseLibraryExerciseInput,
  UpdateExerciseLibraryExerciseInput,
} from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/exercise-library
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;

    const exercises = await exerciseLibraryService.getExercises({
      search: typeof search === 'string' ? search : undefined,
      status:
        status === 'active' ||
        status === 'archived' ||
        status === 'all'
          ? status
          : undefined,
    });

    res.json({
      success: true,
      data: exercises,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/exercise-library/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid exercise ID' });
      return;
    }

    const exercise = await exerciseLibraryService.getExerciseById(id);

    if (!exercise) {
      res.status(404).json({ success: false, error: 'Exercise not found' });
      return;
    }

    res.json({ success: true, data: exercise });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/exercise-library
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const input = req.body as CreateExerciseLibraryExerciseInput;

    if (!input.name || !input.name.trim()) {
      res.status(400).json({
        success: false,
        error: 'Exercise name is required',
      });
      return;
    }

    const exercise = await exerciseLibraryService.createExercise(
      input,
      req.user.userId
    );

    res.status(201).json({
      success: true,
      data: exercise,
      message: 'Exercise created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/exercise-library/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid exercise ID' });
      return;
    }

    const updates = req.body as UpdateExerciseLibraryExerciseInput;

    const exercise = await exerciseLibraryService.updateExercise(id, updates);

    if (!exercise) {
      res.status(404).json({ success: false, error: 'Exercise not found' });
      return;
    }

    res.json({
      success: true,
      data: exercise,
      message: 'Exercise updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/exercise-library/:id/archive
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid exercise ID' });
      return;
    }

    const exercise = await exerciseLibraryService.archiveExercise(id);

    if (!exercise) {
      res.status(404).json({ success: false, error: 'Exercise not found' });
      return;
    }

    res.json({
      success: true,
      data: exercise,
      message: 'Exercise archived successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

