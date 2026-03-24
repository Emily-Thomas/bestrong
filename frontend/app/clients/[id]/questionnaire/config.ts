import type { Section } from './types';

export const GOAL_OPTIONS = [
  { value: 'build_strength', label: 'Build strength' },
  { value: 'build_muscle', label: 'Build muscle / hypertrophy' },
  { value: 'lose_fat', label: 'Lose body fat' },
  { value: 'general_health', label: 'General health & longevity' },
  { value: 'performance', label: 'Sport / performance' },
  { value: 'pain_reduction', label: 'Reduce pain / move better' },
  { value: 'energy', label: 'More energy & stamina' },
] as const;

export const QUESTIONNAIRE_SECTIONS: Section[] = [
  {
    title: 'Safety screening',
    description:
      'These yes/no questions follow common pre-exercise screening. Answer honestly; a “yes” may mean you should check with a clinician before ramping up activity.',
    questions: [
      {
        type: 'yes_no',
        fieldName: 'parq_chest_pain',
        label:
          'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
      },
      {
        type: 'yes_no',
        fieldName: 'parq_resting_bp',
        label: 'Do you feel pain in your chest when you do physical activity?',
      },
      {
        type: 'yes_no',
        fieldName: 'parq_dizziness',
        label:
          'In the past month, have you had chest pain when you were not doing physical activity?',
      },
      {
        type: 'yes_no',
        fieldName: 'parq_bone_joint',
        label:
          'Do you lose your balance because of dizziness or do you ever lose consciousness?',
      },
      {
        type: 'yes_no',
        fieldName: 'parq_heart_meds',
        label:
          'Do you have a bone or joint problem that could be made worse by a change in your physical activity?',
      },
      {
        type: 'yes_no',
        fieldName: 'parq_other_reason',
        label:
          'Is your doctor currently prescribing drugs (for example, water pills) for blood pressure or heart condition?',
      },
      {
        type: 'yes_no',
        fieldName: 'parq_extra',
        label:
          'Do you know of any other reason why you should not do physical activity?',
      },
      {
        type: 'textarea',
        fieldName: 'parq_health_note',
        label: 'Anything else about your health we should know? (optional)',
        placeholder: 'Medications, conditions, or recent changes…',
        rows: 3,
      },
    ],
  },
  {
    title: 'Daily life & background',
    description: 'How life outside the gym affects training and recovery.',
    questions: [
      {
        type: 'single_choice',
        fieldName: 'work_pattern',
        label: 'What best describes your typical work day?',
        options: [
          { value: 'mostly_sitting', label: 'Mostly sitting / desk' },
          { value: 'hybrid', label: 'Hybrid (mix of sitting and moving)' },
          { value: 'on_feet', label: 'On your feet most of the day' },
          { value: 'heavy_labor', label: 'Heavy physical labor' },
        ],
      },
      {
        type: 'single_choice',
        fieldName: 'walking_frequency',
        label: 'How often do you walk or move outside structured workouts?',
        options: [
          { value: 'rarely', label: 'Rarely' },
          { value: 'sometimes', label: 'Sometimes' },
          { value: 'most_days', label: 'Most days' },
          { value: 'daily', label: 'Daily' },
        ],
      },
      {
        type: 'textarea',
        fieldName: 'other_sports_text',
        label:
          'Other sports, classes, or cardio you do outside the gym (optional)',
        placeholder: 'e.g. running 2x/week, rec league soccer…',
        rows: 2,
      },
      {
        type: 'textarea',
        fieldName: 'training_background',
        label: 'Training history (experience with lifting, sports, etc.)',
        placeholder:
          'Beginner / returning after a break / competitive background…',
        rows: 3,
      },
    ],
  },
  {
    title: 'Motivation & habits',
    description: 'What helps you stick with a plan.',
    questions: [
      {
        type: 'single_choice',
        fieldName: 'motivation_adherence',
        label:
          'In the last month, how often did you stick to planned workouts?',
        options: [
          { value: 'never', label: 'Never' },
          { value: 'rarely', label: 'Rarely' },
          { value: 'sometimes', label: 'Sometimes' },
          { value: 'usually', label: 'Usually' },
          { value: 'always', label: 'Always' },
        ],
      },
      {
        type: 'textarea',
        fieldName: 'motivation_barriers',
        label:
          'Biggest barriers to consistency (time, stress, motivation, etc.)',
        placeholder: 'Be honest — this helps us program realistically.',
        rows: 3,
      },
    ],
  },
  {
    title: 'Pain & injuries',
    description: 'So we can program around limitations without guessing.',
    questions: [
      {
        type: 'yes_no',
        fieldName: 'has_pain_or_injury',
        label:
          'Do you currently have pain, an injury, or a movement limitation we should know about?',
      },
    ],
  },
  {
    title: 'Injury details',
    description: 'Only if you answered yes above.',
    showWhen: (d) => d.has_pain_or_injury === true,
    questions: [
      {
        type: 'textarea',
        fieldName: 'injury_region',
        label: 'Where / what area?',
        placeholder: 'e.g. low back, right shoulder…',
        rows: 2,
      },
      {
        type: 'textarea',
        fieldName: 'injury_timeline',
        label: 'How long has this been going on?',
        placeholder: 'e.g. 3 weeks, ongoing for years…',
        rows: 2,
      },
      {
        type: 'textarea',
        fieldName: 'injury_aggravates',
        label: 'What tends to make it worse?',
        placeholder: 'Movements, positions, loads…',
        rows: 2,
      },
      {
        type: 'textarea',
        fieldName: 'injury_helps',
        label: 'What tends to help?',
        placeholder: 'Rest, heat, mobility, meds…',
        rows: 2,
      },
      {
        type: 'yes_no',
        fieldName: 'injury_red_flags',
        label:
          'Any red-flag symptoms (e.g. numbness, night pain, unexplained weight loss, fever with joint pain)?',
      },
      {
        type: 'single_choice',
        fieldName: 'injury_cleared',
        label: 'Cleared by a clinician for exercise as you described?',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'unsure', label: 'Unsure' },
        ],
      },
      {
        type: 'textarea',
        fieldName: 'injury_notes',
        label:
          'Anything else we should know (diagnosis, imaging, prior rehab)?',
        placeholder: 'Optional details…',
        rows: 3,
      },
    ],
  },
  {
    title: 'Eating, sleep & stress',
    description: 'High-level habits — not judgment, just context.',
    questions: [
      {
        type: 'single_choice',
        fieldName: 'meals_per_day',
        label: 'Roughly how many meals / eating occasions per day?',
        options: [
          { value: '1_2', label: '1–2' },
          { value: '3', label: '3' },
          { value: '4_plus', label: '4+' },
        ],
      },
      {
        type: 'single_choice',
        fieldName: 'protein_level',
        label: 'Protein intake (awareness / typical day)',
        options: [
          { value: 'low', label: 'Low / unsure' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'high', label: 'High (consistent protein most meals)' },
        ],
      },
      {
        type: 'single_choice',
        fieldName: 'vegetables_frequency',
        label: 'Vegetables most days?',
        options: [
          { value: 'rarely', label: 'Rarely' },
          { value: 'sometimes', label: 'Sometimes' },
          { value: 'often', label: 'Often' },
        ],
      },
      {
        type: 'single_choice',
        fieldName: 'alcohol_frequency',
        label: 'Alcohol',
        options: [
          { value: 'none', label: 'None / almost none' },
          { value: 'light', label: 'Light (1–3 drinks/week)' },
          { value: 'moderate', label: 'Moderate+' },
        ],
      },
      {
        type: 'textarea',
        fieldName: 'nutrition_notes',
        label:
          'Typical weekday eating or biggest nutrition struggle (optional)',
        placeholder: 'Optional…',
        rows: 2,
      },
      {
        type: 'single_choice',
        fieldName: 'sleep_quality_bucket',
        label: 'Sleep quality lately',
        options: [
          { value: 'poor', label: 'Poor' },
          { value: 'fair', label: 'Fair' },
          { value: 'good', label: 'Good' },
          { value: 'great', label: 'Great' },
        ],
      },
      {
        type: 'single_choice',
        fieldName: 'stress_level_bucket',
        label: 'Stress level lately',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'high', label: 'High' },
          { value: 'very_high', label: 'Very high' },
        ],
      },
    ],
  },
  {
    title: 'Goals & logistics',
    description:
      'Training happens at your coach’s facility. Pick what matters most for the next phase.',
    questions: [
      {
        type: 'multi_select',
        fieldName: 'goal_categories',
        label: 'What are you training for? (select all that apply)',
        options: [...GOAL_OPTIONS],
      },
      {
        type: 'textarea',
        fieldName: 'primary_goal_label',
        label: 'If you had to pick one priority goal for the next 8–12 weeks',
        placeholder: 'One sentence…',
        rows: 2,
      },
      {
        type: 'textarea',
        fieldName: 'goal_timeline',
        label: 'Timeline or milestone (optional)',
        placeholder: 'e.g. event date, vacation…',
        rows: 2,
      },
      {
        type: 'textarea',
        fieldName: 'success_definition',
        label: 'What would “success” look like for you?',
        placeholder: 'Describe outcomes you care about…',
        rows: 3,
      },
      {
        type: 'number',
        fieldName: 'available_days_per_week',
        label: 'Days per week you can train',
        min: 1,
        max: 7,
        step: 1,
      },
      {
        type: 'single_choice',
        fieldName: 'preferred_session_length',
        label: 'Preferred session length (minutes)',
        options: [
          { value: '30', label: '30' },
          { value: '45', label: '45' },
          { value: '60', label: '60' },
        ],
      },
      {
        type: 'slider',
        fieldName: 'readiness_confidence',
        label: 'Confidence you can stick to the plan (1 = low, 5 = high)',
        minLabel: '1',
        maxLabel: '5',
        min: 1,
        max: 5,
        defaultValue: 3,
      },
    ],
  },
];
