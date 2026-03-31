/**
 * AI generation entrypoints and re-exports. Implementation is split across:
 * - `llm-json-parse.service.ts` — JSON extraction/repair from LLM output
 * - `openai-client.service.ts` — OpenAI client and chat completion helper
 * - `ai-prompt-formatters.service.ts` — client/InBody/persona prompt snippets
 * - `recommendation-ai.service.ts` — planning structure and coach previews
 * - `workout-ai.service.ts` — week 1 and progressive week workouts
 * - `trainer-persona-ai.service.ts` — structured trainer persona JSON
 */

import type {
  Client,
  InBodyScan,
  LLMRecommendationResponse,
  Questionnaire,
} from '../types';
import { parseQuestionnaireData } from './questionnairePrompt.service';
import type { GenerateRecommendationStructureOptions } from './recommendation-ai.service';
import { generateRecommendationStructure } from './recommendation-ai.service';
import { generateMesocycleWorkouts, generateWorkouts } from './workout-ai.service';

export {
  formatQuestionnaireForPrompt,
  parseQuestionnaireData,
} from './questionnairePrompt.service';

export {
  GenerateRecommendationStructureOptions,
  generateCoachFitAnalysis,
  generatePeerCoachDirectionPreviews,
  generateRecommendationStructure,
  mergePlanWithPeerCoachPreviews,
} from './recommendation-ai.service';
export { generateTrainerStructuredPersona } from './trainer-persona-ai.service';
export {
  generateMesocycleWorkouts,
  generateWeekWorkouts,
  generateWorkouts,
} from './workout-ai.service';

/**
 * Full recommendation: planning-direction structure plus Week 1 workouts.
 */
export async function generateRecommendationWithAI(
  questionnaire: Questionnaire,
  inbodyScan: InBodyScan | null = null,
  client: Client | null = null,
  structureOptions?: GenerateRecommendationStructureOptions,
  trainerPersonaInjection?: string | null
): Promise<LLMRecommendationResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please configure it to use AI recommendations.'
    );
  }

  const structuredData = parseQuestionnaireData(questionnaire);

  try {
    const recommendation = await generateRecommendationStructure(
      questionnaire,
      structuredData,
      inbodyScan,
      client,
      trainerPersonaInjection ?? undefined,
      structureOptions
    );

    const workouts = await generateMesocycleWorkouts(
      recommendation,
      questionnaire,
      structuredData,
      inbodyScan,
      client,
      trainerPersonaInjection ?? undefined
    );

    return {
      ...recommendation,
      workouts,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate AI recommendation: ${error.message}`);
    }
    throw new Error('Failed to generate AI recommendation: Unknown error');
  }
}

/**
 * Legacy function for backward compatibility
 * Now uses the LLM-based approach
 */
export async function generateRecommendation(
  questionnaire: Questionnaire
): Promise<LLMRecommendationResponse> {
  return generateRecommendationWithAI(questionnaire);
}
