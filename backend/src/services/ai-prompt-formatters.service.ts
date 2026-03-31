import type { Client, InBodyScan } from '../types';

// Client archetypes based on trainer's methodology
export const CLIENT_ARCHETYPES = {
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
      'Autoregulated Hypertrophy (RIR-based)',
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
 * Formats client information for inclusion in LLM prompt
 */
export function formatClientInfoForPrompt(client: Client | null): string {
  if (!client) {
    return '';
  }

  let text = `## Client Information\n\n`;

  if (client.date_of_birth) {
    const birthDate =
      typeof client.date_of_birth === 'string'
        ? new Date(client.date_of_birth)
        : client.date_of_birth;
    text += `- Date of Birth: ${birthDate.toLocaleDateString()}\n`;
  }

  text += `\nConsider the client's age (calculate from date of birth) when:
- Selecting age-appropriate exercises and training methods
- Setting realistic progression expectations based on age
- Adjusting recovery time and training frequency
- Choosing appropriate intensity levels
- Designing programs that account for age-related factors (mobility, recovery, etc.)`;

  return text;
}

/**
 * Formats InBody scan data for inclusion in LLM prompt
 */
export function formatInBodyScanForPrompt(scan: InBodyScan | null): string {
  if (!scan) {
    return '';
  }

  let text = `## Client Body Composition (InBody Scan)

The client's latest InBody scan shows:`;

  // Helper function to safely convert to number and format
  // PostgreSQL may return numeric values as strings, so we need to handle both
  const formatNumber = (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      if (value.trim() === '') return null;
      const num = parseFloat(value);
      if (Number.isNaN(num) || !Number.isFinite(num)) return null;
      return num.toFixed(1);
    }
    if (typeof value === 'number') {
      if (Number.isNaN(value) || !Number.isFinite(value)) return null;
      return value.toFixed(1);
    }
    // Try to convert other types
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isFinite(num)) return null;
    return num.toFixed(1);
  };

  const weight = formatNumber(scan.weight_lbs);
  if (weight !== null) {
    text += `\n- Weight: ${weight} lbs`;
  }
  const smm = formatNumber(scan.smm_lbs);
  if (smm !== null) {
    text += `\n- Skeletal Muscle Mass (SMM): ${smm} lbs`;
  }
  const bodyFatMass = formatNumber(scan.body_fat_mass_lbs);
  if (bodyFatMass !== null) {
    text += `\n- Body Fat Mass: ${bodyFatMass} lbs`;
  }
  const bmi = formatNumber(scan.bmi);
  if (bmi !== null) {
    text += `\n- BMI: ${bmi}`;
  }
  const percentBodyFat = formatNumber(scan.percent_body_fat);
  if (percentBodyFat !== null) {
    text += `\n- Percent Body Fat: ${percentBodyFat}%`;
  }

  if (scan.segment_analysis) {
    text += `\n\nSegment Analysis:`;
    const segments = [
      { key: 'right_arm', label: 'Right Arm' },
      { key: 'left_arm', label: 'Left Arm' },
      { key: 'trunk', label: 'Trunk' },
      { key: 'right_leg', label: 'Right Leg' },
      { key: 'left_leg', label: 'Left Leg' },
    ];

    // Helper function to safely convert to number and format
    // PostgreSQL may return numeric values as strings, so we need to handle both
    const formatSegmentNumber = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        if (value.trim() === '') return null;
        const num = parseFloat(value);
        if (Number.isNaN(num) || !Number.isFinite(num)) return null;
        return num.toFixed(1);
      }
      if (typeof value === 'number') {
        if (Number.isNaN(value) || !Number.isFinite(value)) return null;
        return value.toFixed(1);
      }
      // Try to convert other types
      const num = Number(value);
      if (Number.isNaN(num) || !Number.isFinite(num)) return null;
      return num.toFixed(1);
    };

    for (const segment of segments) {
      const data =
        scan.segment_analysis[
          segment.key as keyof typeof scan.segment_analysis
        ];
      if (data && typeof data === 'object') {
        const parts: string[] = [];
        const muscleMass = formatSegmentNumber(data.muscle_mass_lbs);
        if (muscleMass !== null) {
          parts.push(`${muscleMass} lbs muscle`);
        }
        const fatMass = formatSegmentNumber(data.fat_mass_lbs);
        if (fatMass !== null) {
          parts.push(`${fatMass} lbs fat`);
        }
        const percentFat = formatSegmentNumber(data.percent_fat);
        if (percentFat !== null) {
          parts.push(`${percentFat}% fat`);
        }
        if (parts.length > 0) {
          text += `\n- ${segment.label}: ${parts.join(', ')}`;
        }
      }
    }
  }

  text += `\n\nConsider this body composition when:
- Selecting appropriate training intensity based on current muscle mass and body fat levels
- Choosing exercises that match current muscle mass distribution
- Setting realistic progression goals that account for body composition
- Adjusting volume and load based on body composition metrics
- Designing programs that address any muscle imbalances indicated by segment analysis`;

  return text;
}

export function coachPersonaBlock(injection?: string): string {
  const t = injection?.trim();
  if (!t) return '';
  return `## Coach persona (apply this coaching style and bias throughout)\n\n${t}\n\n`;
}
