import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as aiService from '../services/ai.service';
import * as questionnaireService from '../services/questionnaire.service';
import * as recommendationService from '../services/recommendation.service';
import type {
  CreateRecommendationInput,
  UpdateRecommendationInput,
} from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Generate recommendation from questionnaire
router.post(
  '/generate/:questionnaireId',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const questionnaireId = parseInt(req.params.questionnaireId, 10);

      if (Number.isNaN(questionnaireId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid questionnaire ID',
        });
        return;
      }

      // Get questionnaire
      const questionnaire =
        await questionnaireService.getQuestionnaireById(questionnaireId);

      if (!questionnaire) {
        res.status(404).json({
          success: false,
          error: 'Questionnaire not found',
        });
        return;
      }

      // Generate AI recommendation
      const aiAnalysis =
        await aiService.generateRecommendationWithAI(questionnaire);

      // Create or update recommendation record (1:1 with questionnaire)
      const recommendationInput: CreateRecommendationInput = {
        client_id: questionnaire.client_id,
        questionnaire_id: questionnaireId,
        client_type: aiAnalysis.type,
        sessions_per_week: aiAnalysis.sessionsPerWeek,
        session_length_minutes: aiAnalysis.sessionLength,
        training_style: aiAnalysis.trainingStyle,
        plan_structure: aiAnalysis.planStructure,
        ai_reasoning: aiAnalysis.reasoning,
      };

      const recommendation =
        await recommendationService.createOrUpdateRecommendationForQuestionnaire(
          recommendationInput,
          req.user.userId
        );

      res.status(201).json({
        success: true,
        data: recommendation,
        message: 'Recommendation generated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Generate recommendation from client ID (uses latest questionnaire)
router.post(
  '/generate/client/:clientId',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const clientId = parseInt(req.params.clientId, 10);

      if (Number.isNaN(clientId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid client ID',
        });
        return;
      }

      // Get latest questionnaire for client
      const questionnaire =
        await questionnaireService.getQuestionnaireByClientId(clientId);

      if (!questionnaire) {
        res.status(404).json({
          success: false,
          error: 'No questionnaire found for this client',
        });
        return;
      }

      // Generate AI recommendation
      const aiAnalysis =
        await aiService.generateRecommendationWithAI(questionnaire);

      // Create or update recommendation record (1:1 with questionnaire)
      const recommendationInput: CreateRecommendationInput = {
        client_id: clientId,
        questionnaire_id: questionnaire.id,
        client_type: aiAnalysis.type,
        sessions_per_week: aiAnalysis.sessionsPerWeek,
        session_length_minutes: aiAnalysis.sessionLength,
        training_style: aiAnalysis.trainingStyle,
        plan_structure: aiAnalysis.planStructure,
        ai_reasoning: aiAnalysis.reasoning,
      };

      const recommendation =
        await recommendationService.createOrUpdateRecommendationForQuestionnaire(
          recommendationInput,
          req.user.userId
        );

      res.status(201).json({
        success: true,
        data: recommendation,
        message: 'Recommendation generated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Get all recommendations for a client
router.get('/client/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);

    if (Number.isNaN(clientId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid client ID',
      });
      return;
    }

    const recommendations =
      await recommendationService.getRecommendationsByClientId(clientId);

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get recommendation by questionnaire ID (must be before /:id route)
router.get('/questionnaire/:questionnaireId', async (req: Request, res: Response) => {
  try {
    const questionnaireId = parseInt(req.params.questionnaireId, 10);

    if (Number.isNaN(questionnaireId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid questionnaire ID',
      });
      return;
    }

    const recommendation =
      await recommendationService.getRecommendationByQuestionnaireId(
        questionnaireId
      );

    if (!recommendation) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found for this questionnaire',
      });
      return;
    }

    res.json({ success: true, data: recommendation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get recommendation by ID (must be last to avoid route conflicts)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID',
      });
      return;
    }

    const recommendation =
      await recommendationService.getRecommendationById(id);

    if (!recommendation) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      });
      return;
    }

    res.json({ success: true, data: recommendation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Update/edit recommendation
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID',
      });
      return;
    }

    const input: UpdateRecommendationInput = req.body;
    const recommendation = await recommendationService.updateRecommendation(
      id,
      input,
      req.user.userId
    );

    if (!recommendation) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      });
      return;
    }

    res.json({
      success: true,
      data: recommendation,
      message: 'Recommendation updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Delete recommendation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID',
      });
      return;
    }

    const deleted = await recommendationService.deleteRecommendation(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Recommendation deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
