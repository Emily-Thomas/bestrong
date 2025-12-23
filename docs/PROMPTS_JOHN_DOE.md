# AI Prompts for John Doe Client

Generated on: 2025-12-23T17:26:25.136Z

## Client Information
- **Name**: John Doe
- **Client ID**: 4
- **Date of Birth**: 12/22/1992
- **Questionnaire ID**: 11
- **InBody Scan ID**: 3

---

## Recommendation Structure Prompt

This is the prompt sent to OpenAI to generate the recommendation structure (persona selection, training parameters, plan structure).

```
You are an expert personal trainer creating a comprehensive 6-week training program for a client.

## Available Client Personas

**The Rebuilder**
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
Why It Fits: They want systems. Real-time data creates buy-in and accountability while precision keeps them engaged.

## Client Information

- Date of Birth: 12/22/1992

Consider the client's age (calculate from date of birth) when:
- Selecting age-appropriate exercises and training methods
- Setting realistic progression expectations based on age
- Adjusting recovery time and training frequency
- Choosing appropriate intensity levels
- Designing programs that account for age-related factors (mobility, recovery, etc.)

## Client Questionnaire

## Client Questionnaire Data

- Primary Goal: N/A
- Experience Level: N/A
- Available Days Per Week: N/A
- Preferred Session Length: N/A minutes
- Activity Level: N/A
- Stress Level: N/A


## Client Body Composition (InBody Scan)

The client's latest InBody scan shows:
- Weight: 160.4 lbs
- Skeletal Muscle Mass (SMM): 81.4 lbs
- Body Fat Mass: 18.0 lbs
- BMI: 25.7
- Percent Body Fat: 11.2%

Segment Analysis:
- Right Arm: 8.0 lbs muscle, 0.7 lbs fat, 49.6% fat
- Left Arm: 7.7 lbs muscle, 0.9 lbs fat, 71.9% fat
- Trunk: 58.3 lbs muscle, 8.4 lbs fat, 96.7% fat
- Right Leg: 22.2 lbs muscle, 3.1 lbs fat, 84.7% fat
- Left Leg: 21.1 lbs muscle, 2.9 lbs fat, 80.6% fat

Consider this body composition when:
- Selecting appropriate training intensity based on current muscle mass and body fat levels
- Choosing exercises that match current muscle mass distribution
- Setting realistic progression goals that account for body composition
- Adjusting volume and load based on body composition metrics
- Designing programs that address any muscle imbalances indicated by segment analysis

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

CRITICAL: Respond with ONLY valid JSON, no markdown, no additional text.
```

---

## Workout Generation Prompt

This is the prompt sent to OpenAI to generate Week 1 workouts. In production, this would use the actual recommendation structure from the first step.

```
You are an expert personal trainer creating detailed workout plans for Week 1 of a 6-week training program.

## Recommendation Structure

- Client Type: The [Selected Persona]
- Sessions Per Week: 3
- Session Length: 45 minutes
- Training Style: Example training style
- Training Methods: Method 1, Method 2, Method 3

## Client Information

- Date of Birth: 12/22/1992

Consider the client's age (calculate from date of birth) when:
- Selecting age-appropriate exercises and training methods
- Setting realistic progression expectations based on age
- Adjusting recovery time and training frequency
- Choosing appropriate intensity levels
- Designing programs that account for age-related factors (mobility, recovery, etc.)

## Client Questionnaire

## Client Questionnaire Data

- Primary Goal: N/A
- Experience Level: N/A
- Available Days Per Week: N/A
- Preferred Session Length: N/A minutes
- Activity Level: N/A
- Stress Level: N/A


## Client Body Composition (InBody Scan)

The client's latest InBody scan shows:
- Weight: 160.4 lbs
- Skeletal Muscle Mass (SMM): 81.4 lbs
- Body Fat Mass: 18.0 lbs
- BMI: 25.7
- Percent Body Fat: 11.2%

Segment Analysis:
- Right Arm: 8.0 lbs muscle, 0.7 lbs fat, 49.6% fat
- Left Arm: 7.7 lbs muscle, 0.9 lbs fat, 71.9% fat
- Trunk: 58.3 lbs muscle, 8.4 lbs fat, 96.7% fat
- Right Leg: 22.2 lbs muscle, 3.1 lbs fat, 84.7% fat
- Left Leg: 21.1 lbs muscle, 2.9 lbs fat, 80.6% fat

Consider this body composition when:
- Selecting appropriate training intensity based on current muscle mass and body fat levels
- Choosing exercises that match current muscle mass distribution
- Setting realistic progression goals that account for body composition
- Adjusting volume and load based on body composition metrics
- Designing programs that address any muscle imbalances indicated by segment analysis

## Instructions

Generate 3 workouts for WEEK 1 ONLY
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
        "total_duration_minutes": 45,
        "focus_areas": ["upper body", "push", "strength"]
      },
      "workout_reasoning": "This workout focuses on building upper body strength..."
    }
  ]
}

CRITICAL: 
- Generate ONLY 3 workouts for WEEK 1 ONLY
- Respond with ONLY valid JSON, no markdown, no additional text
- Keep all text fields concise to avoid truncation
```

---

## Notes

- The recommendation structure prompt is sent first to determine the client persona and training plan structure
- The workout generation prompt is sent second, using the recommendation structure from step 1
- Both prompts include the same client information, questionnaire data, and InBody scan data
- Date of birth is sent instead of calculated age to reduce computation
- All prompts request JSON-only responses with no markdown formatting
