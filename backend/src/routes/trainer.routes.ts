import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as aiService from '../services/ai.service';
import * as trainerService from '../services/trainer.service';
import type { CreateTrainerInput, UpdateTrainerInput } from '../types';

const router = Router();

router.use(authenticateToken);

function validateCreateBody(body: CreateTrainerInput): string | null {
  if (!body.first_name?.trim() || !body.last_name?.trim()) {
    return 'First name and last name are required';
  }
  if (!body.title?.trim()) {
    return 'Title is required';
  }
  if (!body.raw_trainer_definition?.trim()) {
    return 'Trainer definition is required';
  }
  if (!body.raw_client_needs?.trim()) {
    return 'Client needs description is required';
  }
  return null;
}

function validateUpdateBody(body: UpdateTrainerInput): string | null {
  if (body.first_name !== undefined && !body.first_name.trim()) {
    return 'First name cannot be empty';
  }
  if (body.last_name !== undefined && !body.last_name.trim()) {
    return 'Last name cannot be empty';
  }
  if (body.title !== undefined && !body.title.trim()) {
    return 'Title cannot be empty';
  }
  if (
    body.raw_trainer_definition !== undefined &&
    !body.raw_trainer_definition.trim()
  ) {
    return 'Trainer definition cannot be empty';
  }
  if (body.raw_client_needs !== undefined && !body.raw_client_needs.trim()) {
    return 'Client needs description cannot be empty';
  }
  return null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const trainers = await trainerService.getTrainersByAdmin(req.user.userId);
    res.json({
      success: true,
      data: trainerService.enrichTrainersWithPersonaMeta(trainers),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/:id/generate-persona', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid trainer ID' });
      return;
    }
    const trainer = await trainerService.getTrainerById(id, req.user.userId);
    if (!trainer) {
      res.status(404).json({ success: false, error: 'Trainer not found' });
      return;
    }
    if (
      !trainer.raw_trainer_definition?.trim() ||
      !trainer.raw_client_needs?.trim()
    ) {
      res.status(400).json({
        success: false,
        error:
          'Both trainer definition and client needs text are required to generate a persona.',
      });
      return;
    }
    const structured = await aiService.generateTrainerStructuredPersona(
      trainer.raw_trainer_definition,
      trainer.raw_client_needs
    );
    const hash = trainerService.hashTrainerPersonaInputs(
      trainer.raw_trainer_definition,
      trainer.raw_client_needs
    );
    const updated = await trainerService.saveTrainerStructuredPersona(
      id,
      req.user.userId,
      structured,
      hash
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Trainer not found' });
      return;
    }
    res.json({
      success: true,
      data: trainerService.enrichTrainerWithPersonaMeta(updated),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid trainer ID' });
      return;
    }
    const trainer = await trainerService.getTrainerById(id, req.user.userId);
    if (!trainer) {
      res.status(404).json({ success: false, error: 'Trainer not found' });
      return;
    }
    res.json({
      success: true,
      data: trainerService.enrichTrainerWithPersonaMeta(trainer),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const input = req.body as CreateTrainerInput;
    const err = validateCreateBody(input);
    if (err) {
      res.status(400).json({ success: false, error: err });
      return;
    }
    const trainer = await trainerService.createTrainer(input, req.user.userId);
    res.status(201).json({
      success: true,
      data: trainerService.enrichTrainerWithPersonaMeta(trainer),
      message: 'Trainer created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid trainer ID' });
      return;
    }
    const input = req.body as UpdateTrainerInput;
    const updateErr = validateUpdateBody(input);
    if (updateErr) {
      res.status(400).json({ success: false, error: updateErr });
      return;
    }
    const trainer = await trainerService.updateTrainer(
      id,
      req.user.userId,
      input
    );
    if (!trainer) {
      res.status(404).json({ success: false, error: 'Trainer not found' });
      return;
    }
    res.json({
      success: true,
      data: trainerService.enrichTrainerWithPersonaMeta(trainer),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid trainer ID' });
      return;
    }
    const deleted = await trainerService.deleteTrainer(id, req.user.userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Trainer not found' });
      return;
    }
    res.json({ success: true, message: 'Trainer deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
