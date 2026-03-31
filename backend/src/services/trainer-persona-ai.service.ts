import type { TrainerPersonaStructured } from '../types';
import { parseJSONWithRepair } from './llm-json-parse.service';
import { callOpenAIWithRetry } from './openai-client.service';

function assertTrainerPersonaShape(
  data: unknown
): asserts data is TrainerPersonaStructured {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid trainer persona JSON');
  }
  const o = data as Record<string, unknown>;
  if (
    typeof o.coaching_headline !== 'string' ||
    typeof o.coaching_narrative !== 'string'
  ) {
    throw new Error('Invalid trainer persona: missing required text fields');
  }
}

/**
 * Builds structured JSON persona from free-form trainer + client-need notes (for prompts).
 */
export async function generateTrainerStructuredPersona(
  rawTrainerDefinition: string,
  rawClientNeeds: string
): Promise<TrainerPersonaStructured> {
  const prompt = `Synthesize a structured coaching persona as a single JSON object.

Required keys:
- coaching_headline (string)
- coaching_narrative (string)
- programming_pillars (array of { "name": string, "summary": string })
- progression_philosophy (string)
- intensity_and_effort_model (string)
- prehab_and_systems_integration (string)
- client_archetype_summary (string)
- ideal_client_needs (string array, short bullets)
- programming_anti_patterns (string array)
- ai_prompt_injection (one paragraph for downstream LLM program generation; concise, imperative)

### Trainer definition
${rawTrainerDefinition}

### Typical client needs
${rawClientNeeds}`;

  const content = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You are an expert coach. Respond with ONLY valid JSON. No markdown, no preamble.',
      },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 4000, maxRetries: 1 }
  );

  const parsed = parseJSONWithRepair<TrainerPersonaStructured>(
    content,
    1,
    content
  );
  assertTrainerPersonaShape(parsed);
  return parsed;
}
