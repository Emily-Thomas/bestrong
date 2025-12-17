import pool from '../config/database';
import type { CreateQuestionnaireInput, Questionnaire } from '../types';

export async function createQuestionnaire(
  input: CreateQuestionnaireInput,
  filledBy: number
): Promise<Questionnaire> {
  const {
    client_id,
    primary_goal,
    secondary_goals,
    experience_level,
    preferred_training_style,
    available_days_per_week,
    preferred_session_length,
    time_preferences,
    injury_history,
    medical_conditions,
    fitness_equipment_access,
    activity_level,
    stress_level,
    sleep_quality,
    nutrition_habits,
    notes,
  } = input;

  const result = await pool.query<Questionnaire>(
    `INSERT INTO questionnaires (
      client_id, filled_by, primary_goal, secondary_goals, experience_level,
      preferred_training_style, available_days_per_week, preferred_session_length,
      time_preferences, injury_history, medical_conditions, fitness_equipment_access,
      activity_level, stress_level, sleep_quality, nutrition_habits, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *`,
    [
      client_id,
      filledBy,
      primary_goal || null,
      secondary_goals || null,
      experience_level || null,
      preferred_training_style || null,
      available_days_per_week || null,
      preferred_session_length || null,
      time_preferences || null,
      injury_history || null,
      medical_conditions || null,
      fitness_equipment_access || null,
      activity_level || null,
      stress_level || null,
      sleep_quality || null,
      nutrition_habits || null,
      notes || null,
    ]
  );

  return result.rows[0];
}

export async function getQuestionnaireById(
  id: number
): Promise<Questionnaire | null> {
  const result = await pool.query<Questionnaire>(
    'SELECT * FROM questionnaires WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

export async function getQuestionnaireByClientId(
  clientId: number
): Promise<Questionnaire | null> {
  const result = await pool.query<Questionnaire>(
    'SELECT * FROM questionnaires WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
    [clientId]
  );

  return result.rows[0] || null;
}

export async function updateQuestionnaire(
  id: number,
  input: Partial<CreateQuestionnaireInput>
): Promise<Questionnaire | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (input.primary_goal !== undefined) {
    fields.push(`primary_goal = $${paramCount++}`);
    values.push(input.primary_goal);
  }
  if (input.secondary_goals !== undefined) {
    fields.push(`secondary_goals = $${paramCount++}`);
    values.push(input.secondary_goals);
  }
  if (input.experience_level !== undefined) {
    fields.push(`experience_level = $${paramCount++}`);
    values.push(input.experience_level);
  }
  if (input.preferred_training_style !== undefined) {
    fields.push(`preferred_training_style = $${paramCount++}`);
    values.push(input.preferred_training_style);
  }
  if (input.available_days_per_week !== undefined) {
    fields.push(`available_days_per_week = $${paramCount++}`);
    values.push(input.available_days_per_week);
  }
  if (input.preferred_session_length !== undefined) {
    fields.push(`preferred_session_length = $${paramCount++}`);
    values.push(input.preferred_session_length);
  }
  if (input.time_preferences !== undefined) {
    fields.push(`time_preferences = $${paramCount++}`);
    values.push(input.time_preferences);
  }
  if (input.injury_history !== undefined) {
    fields.push(`injury_history = $${paramCount++}`);
    values.push(input.injury_history);
  }
  if (input.medical_conditions !== undefined) {
    fields.push(`medical_conditions = $${paramCount++}`);
    values.push(input.medical_conditions);
  }
  if (input.fitness_equipment_access !== undefined) {
    fields.push(`fitness_equipment_access = $${paramCount++}`);
    values.push(input.fitness_equipment_access);
  }
  if (input.activity_level !== undefined) {
    fields.push(`activity_level = $${paramCount++}`);
    values.push(input.activity_level);
  }
  if (input.stress_level !== undefined) {
    fields.push(`stress_level = $${paramCount++}`);
    values.push(input.stress_level);
  }
  if (input.sleep_quality !== undefined) {
    fields.push(`sleep_quality = $${paramCount++}`);
    values.push(input.sleep_quality);
  }
  if (input.nutrition_habits !== undefined) {
    fields.push(`nutrition_habits = $${paramCount++}`);
    values.push(input.nutrition_habits);
  }
  if (input.notes !== undefined) {
    fields.push(`notes = $${paramCount++}`);
    values.push(input.notes);
  }

  if (fields.length === 0) {
    return getQuestionnaireById(id);
  }

  values.push(id);
  const query = `UPDATE questionnaires SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

  const result = await pool.query<Questionnaire>(query, values);
  return result.rows[0] || null;
}

export async function deleteQuestionnaire(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM questionnaires WHERE id = $1', [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
}
