import OpenAI from 'openai';
import type { ExtractedInBodyData } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extracts structured data from InBody scan PNG image using GPT-4 Vision
 */
export async function extractInBodyData(
  imageBuffer: Buffer
): Promise<ExtractedInBodyData> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please configure it to use InBody extraction.'
    );
  }

  try {
    // Convert buffer to base64 for vision API
    const base64Image = imageBuffer.toString('base64');

    // Step 1: Build prompt for LLM Vision
    const prompt = `Extract the following data from this InBody scan image. Return ONLY valid JSON, no markdown, no explanations.

Extract:
- Weight (lbs) - look for "Weight", "Body Weight", or similar (in pounds)
- SMM - Skeletal Muscle Mass (lbs) - look for "SMM", "Skeletal Muscle Mass", or "Muscle Mass" (in pounds)
- Body Fat Mass (lbs) - look for "Body Fat Mass", "Fat Mass", or similar (in pounds)
- BMI - Body Mass Index
- Percent Body Fat (%) - look for "% Body Fat", "Body Fat %", or "PBF"
- Scan Date (if available in document) - format as YYYY-MM-DD or null
- Analysis by Segment:
  - Right Arm: muscle_mass_lbs, fat_mass_lbs, percent_fat
  - Left Arm: muscle_mass_lbs, fat_mass_lbs, percent_fat
  - Trunk: muscle_mass_lbs, fat_mass_lbs, percent_fat
  - Right Leg: muscle_mass_lbs, fat_mass_lbs, percent_fat
  - Left Leg: muscle_mass_lbs, fat_mass_lbs, percent_fat

IMPORTANT: All weight values should be in POUNDS (lbs), not kilograms. If the scan shows kilograms, convert to pounds (multiply by 2.20462).

Return as JSON with this exact structure:
{
  "weight_lbs": number or null,
  "smm_lbs": number or null,
  "body_fat_mass_lbs": number or null,
  "bmi": number or null,
  "percent_body_fat": number or null,
  "scan_date": "YYYY-MM-DD" or null,
  "segment_analysis": {
    "right_arm": { "muscle_mass_lbs": number or null, "fat_mass_lbs": number or null, "percent_fat": number or null },
    "left_arm": { "muscle_mass_lbs": number or null, "fat_mass_lbs": number or null, "percent_fat": number or null },
    "trunk": { "muscle_mass_lbs": number or null, "fat_mass_lbs": number or null, "percent_fat": number or null },
    "right_leg": { "muscle_mass_lbs": number or null, "fat_mass_lbs": number or null, "percent_fat": number or null },
    "left_leg": { "muscle_mass_lbs": number or null, "fat_mass_lbs": number or null, "percent_fat": number or null }
  }
}

If a value is not found, use null. All numbers should be numeric values, not strings.`;

    // Step 2: Call OpenAI Vision API
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
    const response = await openai.chat.completions.create({
      model, // Using configurable model (defaults to gpt-5-mini, which supports vision)
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at extracting structured data from InBody scan images. You MUST respond with ONLY valid JSON. No markdown code blocks, no explanations, no additional text before or after the JSON. All string values must have properly escaped quotes (use \\" for quotes inside strings). Ensure all JSON brackets and braces are properly closed.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 2000,
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Step 3: Parse JSON response
    let cleaned = responseContent.trim();

    // Remove markdown code blocks if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Extract JSON object
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace === -1) {
      throw new Error('No JSON object found in response');
    }

    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let lastValidBrace = -1;

    for (let i = firstBrace; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
      } else if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastValidBrace = i;
            break;
          }
        }
      }
    }

    const jsonString = lastValidBrace >= 0
      ? cleaned.substring(firstBrace, lastValidBrace + 1)
      : cleaned.substring(firstBrace);

    // Parse and validate
    const extracted = JSON.parse(jsonString) as ExtractedInBodyData;

    // Validate extracted data
    if (
      !extracted.weight_lbs &&
      !extracted.smm_lbs &&
      !extracted.body_fat_mass_lbs &&
      !extracted.bmi &&
      !extracted.percent_body_fat
    ) {
      throw new Error('No valid data extracted from image');
    }

    return extracted;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to extract InBody data: ${error.message}`);
    }
    throw new Error('Failed to extract InBody data: Unknown error');
  }
}
