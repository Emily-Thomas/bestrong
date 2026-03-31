import type {
  Client,
  CoachFitAnalysis,
  InBodyScan,
  LLMRecommendationResponse,
  PeerCoachDirectionPreview,
  Questionnaire,
  RecommendedCoachMatch,
  StructuredQuestionnaireData,
  Trainer,
  TrainerCoachMatchOption,
} from '../types';
import {
  CLIENT_ARCHETYPES,
  coachPersonaBlock,
  formatClientInfoForPrompt,
  formatInBodyScanForPrompt,
} from './ai-prompt-formatters.service';
import { parseJSONWithRepair } from './llm-json-parse.service';
import { callOpenAIWithRetry } from './openai-client.service';
import {
  formatQuestionnaireForPrompt,
  GOALS_VS_INJURIES_INSTRUCTION,
} from './questionnairePrompt.service';

export interface GenerateRecommendationStructureOptions {
  coachMatchOptions?: TrainerCoachMatchOption[];
  /** Comparison jobs: no roster match or peer previews */
  skipCoachRecommendation?: boolean;
}

type RawGuidanceResponse = Omit<LLMRecommendationResponse, 'workouts'> & {
  recommended_coach?: RecommendedCoachMatch;
};

function normalizeGuidanceForStorage(
  raw: RawGuidanceResponse
): Omit<LLMRecommendationResponse, 'workouts'> {
  const ps: Record<string, unknown> =
    typeof raw.plan_structure === 'object' && raw.plan_structure !== null
      ? { ...(raw.plan_structure as Record<string, unknown>) }
      : {};

  const rc =
    raw.recommended_coach ??
    (ps.recommended_coach as RecommendedCoachMatch | undefined);

  if (rc) {
    ps.recommended_coach = rc;
  }

  const { recommended_coach: _omit, ...rest } = raw;
  return {
    ...rest,
    plan_structure: ps,
  };
}

export function mergePlanWithPeerCoachPreviews(
  planStructure: Record<string, unknown>,
  peerPreviews: PeerCoachDirectionPreview[]
): Record<string, unknown> {
  if (!peerPreviews.length) {
    return planStructure;
  }
  return { ...planStructure, other_coaches_preview: peerPreviews };
}

export async function generatePeerCoachDirectionPreviews(
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  inbodyScan: InBodyScan | null,
  client: Client | null,
  recommended: RecommendedCoachMatch,
  peerOptions: TrainerCoachMatchOption[]
): Promise<PeerCoachDirectionPreview[]> {
  if (!peerOptions.length) {
    return [];
  }

  const questionnaireText = formatQuestionnaireForPrompt(
    questionnaire,
    structuredData
  );
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);

  const roster = peerOptions
    .map(
      (o) =>
        `- id: ${o.id}\n  name: ${o.display_name}\n  title: ${o.title}\n  summary: ${o.program_summary}`
    )
    .join('\n');

  const prompt = `You summarize how OTHER coaches on the roster would steer this same client at a high level (themes, focus, intensity philosophy — not exercise lists).

## Recommended coach (already chosen)
- ${recommended.coach_name} (trainer_id ${recommended.trainer_id})
- Reasoning: ${recommended.reasoning}

## Other coaches (write a short direction summary for EACH)
${roster}

## Client context
${clientInfoText ? `${clientInfoText}\n\n` : ''}## Questionnaire
${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}

Respond with JSON only:
{
  "previews": [
    {
      "trainer_id": <number>,
      "coach_name": "<full name>",
      "direction_summary": "2-4 sentences: how this coach would steer programming for this client",
      "differs_from_recommended": "one short sentence on how this differs from the recommended coach"
    }
  ]
}

Include one object per coach listed under "Other coaches". Use the exact trainer_id values from the roster.`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You respond with ONLY valid JSON. No markdown. Keep summaries concise.',
      },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 2500, maxRetries: 1 }
  );

  const parsed = parseJSONWithRepair<{ previews: PeerCoachDirectionPreview[] }>(
    responseContent,
    1,
    responseContent
  );

  if (!parsed.previews || !Array.isArray(parsed.previews)) {
    return [];
  }

  return parsed.previews.filter(
    (p) =>
      typeof p.trainer_id === 'number' &&
      typeof p.coach_name === 'string' &&
      typeof p.direction_summary === 'string'
  );
}

/**
 * Generates planning-direction structure (no workouts) using OpenAI
 */
export async function generateRecommendationStructure(
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  inbodyScan: InBodyScan | null = null,
  client: Client | null = null,
  trainerPersonaInjection?: string | null,
  options?: GenerateRecommendationStructureOptions
): Promise<Omit<LLMRecommendationResponse, 'workouts'>> {
  const questionnaireText = formatQuestionnaireForPrompt(
    questionnaire,
    structuredData
  );
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);

  const personasText = Object.values(CLIENT_ARCHETYPES)
    .map(
      (archetype) =>
        `**${archetype.type}**\n` +
        `Description: ${archetype.description}\n` +
        `Training Methods: ${archetype.trainingMethods.join(', ')}\n` +
        `Why It Fits: ${archetype.whyItFits}\n`
    )
    .join('\n');

  const coachRosterSection =
    options?.skipCoachRecommendation || !options?.coachMatchOptions?.length
      ? ''
      : `## Coach roster (recommended match)
Pick the ONE best-matching coach from this list by \`id\`. Use questionnaire + InBody + goals.

${options.coachMatchOptions
  .map(
    (o) =>
      `- id: ${o.id}\n  name: ${o.display_name}\n  title: ${o.title}\n  summary: ${o.program_summary}`
  )
  .join('\n\n')}

`;

  const recommendedCoachJson = options?.skipCoachRecommendation
    ? ''
    : options?.coachMatchOptions?.length
      ? `,
  "recommended_coach": {
    "trainer_id": <number from roster>,
    "coach_name": "<from roster>",
    "reasoning": "<why this coach fits this client>"
  }`
      : '';

  const prompt = `You are an expert personal trainer producing **planning direction only** for a coach to implement later.

Do NOT output exercise lists, session prescriptions, or week-by-week workout plans. Themes, volume, intensity philosophy, and scheduling patterns only.

## Available client personas

${personasText}

${clientInfoText ? `${clientInfoText}\n\n` : ''}## Client questionnaire

${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}
${coachPersonaBlock(trainerPersonaInjection ?? undefined)}${coachRosterSection}## Instructions

1. Select the ONE client persona that best matches this client. Explain why (${GOALS_VS_INJURIES_INSTRUCTION}).

2. Set **sessions_per_week** to 1, 2, or 3 only.

3. Set **session_length_minutes** to **30** or **45** only (pick what fits the client).

4. **plan_structure** describes the **first phase** of training (not a full multi-week prescription of workouts):
   - **phase_1_weeks**: length of this initial phase in weeks (typically 1–4).
   - **weekly_repeating_schedule**: one row per training day in a typical week (day label, session label, focus theme). Repeat the same weekly pattern across phase_1_weeks unless you explain otherwise in progression_guidelines.
   - **progression_guidelines** and **intensity_load_progression**: how load and effort progress over the phase (RPE/RIR, volume landmarks, deload hints) without naming specific exercises.

5. **training_style** summarizes the approach in plain language.

## Output format

Respond with a single JSON object. Shape:

{
  "client_type": "The [Persona Name]",
  "client_type_reasoning": "...",
  "sessions_per_week": 2,
  "session_length_minutes": 45,
  "training_style": "...",
  "plan_structure": {
    "archetype": "The [Persona Name]",
    "description": "short summary of the training direction",
    "phase_1_weeks": 2,
    "training_methods": ["..."],
    "weekly_repeating_schedule": [
      { "day": "Monday", "session_label": "...", "focus_theme": "..." }
    ],
    "progression_guidelines": "...",
    "intensity_load_progression": "...",
    "periodization_approach": "optional"
  },
  "ai_reasoning": "overall reasoning for this planning direction"${recommendedCoachJson}
}

CRITICAL: Respond with ONLY valid JSON. No markdown fences or extra text.`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You are an expert personal trainer. Respond with ONLY valid JSON. No markdown. Escape quotes inside strings. Close all brackets.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      maxTokens: 4000,
      maxRetries: 1,
    }
  );

  const parsed = parseJSONWithRepair<RawGuidanceResponse>(
    responseContent,
    1,
    responseContent
  );

  if (!parsed.client_type || typeof parsed.sessions_per_week !== 'number') {
    throw new Error('Invalid recommendation structure from OpenAI');
  }

  let result = normalizeGuidanceForStorage(parsed);

  if (!options?.skipCoachRecommendation && options?.coachMatchOptions?.length) {
    const rc = (result.plan_structure as Record<string, unknown>)
      ?.recommended_coach as RecommendedCoachMatch | undefined;
    if (rc && typeof rc.trainer_id === 'number') {
      const peers = options.coachMatchOptions.filter(
        (o) => o.id !== rc.trainer_id
      );
      if (peers.length) {
        const previews = await generatePeerCoachDirectionPreviews(
          questionnaire,
          structuredData,
          inbodyScan,
          client,
          rc,
          peers
        );
        result = {
          ...result,
          plan_structure: mergePlanWithPeerCoachPreviews(
            result.plan_structure as Record<string, unknown>,
            previews
          ),
        };
      }
    }
  }

  return result;
}

/** Keep coach-fit reasoning to at most two sentences for UI copy. */
function truncateCoachFitReasoningToTwoSentences(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length <= 2) {
    return sentences.join(' ').trim();
  }
  return `${sentences[0].trim()} ${sentences[1].trim()}`.trim();
}

function coachFitClientNames(client: Client | null): {
  fullName: string;
  firstName: string;
} {
  if (!client) {
    return { fullName: '', firstName: '' };
  }
  const first = client.first_name?.trim() ?? '';
  const last = client.last_name?.trim() ?? '';
  const full = [first, last].filter(Boolean).join(' ');
  return { fullName: full, firstName: first };
}

function formatTrainerForCoachFitPrompt(t: Trainer): string {
  const sp = t.structured_persona;
  const name = `${t.first_name} ${t.last_name}`.trim();
  const base = `trainer_id: ${t.id}\nname: ${name}\ntitle: ${t.title}`;
  if (!sp) {
    return `${base}\n(no structured persona)`;
  }
  const narrative = (sp.coaching_narrative?.slice(0, 700) ?? '').trim();
  const pillars =
    sp.programming_pillars
      ?.map((p) => `"${p.name}": ${p.summary}`)
      .join('\n') ?? '';
  const ideal = sp.ideal_client_needs?.join('; ') ?? '';
  const anti = sp.programming_anti_patterns?.join('; ') ?? '';
  return `${base}
coaching_headline: ${sp.coaching_headline ?? ''}
coaching_narrative (excerpt): ${narrative}
ideal_client_needs: ${ideal}
progression_philosophy: ${(sp.progression_philosophy ?? '').slice(0, 450)}
intensity_model: ${(sp.intensity_and_effort_model ?? '').slice(0, 450)}
pillars:
${pillars}
anti_patterns: ${anti}`;
}

/**
 * Quick LLM call: which of exactly three trainers best fits this client + structured rationale.
 * Does not generate programming.
 */
export async function generateCoachFitAnalysis(
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  inbodyScan: InBodyScan | null,
  client: Client | null,
  trainers: Trainer[]
): Promise<CoachFitAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please configure it to use coach fit analysis.'
    );
  }
  if (trainers.length !== 3) {
    throw new Error(
      'Coach fit analysis requires exactly three trainers with personas'
    );
  }

  const questionnaireText = formatQuestionnaireForPrompt(
    questionnaire,
    structuredData
  );
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);
  const { fullName: clientFullName, firstName: clientFirstName } =
    coachFitClientNames(client);
  const whoFor =
    clientFullName ||
    (clientFirstName ? clientFirstName : 'this person');
  const nameForCopy =
    clientFirstName || clientFullName || whoFor;

  const roster = trainers.map(formatTrainerForCoachFitPrompt).join('\n\n---\n\n');

  const prompt = `You help select the SINGLE best coach for ${whoFor} from exactly THREE trainers below. You do NOT write workouts or programs—only who fits best and why.

## Who this is for
Address ${whoFor} by name in your reasoning text (e.g. "${nameForCopy}" — use their real name, not the word "client" or "the client" as the main subject). Be warm and direct.

## Background
${clientInfoText ? `${clientInfoText}\n\n` : ''}## Questionnaire
${questionnaireText}
${inbodyText ? `\n## InBody / body composition\n${inbodyText}\n` : ''}

## Three trainers (internal IDs are only for your JSON output)
${roster}

## Output requirements
1. Pick exactly ONE recommended_trainer_id matching one of the trainer_id values above (required for the app).
2. In "recommendation.reasoning", write **at most 2 sentences** total explaining why that coach is the best match for ${whoFor}'s goals, schedule, and history. Ground claims in sound training principles when relevant; plain language.
3. In the reasoning text: refer to coaches by **name only** (use each trainer's name as shown next to "name:" in the roster). Never mention trainer_id, numeric IDs, or "user ID" in the reasoning.
4. Do not discuss the other two coaches at length; focus on the one you recommend.

## Output JSON only
{
  "recommended_trainer_id": <number>,
  "recommendation": {
    "reasoning": "<string>"
  }
}`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You return ONLY valid JSON. No markdown fences. Be accurate and evidence-informed; avoid medical claims beyond general training principles.',
      },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 600, maxRetries: 1 }
  );

  const parsed = parseJSONWithRepair<CoachFitAnalysis>(
    responseContent,
    1,
    responseContent
  );

  const rawId = parsed.recommended_trainer_id as unknown;
  const trainerId =
    typeof rawId === 'number' && Number.isFinite(rawId)
      ? Math.trunc(rawId)
      : typeof rawId === 'string' && /^\d+$/.test(rawId.trim())
        ? parseInt(rawId.trim(), 10)
        : NaN;
  if (Number.isNaN(trainerId)) {
    throw new Error('Invalid coach fit response from model');
  }

  const ids = new Set(trainers.map((t) => t.id));
  if (!ids.has(trainerId)) {
    throw new Error('Recommended trainer not in roster');
  }

  const recRaw = parsed.recommendation as unknown;
  const rec =
    recRaw &&
    typeof recRaw === 'object' &&
    recRaw !== null &&
    !Array.isArray(recRaw)
      ? (recRaw as Record<string, unknown>)
      : null;

  let reasoning =
    rec && typeof rec.reasoning === 'string' ? rec.reasoning.trim() : '';

  if (!reasoning && rec) {
    const legacyHeadline =
      typeof rec.headline === 'string' ? rec.headline.trim() : '';
    const legacyBottom =
      typeof rec.bottom_line === 'string' ? rec.bottom_line.trim() : '';
    const legacyPoints = Array.isArray(rec.key_points)
      ? rec.key_points.map((x) => String(x).trim()).filter(Boolean)
      : [];
    reasoning = [legacyHeadline, ...legacyPoints, legacyBottom]
      .filter(Boolean)
      .join(' ');
  }

  if (!reasoning.trim()) {
    throw new Error('Invalid coach fit response from model');
  }

  reasoning = truncateCoachFitReasoningToTwoSentences(reasoning);

  return {
    recommended_trainer_id: trainerId,
    recommendation: {
      reasoning,
    },
  };
}
