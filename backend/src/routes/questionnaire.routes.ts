import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as questionnaireService from '../services/questionnaire.service';
import type { CreateQuestionnaireInput } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get questionnaire by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res
        .status(400)
        .json({ success: false, error: 'Invalid questionnaire ID' });
      return;
    }

    const questionnaire = await questionnaireService.getQuestionnaireById(id);

    if (!questionnaire) {
      res.status(404).json({
        success: false,
        error: 'Questionnaire not found',
      });
      return;
    }

    res.json({ success: true, data: questionnaire });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get questionnaire by client ID
router.get('/client/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);

    if (Number.isNaN(clientId)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const questionnaire =
      await questionnaireService.getQuestionnaireByClientId(clientId);

    if (!questionnaire) {
      res.status(404).json({
        success: false,
        error: 'No questionnaire found for this client',
      });
      return;
    }

    res.json({ success: true, data: questionnaire });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Create new questionnaire
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const input: CreateQuestionnaireInput = req.body;

    if (!input.client_id) {
      res.status(400).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    const questionnaire = await questionnaireService.createQuestionnaire(
      input,
      req.user.userId
    );

    res.status(201).json({
      success: true,
      data: questionnaire,
      message: 'Questionnaire created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Update questionnaire
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid questionnaire ID',
      });
      return;
    }

    const input: Partial<CreateQuestionnaireInput> = req.body;
    const questionnaire = await questionnaireService.updateQuestionnaire(
      id,
      input
    );

    if (!questionnaire) {
      res.status(404).json({
        success: false,
        error: 'Questionnaire not found',
      });
      return;
    }

    res.json({
      success: true,
      data: questionnaire,
      message: 'Questionnaire updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Delete questionnaire
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid questionnaire ID',
      });
      return;
    }

    const deleted = await questionnaireService.deleteQuestionnaire(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Questionnaire not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Questionnaire deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
