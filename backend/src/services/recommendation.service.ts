import pool from '../config/database';
import type {
  CreateRecommendationInput,
  Recommendation,
  UpdateRecommendationInput,
} from '../types';

export async function createRecommendation(
  input: CreateRecommendationInput,
  createdBy: number
): Promise<Recommendation> {
  const {
    client_id,
    questionnaire_id,
    client_type,
    sessions_per_week,
    session_length_minutes,
    training_style,
    plan_structure,
    ai_reasoning,
  } = input;

  const result = await pool.query<Recommendation>(
    `INSERT INTO recommendations (
      client_id, questionnaire_id, created_by, client_type,
      sessions_per_week, session_length_minutes, training_style,
      plan_structure, ai_reasoning, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      client_id,
      questionnaire_id || null,
      createdBy,
      client_type,
      sessions_per_week,
      session_length_minutes,
      training_style,
      JSON.stringify(plan_structure),
      ai_reasoning || null,
      'draft',
    ]
  );

  const rec = result.rows[0];
  // Parse JSONB plan_structure if it's a string
  if (rec && typeof rec.plan_structure === 'string') {
    rec.plan_structure = JSON.parse(rec.plan_structure);
  }
  return rec;
}

export async function getRecommendationById(
  id: number
): Promise<Recommendation | null> {
  const result = await pool.query<Recommendation>(
    'SELECT * FROM recommendations WHERE id = $1',
    [id]
  );

  if (result.rows[0]) {
    // Parse JSONB plan_structure
    const rec = result.rows[0];
    if (typeof rec.plan_structure === 'string') {
      rec.plan_structure = JSON.parse(rec.plan_structure);
    }
  }

  return result.rows[0] || null;
}

export async function getRecommendationsByClientId(
  clientId: number
): Promise<Recommendation[]> {
  const result = await pool.query<Recommendation>(
    'SELECT * FROM recommendations WHERE client_id = $1 ORDER BY created_at DESC',
    [clientId]
  );

  // Parse JSONB plan_structure for each recommendation
  return result.rows.map((rec) => {
    if (typeof rec.plan_structure === 'string') {
      rec.plan_structure = JSON.parse(rec.plan_structure);
    }
    return rec;
  });
}

export async function getRecommendationByQuestionnaireId(
  questionnaireId: number
): Promise<Recommendation | null> {
  const result = await pool.query<Recommendation>(
    'SELECT * FROM recommendations WHERE questionnaire_id = $1',
    [questionnaireId]
  );

  if (result.rows[0]) {
    // Parse JSONB plan_structure
    const rec = result.rows[0];
    if (typeof rec.plan_structure === 'string') {
      rec.plan_structure = JSON.parse(rec.plan_structure);
    }
  }

  return result.rows[0] || null;
}

export async function updateRecommendation(
  id: number,
  input: UpdateRecommendationInput,
  editedBy: number
): Promise<Recommendation | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (input.sessions_per_week !== undefined) {
    fields.push(`sessions_per_week = $${paramCount++}`);
    values.push(input.sessions_per_week);
  }
  if (input.session_length_minutes !== undefined) {
    fields.push(`session_length_minutes = $${paramCount++}`);
    values.push(input.session_length_minutes);
  }
  if (input.training_style !== undefined) {
    fields.push(`training_style = $${paramCount++}`);
    values.push(input.training_style);
  }
  if (input.plan_structure !== undefined) {
    fields.push(`plan_structure = $${paramCount++}`);
    values.push(JSON.stringify(input.plan_structure));
  }
  if (input.status !== undefined) {
    fields.push(`status = $${paramCount++}`);
    values.push(input.status);
  }

  if (fields.length === 0) {
    return getRecommendationById(id);
  }

  // Mark as edited
  fields.push(`is_edited = true`);

  values.push(id);
  const query = `UPDATE recommendations SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

  const result = await pool.query<Recommendation>(query, values);

  if (result.rows[0]) {
    const rec = result.rows[0];
    if (typeof rec.plan_structure === 'string') {
      rec.plan_structure = JSON.parse(rec.plan_structure);
    }

    // Save edit history
    await pool.query(
      `INSERT INTO recommendation_edits (
        recommendation_id, edited_by, sessions_per_week, session_length_minutes,
        training_style, plan_structure
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        editedBy,
        rec.sessions_per_week,
        rec.session_length_minutes,
        rec.training_style,
        JSON.stringify(rec.plan_structure),
      ]
    );

    return rec;
  }

  return null;
}

export async function deleteRecommendation(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM recommendations WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Create or update a recommendation for a questionnaire.
 * If a recommendation exists for the questionnaire, it updates it.
 * Otherwise, creates a new one.
 */
export async function createOrUpdateRecommendationForQuestionnaire(
  input: CreateRecommendationInput,
  createdBy: number
): Promise<Recommendation> {
  if (!input.questionnaire_id) {
    // If no questionnaire_id, just create a new one
    return createRecommendation(input, createdBy);
  }

  // Check if recommendation exists for this questionnaire
  const existing = await getRecommendationByQuestionnaireId(
    input.questionnaire_id
  );

  if (existing) {
    // Update existing recommendation
    const updateInput: UpdateRecommendationInput = {
      client_type: input.client_type,
      sessions_per_week: input.sessions_per_week,
      session_length_minutes: input.session_length_minutes,
      training_style: input.training_style,
      plan_structure: input.plan_structure,
      // Reset is_edited flag since we're regenerating from AI
      // Note: We'll need to handle this differently - maybe add ai_reasoning to UpdateRecommendationInput
    };

    // For regeneration, we want to update AI reasoning but not mark as manually edited
    // So we'll do a direct update without going through updateRecommendation
    const result = await pool.query<Recommendation>(
      `UPDATE recommendations SET
        client_type = $1,
        sessions_per_week = $2,
        session_length_minutes = $3,
        training_style = $4,
        plan_structure = $5,
        ai_reasoning = $6,
        is_edited = false,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *`,
      [
        input.client_type,
        input.sessions_per_week,
        input.session_length_minutes,
        input.training_style,
        JSON.stringify(input.plan_structure),
        input.ai_reasoning || null,
        existing.id,
      ]
    );

    if (!result.rows[0]) {
      throw new Error('Failed to update recommendation');
    }

    const rec = result.rows[0];
    if (rec && typeof rec.plan_structure === 'string') {
      rec.plan_structure = JSON.parse(rec.plan_structure);
    }
    return rec;
  } else {
    // Create new recommendation
    return createRecommendation(input, createdBy);
  }
}
