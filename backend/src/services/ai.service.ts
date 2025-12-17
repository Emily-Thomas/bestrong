import type { Questionnaire, StructuredQuestionnaireData } from '../types';

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

interface ClientTypeAnalysis {
  type: string;
  sessionsPerWeek: number;
  sessionLength: number;
  trainingStyle: string;
  reasoning: string;
  planStructure: Record<string, unknown>;
}

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
        console.log('✅ Parsed structured questionnaire data:', {
          has_section1: !!parsed.section1_energy_level,
          has_section2: !!parsed.section2_motivation,
          has_section3: !!parsed.section3_pain_limitations,
          section1_energy: parsed.section1_energy_level,
          section2_motivation: parsed.section2_motivation,
        });
        return parsed as StructuredQuestionnaireData;
      } else {
        console.log('⚠️ Notes is JSON but not structured format');
      }
    } catch (error) {
      // Not JSON or not structured format, continue to old format
      console.error('❌ Failed to parse questionnaire notes:', error);
      console.log(
        'Notes content (first 200 chars):',
        questionnaire.notes?.substring(0, 200)
      );
    }
  } else {
    console.log('⚠️ No notes field in questionnaire, using old format');
  }

  // Return null to indicate old format
  return null;
}

/**
 * Analyzes questionnaire to determine client archetype and generate recommendation
 * Supports both old and new questionnaire formats
 */
export async function generateRecommendation(
  questionnaire: Questionnaire
): Promise<ClientTypeAnalysis> {
  const structuredData = parseQuestionnaireData(questionnaire);

  // Use new structured format if available
  if (structuredData) {
    const archetype = determineArchetypeFromStructured(structuredData);
    return generateRecommendationForArchetype(
      archetype,
      structuredData,
      questionnaire
    );
  }

  // Fall back to old format
  const archetype = determineArchetypeFromOldFormat(questionnaire);
  return generateRecommendationForArchetype(archetype, null, questionnaire);
}

/**
 * Determine client archetype from new structured questionnaire format
 */
function determineArchetypeFromStructured(
  data: StructuredQuestionnaireData
): string {
  const energy = data.section1_energy_level || 5;
  const consistency = data.section1_exercise_consistency || 5;
  const strengthConfidence = data.section1_strength_confidence || 5;
  const painLimitations = data.section3_pain_limitations || 5;
  const mobilityConfidence = data.section3_mobility_confidence || 5;
  const strengthComparison = data.section3_strength_comparison || 5;
  const motivation = data.section2_motivation || 5;
  const discipline = data.section2_discipline || 5;
  const stressLevel = data.section4_stress_level || 5;
  const nutritionAlignment = data.section4_nutrition_alignment || 5;
  const bodyConnection = data.section5_body_connection || 5;
  const appearanceSatisfaction = data.section5_appearance_satisfaction || 5;
  const motivationDriver = data.section5_motivation_driver || 5;
  const sustainabilityConfidence = data.section5_sustainability_confidence || 5;

  console.log('Determining archetype with scores:', {
    energy,
    consistency,
    strengthConfidence,
    painLimitations,
    mobilityConfidence,
    strengthComparison,
    motivation,
    discipline,
    stressLevel,
    nutritionAlignment,
    bodyConnection,
    appearanceSatisfaction,
    motivationDriver,
    sustainabilityConfidence,
  });

  // 1. The Rebuilder (40+, post-injury, cautious)
  // High pain limitations, low mobility confidence, cautious approach
  if (painLimitations <= 4 && mobilityConfidence <= 5) {
    return CLIENT_ARCHETYPES.REBUILDER.type;
  }

  // 2. The Serial Athlete (lifelong competitor)
  // High strength comparison, high motivation, high discipline, performance-driven
  if (
    strengthComparison >= 8 &&
    motivation >= 8 &&
    discipline >= 8 &&
    motivationDriver >= 7
  ) {
    return CLIENT_ARCHETYPES.SERIAL_ATHLETE.type;
  }

  // 3. The Midlife Transformer (career-driven, seeking vitality)
  // Moderate experience, high motivation, moderate-high stress, appearance-focused initially
  // More lenient: moderate strength, decent motivation, not too stressed
  // This should catch most middle-ground cases
  if (
    strengthConfidence >= 4 &&
    strengthConfidence <= 7 &&
    motivation >= 5 &&
    stressLevel <= 7
  ) {
    return CLIENT_ARCHETYPES.MIDLIFE_TRANSFORMER.type;
  }

  // 4. The Golden Grinder (60+, longevity-focused)
  // Lower energy, lower strength comparison, but high sustainability confidence, longevity-focused
  if (
    energy <= 6 &&
    strengthComparison <= 6 &&
    sustainabilityConfidence >= 7 &&
    motivationDriver >= 7
  ) {
    return CLIENT_ARCHETYPES.GOLDEN_GRINDER.type;
  }

  // 5. The Functionalist (movement-minded, practical strength)
  // High mobility confidence, moderate strength, body connection focused
  if (
    mobilityConfidence >= 6 &&
    strengthConfidence >= 5 &&
    bodyConnection >= 6
  ) {
    return CLIENT_ARCHETYPES.FUNCTIONALIST.type;
  }

  // 6. The Transformation Seeker (short-term goal, high emotion)
  // High motivation, lower sustainability confidence, appearance-focused, high emotion
  if (
    motivation >= 7 &&
    sustainabilityConfidence <= 6 &&
    appearanceSatisfaction <= 6
  ) {
    return CLIENT_ARCHETYPES.TRANSFORMATION_SEEKER.type;
  }

  // 7. The Maintenance Pro (advanced, consistent, data-driven)
  // High strength, high consistency, high discipline, data-driven
  if (
    strengthConfidence >= 8 &&
    consistency >= 8 &&
    discipline >= 8 &&
    nutritionAlignment >= 7
  ) {
    return CLIENT_ARCHETYPES.MAINTENANCE_PRO.type;
  }

  // 8. The Overwhelmed Beginner (inexperienced, anxious)
  // Low strength confidence, low consistency, low energy, anxious
  if (
    strengthConfidence <= 4 &&
    consistency <= 4 &&
    energy <= 5 &&
    discipline <= 5
  ) {
    return CLIENT_ARCHETYPES.OVERWHELMED_BEGINNER.type;
  }

  // 9. The Burnout Comeback (ex-athlete, rediscovering joy)
  // High past strength but current lower, moderate motivation, seeking balance
  if (
    strengthComparison >= 6 &&
    strengthConfidence >= 5 &&
    strengthConfidence <= 7 &&
    motivation >= 5 &&
    motivation <= 8
  ) {
    return CLIENT_ARCHETYPES.BURNOUT_COMEBACK.type;
  }

  // 10. The Data-Driven Devotee (analytical, optimization-focused)
  // High discipline, high consistency, moderate-high strength, analytical
  if (
    discipline >= 6 &&
    consistency >= 6 &&
    strengthConfidence >= 5 &&
    nutritionAlignment >= 6
  ) {
    return CLIENT_ARCHETYPES.DATA_DRIVEN_DEVOTEE.type;
  }

  // Default fallback based on most common patterns
  // Check these in order of likelihood - be more lenient
  if (strengthConfidence <= 4 && consistency <= 4) {
    return CLIENT_ARCHETYPES.OVERWHELMED_BEGINNER.type;
  }
  if (strengthConfidence >= 8 && consistency >= 7) {
    return CLIENT_ARCHETYPES.MAINTENANCE_PRO.type;
  }
  if (mobilityConfidence >= 6 && bodyConnection >= 6) {
    return CLIENT_ARCHETYPES.FUNCTIONALIST.type;
  }
  if (motivation >= 5) {
    // Most people with any motivation fall here
    return CLIENT_ARCHETYPES.MIDLIFE_TRANSFORMER.type;
  }
  // Final default for very low motivation
  return CLIENT_ARCHETYPES.OVERWHELMED_BEGINNER.type;
}

/**
 * Determine archetype from old questionnaire format (backward compatibility)
 */
function determineArchetypeFromOldFormat(questionnaire: Questionnaire): string {
  const {
    experience_level,
    primary_goal,
    activity_level,
    injury_history,
    medical_conditions,
    available_days_per_week,
    stress_level,
  } = questionnaire;

  // Injury/Medical conditions -> Rebuilder
  if (injury_history || medical_conditions) {
    return CLIENT_ARCHETYPES.REBUILDER.type;
  }

  // Beginner -> Overwhelmed Beginner
  if (experience_level === 'beginner') {
    return CLIENT_ARCHETYPES.OVERWHELMED_BEGINNER.type;
  }

  // Advanced + very active -> Serial Athlete or Maintenance Pro
  if (experience_level === 'advanced' && activity_level === 'very_active') {
    return CLIENT_ARCHETYPES.SERIAL_ATHLETE.type;
  }

  // High stress + limited time -> Midlife Transformer
  if (
    stress_level === 'high' &&
    available_days_per_week &&
    available_days_per_week <= 3
  ) {
    return CLIENT_ARCHETYPES.MIDLIFE_TRANSFORMER.type;
  }

  // Default
  return CLIENT_ARCHETYPES.MIDLIFE_TRANSFORMER.type;
}

function generateRecommendationForArchetype(
  archetype: string,
  structuredData: StructuredQuestionnaireData | null,
  questionnaire: Questionnaire
): ClientTypeAnalysis {
  // Get archetype config
  const archetypeConfig =
    Object.values(CLIENT_ARCHETYPES).find((a) => a.type === archetype) ||
    CLIENT_ARCHETYPES.MIDLIFE_TRANSFORMER;

  // Calculate sessions and length from structured data if available
  let sessionsPerWeek = 3;
  let sessionLength = 60;
  const trainingStyle = archetypeConfig.trainingMethods.join(' • ');
  let reasoning = archetypeConfig.whyItFits;
  let planStructure: Record<string, unknown> = {};

  // Use structured data if available
  if (structuredData) {
    const motivation = structuredData.section2_motivation || 5;
    const discipline = structuredData.section2_discipline || 5;
    const energy = structuredData.section1_energy_level || 5;
    const consistency = structuredData.section1_exercise_consistency || 5;

    // Archetype-specific session calculations
    switch (archetype) {
      case CLIENT_ARCHETYPES.REBUILDER.type:
        sessionsPerWeek = 2;
        sessionLength = 45;
        break;
      case CLIENT_ARCHETYPES.SERIAL_ATHLETE.type:
        sessionsPerWeek = Math.max(4, Math.min(6, Math.floor(motivation / 2)));
        sessionLength = 75;
        break;
      case CLIENT_ARCHETYPES.MIDLIFE_TRANSFORMER.type:
        sessionsPerWeek = Math.min(4, Math.max(3, Math.floor(motivation / 2)));
        sessionLength = 50;
        break;
      case CLIENT_ARCHETYPES.GOLDEN_GRINDER.type:
        sessionsPerWeek = 3;
        sessionLength = 45;
        break;
      case CLIENT_ARCHETYPES.FUNCTIONALIST.type:
        sessionsPerWeek = Math.max(3, Math.min(4, Math.floor(consistency / 2)));
        sessionLength = 55;
        break;
      case CLIENT_ARCHETYPES.TRANSFORMATION_SEEKER.type:
        sessionsPerWeek = Math.min(5, Math.max(4, Math.floor(motivation / 2)));
        sessionLength = 60;
        break;
      case CLIENT_ARCHETYPES.MAINTENANCE_PRO.type:
        sessionsPerWeek = Math.max(4, Math.min(6, Math.floor(discipline / 2)));
        sessionLength = 75;
        break;
      case CLIENT_ARCHETYPES.OVERWHELMED_BEGINNER.type:
        sessionsPerWeek = 2;
        sessionLength = 30;
        break;
      case CLIENT_ARCHETYPES.BURNOUT_COMEBACK.type:
        sessionsPerWeek = Math.min(3, Math.max(2, Math.floor(motivation / 3)));
        sessionLength = 50;
        break;
      case CLIENT_ARCHETYPES.DATA_DRIVEN_DEVOTEE.type:
        sessionsPerWeek = Math.max(4, Math.min(5, Math.floor(discipline / 2)));
        sessionLength = 60;
        break;
      default:
        sessionsPerWeek = 3;
        sessionLength = 50;
    }
  } else {
    // Old format fallback
    sessionsPerWeek = questionnaire.available_days_per_week || 3;
    sessionLength = questionnaire.preferred_session_length || 60;
  }

  // Generate plan structure based on archetype
  planStructure = {
    archetype: archetypeConfig.type,
    description: archetypeConfig.description,
    weeks: 6,
    training_methods: archetypeConfig.trainingMethods,
    weekly_structure: generateWeeklyStructure(
      archetype,
      sessionsPerWeek,
      sessionLength
    ),
  };

  // Add client insights from structured data if available
  if (structuredData) {
    const insights: string[] = [];
    if (structuredData.section1_limiting_factors) {
      insights.push(
        `Limiting factors: ${structuredData.section1_limiting_factors}`
      );
    }
    if (structuredData.section2_what_keeps_going) {
      insights.push(
        `Motivation driver: ${structuredData.section2_what_keeps_going}`
      );
    }
    if (structuredData.section5_success_vision) {
      insights.push(
        `Success vision: ${structuredData.section5_success_vision}`
      );
    }

    if (insights.length > 0) {
      reasoning += '\n\nClient Insights:\n' + insights.join('\n');
    }
  }

  return {
    type: archetypeConfig.type,
    sessionsPerWeek,
    sessionLength,
    trainingStyle,
    reasoning,
    planStructure,
  };
}

/**
 * Generate weekly structure based on archetype
 */
function generateWeeklyStructure(
  archetype: string,
  sessionsPerWeek: number,
  sessionLength: number
): Record<string, string> {
  const structure: Record<string, string> = {};

  switch (archetype) {
    case CLIENT_ARCHETYPES.REBUILDER.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, rehabilitation focus`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, functional progressions`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, controlled strength building`;
      break;

    case CLIENT_ARCHETYPES.SERIAL_ATHLETE.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, concurrent training base`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, undulating periodization`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, performance peak`;
      break;

    case CLIENT_ARCHETYPES.MIDLIFE_TRANSFORMER.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, linear strength foundation`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, MetCon integration`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, habit reinforcement`;
      break;

    case CLIENT_ARCHETYPES.GOLDEN_GRINDER.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, functional patterns`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, balance & neuromotor`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, Zone 2 conditioning`;
      break;

    case CLIENT_ARCHETYPES.FUNCTIONALIST.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, movement pattern focus`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, kettlebell/TRX integration`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, hybrid mobility circuits`;
      break;

    case CLIENT_ARCHETYPES.TRANSFORMATION_SEEKER.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, body recomposition circuits`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, linear strength + HIIT`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, macro-driven integration`;
      break;

    case CLIENT_ARCHETYPES.MAINTENANCE_PRO.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, autoregulated hypertrophy`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, block periodization`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, monitoring systems`;
      break;

    case CLIENT_ARCHETYPES.OVERWHELMED_BEGINNER.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, foundational movements`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, circuit-based full body`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, progressive habit building`;
      break;

    case CLIENT_ARCHETYPES.BURNOUT_COMEBACK.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, autoregulatory strength`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, play-based conditioning`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, mindful mobility`;
      break;

    case CLIENT_ARCHETYPES.DATA_DRIVEN_DEVOTEE.type:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, autoregulated progressive overload`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, concurrent training with metrics`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, biofeedback integration`;
      break;

    default:
      structure.week1_2 = `${sessionsPerWeek} sessions, ${sessionLength}min, general fitness`;
      structure.week3_4 = `${sessionsPerWeek} sessions, ${sessionLength}min, progressive overload`;
      structure.week5_6 = `${sessionsPerWeek} sessions, ${sessionLength}min, skill development`;
  }

  return structure;
}

/**
 * Placeholder for actual AI service integration
 * Replace this with OpenAI, Anthropic, or other AI service
 */
export async function generateRecommendationWithAI(
  questionnaire: Questionnaire
): Promise<ClientTypeAnalysis> {
  // TODO: Integrate with actual AI service
  // Example: OpenAI, Anthropic Claude, etc.
  // For now, using rule-based system above

  return generateRecommendation(questionnaire);
}
