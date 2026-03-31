import type {
  ActualWorkout,
  Client,
  InBodyScan,
  LLMRecommendationResponse,
  LLMWorkoutResponse,
  PlanGuidanceStructure,
  Questionnaire,
  Recommendation,
  StructuredQuestionnaireData,
  Workout,
} from '../types';
import {
  coachPersonaBlock,
  formatClientInfoForPrompt,
  formatInBodyScanForPrompt,
} from './ai-prompt-formatters.service';
import * as exerciseLibraryService from './exercise-library.service';
import { parseJSONWithRepair } from './llm-json-parse.service';
import { callOpenAIWithRetry } from './openai-client.service';
import {
  formatQuestionnaireForPrompt,
  GOALS_VS_INJURIES_INSTRUCTION,
} from './questionnairePrompt.service';
import { enrichAIWorkoutsWithLibrary } from './workout-library-integration.service';

async function enrichLlmWorkoutsWithExerciseLibrary(
  workouts: LLMWorkoutResponse[]
): Promise<LLMWorkoutResponse[]> {
  try {
    const lib = await exerciseLibraryService.getExercises({ status: 'active' });
    if (!lib.length) {
      return workouts;
    }
    return enrichAIWorkoutsWithLibrary(workouts, lib);
  } catch {
    return workouts;
  }
}

/** Reads phase length from plan_structure.phase_1_weeks (clamped 1–12). */
export function getPhaseWeeksFromPlan(
  planStructure: Record<string, unknown> | PlanGuidanceStructure | undefined
): number {
  if (!planStructure || typeof planStructure !== 'object') {
    return 4;
  }
  const w = (planStructure as PlanGuidanceStructure).phase_1_weeks;
  if (typeof w === 'number' && Number.isFinite(w)) {
    return Math.min(12, Math.max(1, Math.floor(w)));
  }
  return 4;
}

function summarizePriorMesocycleWorkouts(workouts: LLMWorkoutResponse[]): string {
  const byWeek = new Map<number, LLMWorkoutResponse[]>();
  for (const w of workouts) {
    const arr = byWeek.get(w.week_number) ?? [];
    arr.push(w);
    byWeek.set(w.week_number, arr);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);
  const blocks: string[] = [];
  for (const week of weeks) {
    const list = (byWeek.get(week) ?? []).sort(
      (a, b) => a.session_number - b.session_number
    );
    blocks.push(`## Prior week ${week} (planned programming — client may not have completed yet)`);
    for (const wo of list) {
      const exercises = wo.workout_data?.exercises ?? [];
      const brief = exercises
        .slice(0, 14)
        .map((e) => {
          const parts = [e.name];
          if (e.sets != null) parts.push(`${e.sets} sets`);
          if (e.reps != null) parts.push(String(e.reps));
          if (e.weight) parts.push(String(e.weight));
          return parts.join(' ');
        })
        .join('; ');
      blocks.push(
        `- Session ${wo.session_number}: ${wo.workout_name ?? 'Session'} — ${brief || '(exercises)'}`
      );
    }
  }
  return blocks.join('\n');
}

/**
 * Weeks 2+ of the initial mesocycle: progress load/RPE using plan_structure guidelines
 * (no performance logs yet — planned progression only).
 */
async function generateProgressionWeekWorkouts(
  recommendation: Omit<LLMRecommendationResponse, 'workouts'>,
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  inbodyScan: InBodyScan | null,
  client: Client | null,
  trainerPersonaInjection: string | undefined,
  targetWeek: number,
  phaseWeeks: number,
  priorWorkouts: LLMWorkoutResponse[]
): Promise<LLMWorkoutResponse[]> {
  const questionnaireText = formatQuestionnaireForPrompt(
    questionnaire,
    structuredData
  );
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);
  const sessionsPerWeek = recommendation.sessions_per_week;
  const priorSummary = summarizePriorMesocycleWorkouts(priorWorkouts);
  const planJson = JSON.stringify(recommendation.plan_structure, null, 2);

  const prompt = `You are an expert personal trainer generating detailed workouts for WEEK ${targetWeek} of a ${phaseWeeks}-week mesocycle (initial phase).

## Client Context

**Selected Persona:** ${recommendation.client_type}
**Sessions Per Week:** ${recommendation.sessions_per_week}
**Session Length:** ${recommendation.session_length_minutes} minutes
**Training Style:** ${recommendation.training_style}
**Plan structure (follow this):** ${planJson}
**Planning notes:** ${recommendation.ai_reasoning || 'N/A'}

${clientInfoText ? `${clientInfoText}\n\n` : ''}## Client Questionnaire

${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}
${coachPersonaBlock(trainerPersonaInjection)}## Prior weeks in this mesocycle

${priorSummary}

## Instructions

${GOALS_VS_INJURIES_INSTRUCTION}

This block is **planned progression** — assume prior weeks are prescriptions, not logged performance. Advance difficulty using **progression_guidelines** and **intensity_load_progression** from the plan structure. If those say "hold steady" or "deload", follow that instead of adding load.

- Keep the same weekly session themes as **weekly_repeating_schedule** (session 1 aligns with the first day in the schedule, etc.).
- Increase load, reps, sets, or RPE targets modestly week-to-week when the plan implies progression.
- Generate ONLY week ${targetWeek} (${sessionsPerWeek} sessions). Each workout must list specific exercises, sets, reps, load/RIR guidance, rest, warmup/cooldown as needed.
- Fit everything within ${recommendation.session_length_minutes} minutes per session.

**CRITICAL**
- week_number must be ${targetWeek} for every workout.
- session_number 1..${sessionsPerWeek}.
- Do not repeat prior weeks verbatim — show clear planned progression.

## Output Format

Respond with a single JSON object:

{
  "workouts": [
    {
      "week_number": ${targetWeek},
      "session_number": 1,
      "workout_name": "...",
      "workout_data": {
        "exercises": [ { "name": "...", "sets": 3, "reps": "8-10", "weight": "RIR 2", "rest_seconds": 90, "notes": "..." } ],
        "warmup": [],
        "cooldown": [],
        "total_duration_minutes": ${recommendation.session_length_minutes},
        "focus_areas": []
      },
      "workout_reasoning": "..."
    }
  ]
}

CRITICAL: Valid JSON only. Generate exactly ${sessionsPerWeek} workouts. Keep text fields short.`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You are an expert personal trainer. Respond with ONLY valid JSON. No markdown fences. Keep strings short.',
      },
      { role: 'user', content: prompt },
    ],
    {
      maxTokens: 6000,
      maxRetries: 1,
    }
  );

  const parsed = parseJSONWithRepair<{ workouts: LLMWorkoutResponse[] }>(
    responseContent,
    1,
    responseContent
  );

  if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
    throw new Error('Invalid workout response: missing workouts array');
  }

  let list = parsed.workouts.filter((w) => w.week_number === targetWeek);
  if (list.length !== sessionsPerWeek) {
    list = parsed.workouts;
  }

  return enrichLlmWorkoutsWithExerciseLibrary(list);
}

/**
 * Full initial mesocycle: phase_1_weeks × sessions_per_week workouts (week 1 + planned progression).
 */
export async function generateMesocycleWorkouts(
  recommendation: Omit<LLMRecommendationResponse, 'workouts'>,
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  inbodyScan: InBodyScan | null = null,
  client: Client | null = null,
  trainerPersonaInjection?: string
): Promise<LLMWorkoutResponse[]> {
  const phaseWeeks = getPhaseWeeksFromPlan(recommendation.plan_structure);
  const weekOne = await generateWorkouts(
    recommendation,
    questionnaire,
    structuredData,
    inbodyScan,
    client,
    trainerPersonaInjection
  );
  const all: LLMWorkoutResponse[] = [...weekOne];
  if (phaseWeeks <= 1) {
    return all;
  }
  for (let w = 2; w <= phaseWeeks; w++) {
    const prior = all.filter((x) => x.week_number < w);
    const weekN = await generateProgressionWeekWorkouts(
      recommendation,
      questionnaire,
      structuredData,
      inbodyScan,
      client,
      trainerPersonaInjection,
      w,
      phaseWeeks,
      prior
    );
    all.push(...weekN);
  }
  return all;
}

/**
 * Generates workouts for WEEK 1 ONLY of a recommendation
 * This keeps token usage manageable and allows for progressive generation later
 */
export async function generateWorkouts(
  recommendation: Omit<LLMRecommendationResponse, 'workouts'>,
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  inbodyScan: InBodyScan | null = null,
  client: Client | null = null,
  trainerPersonaInjection?: string
): Promise<LLMWorkoutResponse[]> {
  const questionnaireText = formatQuestionnaireForPrompt(
    questionnaire,
    structuredData
  );
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);
  const week1Workouts = recommendation.sessions_per_week; // Only week 1
  const phaseWeeks = getPhaseWeeksFromPlan(recommendation.plan_structure);

  const prompt = `You are an expert personal trainer generating detailed workouts for WEEK 1 of a ${phaseWeeks}-week mesocycle (initial phase).

## Client Context

**Selected Persona:** ${recommendation.client_type}
**Sessions Per Week:** ${recommendation.sessions_per_week}
**Session Length:** ${recommendation.session_length_minutes} minutes
**Training Style:** ${recommendation.training_style}
**Plan structure (session themes & progression — follow this):** ${JSON.stringify(recommendation.plan_structure, null, 2)}

${clientInfoText ? `${clientInfoText}\n\n` : ''}## Client Questionnaire

${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}
${coachPersonaBlock(trainerPersonaInjection)}## Instructions

${GOALS_VS_INJURIES_INSTRUCTION}

Generate ONLY WEEK 1 workouts (${week1Workouts} total sessions for week 1). Each workout should include:
- Specific exercises with sets, reps, weight/load guidance, rest periods
- Warmup and cooldown exercises when appropriate
- Notes on form, tempo, or RIR when relevant
- Brief reasoning for exercise selection

**CRITICAL: Generate ONLY Week 1 workouts**
- Generate workouts for WEEK 1 ONLY, sessions 1-${recommendation.sessions_per_week}
- All workouts must have week_number: 1
- Each exercise must have at least a name
- Be specific with exercise selection - use actual exercise names
- Be specific with load - using lbs, percentage of 1RM, bodyweight, RIR, etc
- These are foundational workouts to establish the program
- Keep exercise notes and reasoning concise
- Make workouts realistic and achievable for the client's level
- Plan exercises, rest periods, warmup, and cooldown to fit within ${recommendation.session_length_minutes} minutes total.

## Output Format

You must respond with a valid JSON object with this structure:

{
  "workouts": [
    {
      "week_number": 1,
      "session_number": 1,
      "workout_name": "Upper Body Strength",
      "workout_data": {
        "exercises": [
          {
            "name": "Barbell Bench Press",
            "sets": 4,
            "reps": "6-8",
            "weight": "RIR 2",
            "rest_seconds": 180,
            "notes": "Focus on controlled tempo",
            "rir": 2
          }
        ],
        "warmup": [{"name": "Light Cardio", "notes": "5 minutes"}],
        "cooldown": [{"name": "Static Stretching", "notes": "Focus on chest"}],
        "total_duration_minutes": 60,
        "focus_areas": ["upper body", "push", "strength"]
      },
      "workout_reasoning": "This workout focuses on building upper body strength..."
    }
  ]
}

CRITICAL: 
- Respond with ONLY valid JSON. All strings must be properly escaped.
- Generate exactly ${week1Workouts} workouts for WEEK 1 ONLY
- All workouts must have "week_number": 1
- Do NOT generate workouts for weeks 2–${phaseWeeks} (only week 1 now)
- Keep all text fields SHORT (max 100 characters per field) to prevent truncation
- Exercise notes should be brief (1-2 sentences max)
- Workout reasoning should be concise (2-3 sentences max)`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You are an expert personal trainer. You MUST respond with ONLY valid JSON. No markdown code blocks, no explanations, no additional text. All string values must have properly escaped quotes (use \\" for quotes inside strings). Generate ONLY Week 1 workouts. Ensure all JSON brackets and braces are properly closed. Keep all text fields concise to avoid truncation.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      maxTokens: 6000, // Reduced to prevent truncation issues
      maxRetries: 1, // Only retry on rate limits - don't waste tokens on API errors
    }
  );

  const parsed = parseJSONWithRepair<{ workouts: LLMWorkoutResponse[] }>(
    responseContent,
    1, // Only 1 attempt - don't waste tokens on repair retries
    responseContent // Pass raw response for error logging
  );

  if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
    throw new Error('Invalid workout response: missing workouts array');
  }

  // Validate we got the right number of workouts for week 1
  if (parsed.workouts.length !== week1Workouts) {
    // tolerate count mismatch from the model
  }

  const invalidWeeks = parsed.workouts.filter((w) => w.week_number !== 1);
  if (invalidWeeks.length > 0) {
    parsed.workouts = parsed.workouts.filter((w) => w.week_number === 1);
  }

  return enrichLlmWorkoutsWithExerciseLibrary(parsed.workouts);
}

/**
 * Generates workouts for a specific week based on previous weeks' performance
 * This is used for progressive week generation after Week 1
 */
export async function generateWeekWorkouts(
  recommendation: Recommendation,
  previousWeeksData: {
    week_number: number;
    workouts: Workout[];
    actual_workouts: ActualWorkout[];
  }[],
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  targetWeek: number,
  inbodyScan: InBodyScan | null = null,
  client: Client | null = null,
  trainerPersonaInjection?: string
): Promise<LLMWorkoutResponse[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please configure it to use AI recommendations.'
    );
  }

  const questionnaireText = formatQuestionnaireForPrompt(
    questionnaire,
    structuredData
  );
  const inbodyText = formatInBodyScanForPrompt(inbodyScan);
  const clientInfoText = formatClientInfoForPrompt(client);
  const sessionsPerWeek = recommendation.sessions_per_week;

  // Build performance history summary
  let performanceHistoryText = '';
  if (previousWeeksData.length > 0) {
    performanceHistoryText = '## Performance History\n\n';

    for (const weekData of previousWeeksData) {
      performanceHistoryText += `### Week ${weekData.week_number} Results:\n\n`;

      for (let i = 0; i < weekData.workouts.length; i++) {
        const workout = weekData.workouts[i];
        const actualWorkout = weekData.actual_workouts.find(
          (aw) => aw.workout_id === workout.id
        );

        performanceHistoryText += `**Session ${workout.session_number}: ${workout.workout_name || 'Workout'}**\n`;

        if (actualWorkout) {
          performanceHistoryText += `- Overall RIR: ${actualWorkout.overall_rir || 'N/A'}/5\n`;
          performanceHistoryText += `- Client Energy Level: ${actualWorkout.client_energy_level || 'N/A'}/10\n`;
          if (actualWorkout.workout_rating) {
            const ratingEmoji =
              actualWorkout.workout_rating === 'happy'
                ? '😊'
                : actualWorkout.workout_rating === 'meh'
                  ? '😐'
                  : '😞';
            performanceHistoryText += `- Overall Workout Rating: ${ratingEmoji} (${actualWorkout.workout_rating})\n`;
          }

          if (actualWorkout.actual_performance.exercises.length > 0) {
            performanceHistoryText += `- Exercise Performance:\n`;
            actualWorkout.actual_performance.exercises.forEach((ex) => {
              performanceHistoryText += `  - ${ex.exercise_name}: `;
              if (ex.sets_completed)
                performanceHistoryText += `${ex.sets_completed} sets, `;
              if (ex.reps_completed)
                performanceHistoryText += `${ex.reps_completed} reps, `;
              if (ex.weight_used)
                performanceHistoryText += `${ex.weight_used}, `;
              if (ex.rir !== undefined)
                performanceHistoryText += `RIR ${ex.rir}`;
              if (ex.exercise_rating) {
                const ratingEmoji =
                  ex.exercise_rating === 'happy'
                    ? '😊'
                    : ex.exercise_rating === 'meh'
                      ? '😐'
                      : '😞';
                performanceHistoryText += `, Rating: ${ratingEmoji} (${ex.exercise_rating})`;
              }
              performanceHistoryText += '\n';
              if (ex.exercise_notes) {
                performanceHistoryText += `    Notes: ${ex.exercise_notes}\n`;
              } else if (ex.notes) {
                performanceHistoryText += `    Notes: ${ex.notes}\n`;
              }
              // Include per-round data if available
              if (ex.rounds && ex.rounds.length > 0) {
                performanceHistoryText += `    Round Details:\n`;
                ex.rounds.forEach((round) => {
                  performanceHistoryText += `      Round ${round.round_number}: `;
                  if (round.reps)
                    performanceHistoryText += `${round.reps} reps, `;
                  if (round.weight)
                    performanceHistoryText += `${round.weight}, `;
                  if (round.rir !== undefined)
                    performanceHistoryText += `RIR ${round.rir}`;
                  performanceHistoryText += '\n';
                });
              }
            });
          }

          if (actualWorkout.trainer_observations) {
            performanceHistoryText += `- Trainer Observations: ${actualWorkout.trainer_observations}\n`;
          }
          if (actualWorkout.session_notes) {
            performanceHistoryText += `- Session Notes: ${actualWorkout.session_notes}\n`;
          }
        } else {
          performanceHistoryText += `- Status: Not completed\n`;
        }
        performanceHistoryText += '\n';
      }
    }
  }

  const prompt = `You are an expert personal trainer generating workouts for WEEK ${targetWeek} of a 6-week training program.

## Original Client Context

**Selected Persona:** ${recommendation.client_type}
**Sessions Per Week:** ${recommendation.sessions_per_week}
**Session Length:** ${recommendation.session_length_minutes} minutes
**Training Style:** ${recommendation.training_style}
**Original Plan Structure:** ${JSON.stringify(recommendation.plan_structure, null, 2)}
**Original AI Reasoning:** ${recommendation.ai_reasoning || 'N/A'}

${performanceHistoryText}

${clientInfoText ? `${clientInfoText}\n\n` : ''}## Client Questionnaire

${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}
${coachPersonaBlock(trainerPersonaInjection)}## Instructions

Generate workouts for WEEK ${targetWeek} ONLY (${sessionsPerWeek} total sessions). These workouts should:

1. **Build on previous weeks' performance:**
   - Adjust difficulty based on actual RIR and performance data
   - Address any issues noted in trainer observations
   - Progress appropriately based on what the client actually achieved
   - Maintain client engagement and motivation

2. **Follow the original plan structure** while adapting to real-world results:
   - Stay true to the original training style and approach
   - Maintain the overall progression strategy
   - Adjust volume/intensity based on actual performance

3. **Consider performance feedback:**
   - If client struggled (low RIR, low energy), reduce difficulty or volume
   - If client exceeded expectations (high RIR, high energy), increase challenge appropriately
   - Address specific issues mentioned in trainer observations
   - Build on exercises that worked well

4. **Each workout should include:**
   - Specific exercises with sets, reps, weight/load guidance, rest periods
   - Warmup and cooldown exercises when appropriate
   - Notes on form, tempo, or RIR when relevant
   - Brief reasoning for exercise selection and progression

5. ${GOALS_VS_INJURIES_INSTRUCTION}

**CRITICAL: Generate ONLY Week ${targetWeek} workouts**
- Generate workouts for WEEK ${targetWeek} ONLY, sessions 1-${sessionsPerWeek}
- All workouts must have week_number: ${targetWeek}
- Each exercise must have at least a name
- Be specific with exercise selection - use actual exercise names
- Keep exercise notes and reasoning concise
- Make workouts realistic and achievable based on actual performance

## Output Format

You must respond with a valid JSON object with this structure:

{
  "workouts": [
    {
      "week_number": ${targetWeek},
      "session_number": 1,
      "workout_name": "Upper Body Strength",
      "workout_data": {
        "exercises": [
          {
            "name": "Barbell Bench Press",
            "sets": 4,
            "reps": "6-8",
            "weight": "RIR 2",
            "rest_seconds": 180,
            "notes": "Focus on controlled tempo",
            "rir": 2
          }
        ],
        "warmup": [{"name": "Light Cardio", "notes": "5 minutes"}],
        "cooldown": [{"name": "Static Stretching", "notes": "Focus on chest"}],
        "total_duration_minutes": ${recommendation.session_length_minutes},
        "focus_areas": ["upper body", "push", "strength"]
      },
      "workout_reasoning": "This workout builds on Week ${targetWeek - 1} performance..."
    }
  ]
}

CRITICAL: 
- Respond with ONLY valid JSON. All strings must be properly escaped.
- Generate exactly ${sessionsPerWeek} workouts for WEEK ${targetWeek} ONLY
- All workouts must have "week_number": ${targetWeek}
- Do NOT generate workouts for other weeks
- Keep all text fields SHORT (max 100 characters per field) to prevent truncation
- Exercise notes should be brief (1-2 sentences max)
- Workout reasoning should explain how this week builds on previous performance`;

  const responseContent = await callOpenAIWithRetry(
    [
      {
        role: 'system',
        content:
          'You are an expert personal trainer. You MUST respond with ONLY valid JSON. No markdown code blocks, no explanations, no additional text. All string values must have properly escaped quotes (use \\" for quotes inside strings). Generate ONLY the specified week workouts. Ensure all JSON brackets and braces are properly closed. Keep all text fields concise to avoid truncation.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      maxTokens: 6000,
      maxRetries: 1, // Only retry on rate limits - don't waste tokens on API errors
    }
  );

  console.log(
    `Received week ${targetWeek} workout response (${responseContent.length} characters)`
  );

  const parsed = parseJSONWithRepair<{ workouts: LLMWorkoutResponse[] }>(
    responseContent,
    1, // Only 1 attempt - don't waste tokens on repair retries
    responseContent
  );

  if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
    throw new Error('Invalid workout response: missing workouts array');
  }

  // Validate we got the right number of workouts
  if (parsed.workouts.length !== sessionsPerWeek) {
    console.warn(
      `⚠️  Expected ${sessionsPerWeek} workouts for week ${targetWeek}, got ${parsed.workouts.length}`
    );
  }

  // Validate all workouts are for the target week
  const invalidWeeks = parsed.workouts.filter(
    (w) => w.week_number !== targetWeek
  );
  if (invalidWeeks.length > 0) {
    console.warn(
      `⚠️  Found ${invalidWeeks.length} workouts not for week ${targetWeek}, filtering them out`
    );
    parsed.workouts = parsed.workouts.filter(
      (w) => w.week_number === targetWeek
    );
  }

  console.log(
    `✅ Generated ${parsed.workouts.length} workouts for Week ${targetWeek}`
  );

  return enrichLlmWorkoutsWithExerciseLibrary(parsed.workouts);
}
