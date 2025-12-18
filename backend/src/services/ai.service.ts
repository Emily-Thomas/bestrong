import OpenAI from 'openai';
import type {
  Questionnaire,
  StructuredQuestionnaireData,
  LLMRecommendationResponse,
  LLMWorkoutResponse,
} from '../types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Client archetypes based on trainer's methodology
const CLIENT_ARCHETYPES = {
  REBUILDER: {
    type: 'The Rebuilder',
    description: '40+, post-injury, cautious',
    trainingMethods: [
      'Rehabilitation-Based Functional Training',
      'Low-Impact Strength Circuits',
      'Stability & Mobility Progressions (FRC-inspired)',
    ],
    whyItFits:
      'Rebuilders need controlled intensity and tissue remodeling; they thrive on measurable progress without setbacks. These methods rebuild confidence and function.',
  },
  SERIAL_ATHLETE: {
    type: 'The Serial Athlete',
    description: 'Lifelong competitor',
    trainingMethods: [
      'Concurrent Training (Strength + Endurance)',
      'Undulating Periodization',
      'Performance-Based Conditioning (HIIT/Tempo Runs)',
    ],
    whyItFits:
      'Keeps them stimulated with variety and performance benchmarks. Undulating loads prevent burnout while concurrent training supports hybrid goals.',
  },
  MIDLIFE_TRANSFORMER: {
    type: 'The Midlife Transformer',
    description: 'Career-driven, seeking vitality',
    trainingMethods: [
      'Linear Progression Strength Training',
      'Metabolic Conditioning (MetCon)',
      'Habit-Based Lifestyle Integration',
    ],
    whyItFits:
      'Linear strength builds tangible results, MetCons keep engagement high, and habit integration sustains long-term transformation.',
  },
  GOLDEN_GRINDER: {
    type: 'The Golden Grinder',
    description: '60+, longevity-focused',
    trainingMethods: [
      'Functional Strength Training',
      'Balance & Neuromotor Drills',
      'Zone 2 Cardio Conditioning',
    ],
    whyItFits:
      'Functional patterns improve independence, balance reduces fall risk, and Zone 2 supports heart health and recovery.',
  },
  FUNCTIONALIST: {
    type: 'The Functionalist',
    description: 'Movement-minded, practical strength',
    trainingMethods: [
      'Movement Pattern Periodization',
      'Kettlebell & TRX Integration',
      'Hybrid Mobility Circuits',
    ],
    whyItFits:
      'They crave efficiency and purpose—training should feel like real life. Compound and asymmetrical loads reinforce control and joint resilience.',
  },
  TRANSFORMATION_SEEKER: {
    type: 'The Transformation Seeker',
    description: 'Short-term goal, high emotion',
    trainingMethods: [
      'Body Recomposition Circuits',
      'Linear Strength + HIIT Split',
      'Macro-Driven Program Integration',
    ],
    whyItFits:
      'Needs fast results with visible payoff. These pair calorie-burning structure with sustainable strength outcomes.',
  },
  MAINTENANCE_PRO: {
    type: 'The Maintenance Pro',
    description: 'Advanced, consistent, data-driven',
    trainingMethods: [
      'Autoregulated Hypertrophy (RIR/RPE-based)',
      'Block Periodization',
      'Athlete Monitoring Systems (InBody, HRV, etc.)',
    ],
    whyItFits:
      'Already efficient—focus on fine-tuning. Block periodization keeps novelty; RIR-based training ensures precision without overtraining.',
  },
  OVERWHELMED_BEGINNER: {
    type: 'The Overwhelmed Beginner',
    description: 'Inexperienced, anxious',
    trainingMethods: [
      'Foundational Movement Training',
      'Circuit-Based Full Body Workouts',
      'Progressive Habit Building',
    ],
    whyItFits:
      'Simple, clear, repeatable. Builds confidence, coordination, and comfort in the gym environment.',
  },
  BURNOUT_COMEBACK: {
    type: 'The Burnout Comeback',
    description: 'Ex-athlete, rediscovering joy',
    trainingMethods: [
      'Autoregulatory Strength Training',
      'Play-Based Conditioning (sleds, med balls)',
      'Mindful Mobility & Breathwork',
    ],
    whyItFits:
      'Needs to rekindle enjoyment while avoiding all-or-nothing intensity. Blends creativity with low-pressure structure.',
  },
  DATA_DRIVEN_DEVOTEE: {
    type: 'The Data-Driven Devotee',
    description: 'Analytical, optimization-focused',
    trainingMethods: [
      'Autoregulated Progressive Overload',
      'Concurrent Training with Measurable Metrics',
      'Biofeedback-Integrated Programming (HRV, sleep, strain)',
    ],
    whyItFits:
      'They want systems. Real-time data creates buy-in and accountability while precision keeps them engaged.',
  },
} as const;

/**
 * Parses questionnaire data - supports both old and new formats
 */
function parseQuestionnaireData(
  questionnaire: Questionnaire
): StructuredQuestionnaireData | null {
  // Try to parse new structured format from notes field
  if (questionnaire.notes) {
    try {
      const parsed = JSON.parse(questionnaire.notes);
      // Check if it looks like structured data
      if (parsed.section1_energy_level !== undefined) {
        return parsed as StructuredQuestionnaireData;
      }
    } catch (error) {
      // Not JSON or not structured format, continue
      console.error('Failed to parse questionnaire notes:', error);
    }
  }

  // Return null to indicate old format
  return null;
}

/**
 * Formats questionnaire data for LLM prompt
 */
function formatQuestionnaireForPrompt(
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null
): string {
  let prompt = '## Client Questionnaire Data\n\n';

  if (structuredData) {
    // New structured format
    prompt += '### Section 1 - Starting Point\n';
    prompt += `- Energy Level: ${structuredData.section1_energy_level || 'N/A'}/10\n`;
    prompt += `- Exercise Consistency: ${structuredData.section1_exercise_consistency || 'N/A'}/10\n`;
    prompt += `- Strength Confidence: ${structuredData.section1_strength_confidence || 'N/A'}/10\n`;
    if (structuredData.section1_limiting_factors) {
      prompt += `- Limiting Factors: ${structuredData.section1_limiting_factors}\n`;
    }

    prompt += '\n### Section 2 - Motivation & Mindset\n';
    prompt += `- Motivation: ${structuredData.section2_motivation || 'N/A'}/10\n`;
    prompt += `- Discipline: ${structuredData.section2_discipline || 'N/A'}/10\n`;
    prompt += `- Support Level: ${structuredData.section2_support_level || 'N/A'}/10\n`;
    if (structuredData.section2_what_keeps_going) {
      prompt += `- What Keeps Going: ${structuredData.section2_what_keeps_going}\n`;
    }

    prompt += '\n### Section 3 - Body & Movement\n';
    prompt += `- Pain Limitations: ${structuredData.section3_pain_limitations || 'N/A'}/10\n`;
    prompt += `- Mobility Confidence: ${structuredData.section3_mobility_confidence || 'N/A'}/10\n`;
    prompt += `- Strength Comparison: ${structuredData.section3_strength_comparison || 'N/A'}/10\n`;

    prompt += '\n### Section 4 - Nutrition & Recovery\n';
    prompt += `- Nutrition Alignment: ${structuredData.section4_nutrition_alignment || 'N/A'}/10\n`;
    prompt += `- Meal Consistency: ${structuredData.section4_meal_consistency || 'N/A'}/10\n`;
    prompt += `- Sleep Quality: ${structuredData.section4_sleep_quality || 'N/A'}/10\n`;
    prompt += `- Stress Level: ${structuredData.section4_stress_level || 'N/A'}/10\n`;

    prompt += '\n### Section 5 - Identity & Self-Perception\n';
    prompt += `- Body Connection: ${structuredData.section5_body_connection || 'N/A'}/10\n`;
    prompt += `- Appearance Satisfaction: ${structuredData.section5_appearance_satisfaction || 'N/A'}/10\n`;
    prompt += `- Motivation Driver: ${structuredData.section5_motivation_driver || 'N/A'}/10\n`;
    prompt += `- Sustainability Confidence: ${structuredData.section5_sustainability_confidence || 'N/A'}/10\n`;
    if (structuredData.section5_success_vision) {
      prompt += `- Success Vision: ${structuredData.section5_success_vision}\n`;
    }
  } else {
    // Old format
    prompt += `- Primary Goal: ${questionnaire.primary_goal || 'N/A'}\n`;
    prompt += `- Experience Level: ${questionnaire.experience_level || 'N/A'}\n`;
    prompt += `- Available Days Per Week: ${questionnaire.available_days_per_week || 'N/A'}\n`;
    prompt += `- Preferred Session Length: ${questionnaire.preferred_session_length || 'N/A'} minutes\n`;
    prompt += `- Activity Level: ${questionnaire.activity_level || 'N/A'}\n`;
    prompt += `- Stress Level: ${questionnaire.stress_level || 'N/A'}\n`;
    if (questionnaire.injury_history) {
      prompt += `- Injury History: ${questionnaire.injury_history}\n`;
    }
    if (questionnaire.medical_conditions) {
      prompt += `- Medical Conditions: ${questionnaire.medical_conditions}\n`;
    }
  }

  return prompt;
}

/**
 * Builds the LLM prompt with client personas and questionnaire data
 */
function buildLLMPrompt(
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null
): string {
  const questionnaireText = formatQuestionnaireForPrompt(questionnaire, structuredData);

  const personasText = Object.values(CLIENT_ARCHETYPES)
    .map(
      (archetype) =>
        `**${archetype.type}**\n` +
        `Description: ${archetype.description}\n` +
        `Training Methods: ${archetype.trainingMethods.join(', ')}\n` +
        `Why It Fits: ${archetype.whyItFits}\n`
    )
    .join('\n');

  return `You are an expert personal trainer creating a comprehensive 6-week training program for a client. Your task is to:

1. **Analyze the client's questionnaire data** and select the most appropriate client persona/archetype from the options provided below.

2. **Design a complete training plan** that includes:
   - Sessions per week (typically 2-6)
   - Session length in minutes (typically 30-90)
   - Training style description
   - 6-week plan structure with progression strategy
   - Detailed reasoning for all decisions

3. **Generate actual workouts** for the entire 6-week program. Each workout should include:
   - Specific exercises with sets, reps, weight/load guidance, rest periods
   - Warmup and cooldown exercises when appropriate
   - Notes on form, tempo, or RPE when relevant
   - Reasoning for exercise selection based on the client's needs

## Available Client Personas

${personasText}

## Client Questionnaire

${questionnaireText}

## Instructions

1. **Select the ONE client persona** that best matches this client based on their questionnaire responses. Provide clear reasoning for your selection.

2. **Design the training plan** considering:
   - The selected persona's training methods
   - The client's specific responses (energy, motivation, limitations, etc.)
   - Realistic progression over 6 weeks
   - Sustainability and adherence

3. **Generate ALL workouts** for the 6-week program:
   - For each week, create the specified number of sessions
   - Each workout should be complete with exercises, sets, reps, and guidance
   - Exercises should be appropriate for the client's level and goals
   - Include variety and progression across weeks
   - Consider equipment availability (assume standard gym equipment unless noted otherwise)

4. **Provide detailed reasoning** for:
   - Why this persona was selected
   - Why this training frequency and duration
   - Why these specific exercises and structure
   - How the program progresses over 6 weeks

## Output Format

You must respond with a valid JSON object matching this exact structure:

{
  "client_type": "The [Persona Name]",
  "client_type_reasoning": "Detailed explanation of why this persona was selected...",
  "sessions_per_week": 3,
  "session_length_minutes": 60,
  "training_style": "Description of the training approach...",
  "plan_structure": {
    "archetype": "The [Persona Name]",
    "description": "Brief description",
    "weeks": 6,
    "training_methods": ["Method 1", "Method 2", "Method 3"],
    "weekly_structure": {
      "week1_2": "Description of weeks 1-2 focus",
      "week3_4": "Description of weeks 3-4 focus",
      "week5_6": "Description of weeks 5-6 focus"
    },
    "progression_strategy": "How the program progresses",
    "periodization_approach": "Type of periodization used"
  },
  "ai_reasoning": "Comprehensive reasoning for the entire program design...",
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
            "weight": "RPE 8",
            "rest_seconds": 180,
            "notes": "Focus on controlled tempo, full range of motion",
            "rpe": 8
          }
        ],
        "warmup": [
          {
            "name": "Light Cardio",
            "notes": "5 minutes on bike or rower"
          }
        ],
        "cooldown": [
          {
            "name": "Static Stretching",
            "notes": "Focus on chest, shoulders, triceps"
          }
        ],
        "total_duration_minutes": 60,
        "focus_areas": ["upper body", "push", "strength"]
      },
      "workout_reasoning": "This workout focuses on building upper body strength..."
    }
  ]
}

CRITICAL JSON FORMATTING REQUIREMENTS:
- You MUST respond with ONLY valid JSON, no markdown code blocks, no additional text
- All string values must be properly escaped (use \\" for quotes within strings)
- Keep text fields concise to avoid response truncation
- Ensure all JSON brackets and braces are properly closed
- Do not include any text before or after the JSON object

Important:
- Generate workouts for ALL weeks and ALL sessions (e.g., if sessions_per_week is 3, generate 18 total workouts)
- Each exercise must have at least a name
- Be specific with exercise selection - use actual exercise names
- Consider exercise variety and progression
- Make workouts realistic and achievable for the client's level
- Include proper warmup and cooldown when appropriate
- Keep exercise notes and reasoning concise to fit within token limits`;
}

/**
 * Generates the recommendation structure (without workouts) using OpenAI
 */
async function generateRecommendationStructure(
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null
): Promise<Omit<LLMRecommendationResponse, 'workouts'>> {
  const questionnaireText = formatQuestionnaireForPrompt(questionnaire, structuredData);

  const personasText = Object.values(CLIENT_ARCHETYPES)
    .map(
      (archetype) =>
        `**${archetype.type}**\n` +
        `Description: ${archetype.description}\n` +
        `Training Methods: ${archetype.trainingMethods.join(', ')}\n` +
        `Why It Fits: ${archetype.whyItFits}\n`
    )
    .join('\n');

  const prompt = `You are an expert personal trainer creating a comprehensive 6-week training program for a client.

## Available Client Personas

${personasText}

## Client Questionnaire

${questionnaireText}

## Instructions

1. **Select the ONE client persona** that best matches this client based on their questionnaire responses. Provide clear reasoning for your selection.

2. **Design the training plan** considering:
   - The selected persona's training methods
   - The client's specific responses (energy, motivation, limitations, etc.)
   - Realistic progression over 6 weeks
   - Sustainability and adherence

3. **Determine training parameters**:
   - Sessions per week (typically 2-6)
   - Session length in minutes (typically 30-90)
   - Training style description
   - 6-week plan structure with progression strategy

## Output Format

You must respond with a valid JSON object matching this exact structure:

{
  "client_type": "The [Persona Name]",
  "client_type_reasoning": "Detailed explanation of why this persona was selected...",
  "sessions_per_week": 3,
  "session_length_minutes": 60,
  "training_style": "Description of the training approach...",
  "plan_structure": {
    "archetype": "The [Persona Name]",
    "description": "Brief description",
    "weeks": 6,
    "training_methods": ["Method 1", "Method 2", "Method 3"],
    "weekly_structure": {
      "week1_2": "Description of weeks 1-2 focus",
      "week3_4": "Description of weeks 3-4 focus",
      "week5_6": "Description of weeks 5-6 focus"
    },
    "progression_strategy": "How the program progresses",
    "periodization_approach": "Type of periodization used"
  },
  "ai_reasoning": "Comprehensive reasoning for the entire program design..."
}

CRITICAL: Respond with ONLY valid JSON, no markdown, no additional text.`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert personal trainer. Respond with ONLY valid JSON, no markdown, no additional text.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
    max_tokens: 4000,
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error('No response from OpenAI');
  }

  let cleanedContent = responseContent.trim();
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleanedContent) as Omit<LLMRecommendationResponse, 'workouts'>;

  if (!parsed.client_type || typeof parsed.sessions_per_week !== 'number') {
    throw new Error('Invalid recommendation structure from OpenAI');
  }

  return parsed;
}

/**
 * Generates workouts for WEEK 1 ONLY of a recommendation
 * This keeps token usage manageable and allows for progressive generation later
 */
async function generateWorkouts(
  recommendation: Omit<LLMRecommendationResponse, 'workouts'>,
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null
): Promise<LLMWorkoutResponse[]> {
  const questionnaireText = formatQuestionnaireForPrompt(questionnaire, structuredData);
  const week1Workouts = recommendation.sessions_per_week; // Only week 1

  const prompt = `You are an expert personal trainer generating detailed workouts for WEEK 1 of a 6-week training program.

## Client Context

**Selected Persona:** ${recommendation.client_type}
**Sessions Per Week:** ${recommendation.sessions_per_week}
**Session Length:** ${recommendation.session_length_minutes} minutes
**Training Style:** ${recommendation.training_style}

## Client Questionnaire

${questionnaireText}

## Instructions

Generate ONLY WEEK 1 workouts (${week1Workouts} total sessions for week 1). Each workout should include:
- Specific exercises with sets, reps, weight/load guidance, rest periods
- Warmup and cooldown exercises when appropriate
- Notes on form, tempo, or RPE when relevant
- Brief reasoning for exercise selection

**CRITICAL: Generate ONLY Week 1 workouts**
- Generate workouts for WEEK 1 ONLY, sessions 1-${recommendation.sessions_per_week}
- All workouts must have week_number: 1
- Each exercise must have at least a name
- Be specific with exercise selection - use actual exercise names
- These are foundational workouts to establish the program
- Keep exercise notes and reasoning concise
- Make workouts realistic and achievable for the client's level

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
            "weight": "RPE 8",
            "rest_seconds": 180,
            "notes": "Focus on controlled tempo",
            "rpe": 8
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
- Do NOT generate workouts for weeks 2-6`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert personal trainer. Respond with ONLY valid JSON, no markdown, no additional text. All strings must be properly escaped. Generate ONLY Week 1 workouts.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
    max_tokens: 8000, // Reduced since we're only generating week 1
  });

  if (completion.choices[0]?.finish_reason === 'length') {
    throw new Error('Workout response too long - token limit exceeded');
  }

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error('No workout response from OpenAI');
  }

  let cleanedContent = responseContent.trim();
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  console.log(`Received workout response (${cleanedContent.length} characters)`);

  let parsed: { workouts: LLMWorkoutResponse[] };
  try {
    parsed = JSON.parse(cleanedContent) as { workouts: LLMWorkoutResponse[] };
  } catch (parseError) {
    console.error('JSON Parse Error in workouts:');
    console.error('Response length:', cleanedContent.length);
    if (parseError instanceof SyntaxError) {
      const match = parseError.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1], 10);
        const start = Math.max(0, position - 200);
        const end = Math.min(cleanedContent.length, position + 200);
        console.error('Error context:', cleanedContent.substring(start, end));
      }
    }
    throw new Error(`Invalid JSON in workout response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }

  if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
    throw new Error('Invalid workout response: missing workouts array');
  }

  // Validate we got the right number of workouts for week 1
  if (parsed.workouts.length !== week1Workouts) {
    console.warn(`⚠️  Expected ${week1Workouts} workouts for week 1, got ${parsed.workouts.length}`);
  }

  // Validate all workouts are for week 1
  const invalidWeeks = parsed.workouts.filter(w => w.week_number !== 1);
  if (invalidWeeks.length > 0) {
    console.warn(`⚠️  Found ${invalidWeeks.length} workouts not for week 1, filtering them out`);
    parsed.workouts = parsed.workouts.filter(w => w.week_number === 1);
  }

  console.log(`✅ Generated ${parsed.workouts.length} workouts for Week 1`);

  return parsed.workouts;
}

/**
 * Generates a recommendation using OpenAI with structured output
 * Uses a two-step approach: first generate structure, then workouts
 */
export async function generateRecommendationWithAI(
  questionnaire: Questionnaire
): Promise<LLMRecommendationResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please configure it to use AI recommendations.'
    );
  }

  const structuredData = parseQuestionnaireData(questionnaire);

  try {
    console.log('Step 1: Generating recommendation structure...');
    // Step 1: Generate the recommendation structure (without workouts)
    const recommendation = await generateRecommendationStructure(questionnaire, structuredData);

    console.log(`Step 2: Generating Week 1 workouts (${recommendation.sessions_per_week} sessions)...`);
    // Step 2: Generate workouts for Week 1 only (to keep token usage manageable)
    const workouts = await generateWorkouts(recommendation, questionnaire, structuredData);

    console.log(`✅ Successfully generated recommendation with ${workouts.length} Week 1 workouts`);

    return {
      ...recommendation,
      workouts,
    };
  } catch (error) {
    console.error('Error generating AI recommendation:', error);
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
