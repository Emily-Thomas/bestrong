import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as workoutService from '../services/workout.service';
import * as actualWorkoutService from '../services/actual-workout.service';
import type {
  UpdateWorkoutInput,
  CreateActualWorkoutInput,
} from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get workout by ID (with actual workout data if exists)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid workout ID' });
      return;
    }

    const workout = await workoutService.getWorkoutByIdWithActual(id);

    if (!workout) {
      res.status(404).json({ success: false, error: 'Workout not found' });
      return;
    }

    res.json({ success: true, data: workout });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Update workout (modify proposed workout)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid workout ID' });
      return;
    }

    const input: UpdateWorkoutInput = req.body;
    const workout = await workoutService.updateWorkout(id, input);

    if (!workout) {
      res.status(404).json({ success: false, error: 'Workout not found' });
      return;
    }

    res.json({
      success: true,
      data: workout,
      message: 'Workout updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Start workout session
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid workout ID' });
      return;
    }

    const workout = await workoutService.updateWorkout(id, {
      status: 'in_progress',
    });

    if (!workout) {
      res.status(404).json({ success: false, error: 'Workout not found' });
      return;
    }

    res.json({
      success: true,
      data: workout,
      message: 'Workout session started',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Complete workout (save actual performance data)
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid workout ID' });
      return;
    }

    // Verify workout exists
    const workout = await workoutService.getWorkoutById(id);
    if (!workout) {
      res.status(404).json({ success: false, error: 'Workout not found' });
      return;
    }

    // Validation
    const input: CreateActualWorkoutInput = req.body;
    if (!input.actual_performance || !input.actual_performance.exercises) {
      res.status(400).json({
        success: false,
        error: 'actual_performance with exercises is required',
      });
      return;
    }

    if (input.actual_performance.exercises.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one exercise performance must be recorded',
      });
      return;
    }

    if (!input.completed_at) {
      res.status(400).json({
        success: false,
        error: 'completed_at is required',
      });
      return;
    }

    input.workout_id = id;

    // Create actual workout record
    const actualWorkout = await actualWorkoutService.createActualWorkout(input);

    // Update workout status to completed
    const updatedWorkout = await workoutService.updateWorkout(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    if (!updatedWorkout) {
      res.status(500).json({
        success: false,
        error: 'Failed to update workout status',
      });
      return;
    }

    // Fetch workout with actual data
    const workoutWithActual = await workoutService.getWorkoutByIdWithActual(id);

    res.json({
      success: true,
      data: {
        workout: workoutWithActual,
        actual_workout: actualWorkout,
      },
      message: 'Workout completed successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Update actual workout (edit performance data)
router.patch('/:id/actual', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid workout ID' });
      return;
    }

    // Get actual workout by workout_id
    const existingActual = await actualWorkoutService.getActualWorkoutByWorkoutId(id);
    if (!existingActual) {
      res.status(404).json({
        success: false,
        error: 'Actual workout not found',
      });
      return;
    }

    const updates: Partial<CreateActualWorkoutInput> = req.body;
    const actualWorkout = await actualWorkoutService.updateActualWorkout(
      existingActual.id,
      updates
    );

    if (!actualWorkout) {
      res.status(500).json({
        success: false,
        error: 'Failed to update actual workout',
      });
      return;
    }

    res.json({
      success: true,
      data: actualWorkout,
      message: 'Actual workout updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

