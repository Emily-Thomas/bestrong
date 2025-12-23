import { writeFileSync } from 'fs';
import { join } from 'path';
import pool from '../src/config/database';
import * as clientService from '../src/services/client.service';
import * as questionnaireService from '../src/services/questionnaire.service';
import * as inbodyScanService from '../src/services/inbody-scan.service';
import type { Client, Questionnaire, InBodyScan, StructuredQuestionnaireData } from '../src/types';

// Import the formatting functions (we'll need to make them exportable or duplicate the logic)
// For now, let's duplicate the key formatting logic

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

function formatClientInfoForPrompt(client: Client | null): string {
  if (!client) {
    return '';
  }

  let text = `## Client Information\n\n`;
  
  if (client.date_of_birth) {
    const birthDate = typeof client.date_of_birth === 'string' 
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

function formatInBodyScanForPrompt(scan: InBodyScan | null): string {
  if (!scan) {
    return '';
  }

  let text = `## Client Body Composition (InBody Scan)

The client's latest InBody scan shows:`;

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

    for (const segment of segments) {
      const data = scan.segment_analysis[segment.key as keyof typeof scan.segment_analysis];
      if (data && typeof data === 'object') {
        const parts: string[] = [];
        const muscleMass = formatNumber(data.muscle_mass_lbs);
        if (muscleMass !== null) {
          parts.push(`${muscleMass} lbs muscle`);
        }
        const fatMass = formatNumber(data.fat_mass_lbs);
        if (fatMass !== null) {
          parts.push(`${fatMass} lbs fat`);
        }
        const percentFat = formatNumber(data.percent_fat);
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

async function showPrompts() {
  try {
    // Find John Doe client
    const clients = await clientService.getAllClients();
    const johnDoe = clients.find(c => {
      const name = (c.first_name || c.name || '').toLowerCase();
      return name.includes('john') && (name.includes('doe') || c.last_name?.toLowerCase().includes('doe'));
    });
    
    if (!johnDoe) {
      console.log('❌ John Doe client not found in database');
      console.log('Available clients:', clients.map(c => ({ id: c.id, name: c.name || c.first_name || 'N/A' })));
      process.exit(1);
    }

    console.log(`✅ Found client: ${johnDoe.name || johnDoe.first_name || 'Unknown'} (ID: ${johnDoe.id})\n`);

    // Get questionnaire
    const questionnaire = await questionnaireService.getQuestionnaireByClientId(johnDoe.id);
    if (!questionnaire) {
      console.log('❌ No questionnaire found for John Doe');
      process.exit(1);
    }

    console.log(`✅ Found questionnaire (ID: ${questionnaire.id})\n`);

    // Get structured data if available
    let structuredData: StructuredQuestionnaireData | null = null;
    if (questionnaire.structured_data) {
      structuredData = questionnaire.structured_data as StructuredQuestionnaireData;
    }

    // Get InBody scan
    const inbodyScan = await inbodyScanService.getLatestVerifiedInBodyScanByClientId(johnDoe.id);
    const latestScan = inbodyScan || await inbodyScanService.getLatestInBodyScanByClientId(johnDoe.id);

    if (latestScan) {
      console.log(`✅ Found InBody scan (ID: ${latestScan.id})\n`);
    } else {
      console.log('⚠️  No InBody scan found\n');
    }

    // Format the data
    const questionnaireText = formatQuestionnaireForPrompt(questionnaire, structuredData);
    const inbodyText = formatInBodyScanForPrompt(latestScan);
    const clientInfoText = formatClientInfoForPrompt(johnDoe);

    // Get personas (duplicated from ai.service.ts since it's not exported)
    const personasText = `**The Rebuilder**
Description: 40+, post-injury, cautious
Training Methods: Rehabilitation-Based Functional Training, Low-Impact Strength Circuits, Stability & Mobility Progressions (FRC-inspired)
Why It Fits: Rebuilders need controlled intensity and tissue remodeling; they thrive on measurable progress without setbacks. These methods rebuild confidence and function.

**The Serial Athlete**
Description: Lifelong competitor
Training Methods: Concurrent Training (Strength + Endurance), Undulating Periodization, Performance-Based Conditioning (HIIT/Tempo Runs)
Why It Fits: Keeps them stimulated with variety and performance benchmarks. Undulating loads prevent burnout while concurrent training supports hybrid goals.

**The Midlife Transformer**
Description: Career-driven, seeking vitality
Training Methods: Linear Progression Strength Training, Metabolic Conditioning (MetCon), Habit-Based Lifestyle Integration
Why It Fits: Linear strength builds tangible results, MetCons keep engagement high, and habit integration sustains long-term transformation.

**The Golden Grinder**
Description: 60+, longevity-focused
Training Methods: Functional Strength Training, Balance & Neuromotor Drills, Zone 2 Cardio Conditioning
Why It Fits: Functional patterns improve independence, balance reduces fall risk, and Zone 2 supports heart health and recovery.

**The Functionalist**
Description: Movement-minded, practical strength
Training Methods: Movement Pattern Periodization, Kettlebell & TRX Integration, Hybrid Mobility Circuits
Why It Fits: They crave efficiency and purpose—training should feel like real life. Compound and asymmetrical loads reinforce control and joint resilience.

**The Transformation Seeker**
Description: Short-term goal, high emotion
Training Methods: Body Recomposition Circuits, Linear Strength + HIIT Split, Macro-Driven Program Integration
Why It Fits: Needs fast results with visible payoff. These pair calorie-burning structure with sustainable strength outcomes.

**The Maintenance Pro**
Description: Advanced, consistent, data-driven
Training Methods: Autoregulated Hypertrophy (RIR/RPE-based), Block Periodization, Athlete Monitoring Systems (InBody, HRV, etc.)
Why It Fits: Already efficient—focus on fine-tuning. Block periodization keeps novelty; RIR-based training ensures precision without overtraining.

**The Overwhelmed Beginner**
Description: Inexperienced, anxious
Training Methods: Foundational Movement Training, Circuit-Based Full Body Workouts, Progressive Habit Building
Why It Fits: Simple, clear, repeatable. Builds confidence, coordination, and comfort in the gym environment.

**The Burnout Comeback**
Description: Ex-athlete, rediscovering joy
Training Methods: Autoregulatory Strength Training, Play-Based Conditioning (sleds, med balls), Mindful Mobility & Breathwork
Why It Fits: Needs to rekindle enjoyment while avoiding all-or-nothing intensity. Blends creativity with low-pressure structure.

**The Data-Driven Devotee**
Description: Analytical, optimization-focused
Training Methods: Autoregulated Progressive Overload, Concurrent Training with Measurable Metrics, Biofeedback-Integrated Programming (HRV, sleep, strain)
Why It Fits: They want systems. Real-time data creates buy-in and accountability while precision keeps them engaged.`;

    // Build recommendation structure prompt
    const recommendationPrompt = `You are an expert personal trainer creating a comprehensive 6-week training program for a client.

## Available Client Personas

${personasText}

${clientInfoText ? `${clientInfoText}\n\n` : ''}## Client Questionnaire

${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}
## Instructions

1. **Select the ONE client persona** that best matches this client based on their questionnaire responses, body composition, and age. Provide clear reasoning for your selection.

2. **Design the training plan** considering:
   - The selected persona's training methods
   - The client's specific responses (energy, motivation, limitations, etc.)
   - The client's age and age-appropriate training considerations
   - The client's current body composition (muscle mass, body fat %, segment analysis)
   - Realistic progression over 6 weeks
   - Sustainability and adherence

3. **Determine training parameters**:
   - Sessions per week (the options are 1-3)
   - Session length in minutes (the options are 30min or 45min)
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

    // Build workout generation prompt (example with placeholder recommendation structure)
    // In reality, this would use the actual recommendation structure from step 1
    const exampleRecommendationStructure = {
      client_type: "The [Selected Persona]",
      sessions_per_week: 3,
      session_length_minutes: 45,
      training_style: "Example training style",
      plan_structure: {
        archetype: "The [Selected Persona]",
        weeks: 6,
        training_methods: ["Method 1", "Method 2", "Method 3"]
      }
    };

    const week1Workouts = exampleRecommendationStructure.sessions_per_week;
    const workoutPrompt = `You are an expert personal trainer creating detailed workout plans for Week 1 of a 6-week training program.

## Recommendation Structure

- Client Type: ${exampleRecommendationStructure.client_type}
- Sessions Per Week: ${exampleRecommendationStructure.sessions_per_week}
- Session Length: ${exampleRecommendationStructure.session_length_minutes} minutes
- Training Style: ${exampleRecommendationStructure.training_style}
- Training Methods: ${exampleRecommendationStructure.plan_structure.training_methods.join(', ')}

${clientInfoText ? `${clientInfoText}\n\n` : ''}## Client Questionnaire

${questionnaireText}
${inbodyText ? `\n${inbodyText}\n` : ''}
## Instructions

Generate ${week1Workouts} workouts for WEEK 1 ONLY
- All workouts must have "week_number": 1
- Do NOT generate workouts for weeks 2-6
- Keep all text fields SHORT (max 100 characters per field) to prevent truncation
- Exercise notes should be brief (1-2 sentences max)
- Workout reasoning should be concise (2-3 sentences max)

Each workout must include:
- Specific exercises with sets, reps, weight/RPE, rest periods
- Warmup and cooldown exercises
- Total duration matching session length
- Focus areas for the workout
- Reasoning for exercise selection

## Output Format

You must respond with a valid JSON object matching this exact structure:

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
        "total_duration_minutes": ${exampleRecommendationStructure.session_length_minutes},
        "focus_areas": ["upper body", "push", "strength"]
      },
      "workout_reasoning": "This workout focuses on building upper body strength..."
    }
  ]
}

CRITICAL: 
- Generate ONLY ${week1Workouts} workouts for WEEK 1 ONLY
- Respond with ONLY valid JSON, no markdown, no additional text
- Keep all text fields concise to avoid truncation`;

    // Write to markdown file
    const outputPath = join(__dirname, '../../docs/PROMPTS_JOHN_DOE.md');
    const markdownContent = `# AI Prompts for John Doe Client

Generated on: ${new Date().toISOString()}

## Client Information
- **Name**: ${johnDoe.first_name} ${johnDoe.last_name}
- **Client ID**: ${johnDoe.id}
- **Date of Birth**: ${johnDoe.date_of_birth ? new Date(johnDoe.date_of_birth).toLocaleDateString() : 'N/A'}
- **Questionnaire ID**: ${questionnaire.id}
- **InBody Scan ID**: ${latestScan?.id || 'N/A'}

---

## Recommendation Structure Prompt

This is the prompt sent to OpenAI to generate the recommendation structure (persona selection, training parameters, plan structure).

\`\`\`
${recommendationPrompt}
\`\`\`

---

## Workout Generation Prompt

This is the prompt sent to OpenAI to generate Week 1 workouts. In production, this would use the actual recommendation structure from the first step.

\`\`\`
${workoutPrompt}
\`\`\`

---

## Notes

- The recommendation structure prompt is sent first to determine the client persona and training plan structure
- The workout generation prompt is sent second, using the recommendation structure from step 1
- Both prompts include the same client information, questionnaire data, and InBody scan data
- Date of birth is sent instead of calculated age to reduce computation
- All prompts request JSON-only responses with no markdown formatting
`;

    writeFileSync(outputPath, markdownContent, 'utf-8');
    console.log(`\n✅ Prompts written to: ${outputPath}\n`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

showPrompts();

