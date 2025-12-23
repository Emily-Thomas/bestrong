import pool from '../config/database';
import type {
  ActualWorkout,
  CreateActualWorkoutInput,
} from '../types';

export async function createActualWorkout(
  input: CreateActualWorkoutInput
): Promise<ActualWorkout> {
  const {
    workout_id,
    actual_performance,
    session_notes,
    overall_rir,
    client_energy_level,
    trainer_observations,
    started_at,
    completed_at,
  } = input;

  const result = await pool.query<ActualWorkout>(
    `INSERT INTO actual_workouts (
      workout_id, completed_by, actual_performance,
      session_notes, overall_rir, client_energy_level,
      trainer_observations, started_at, completed_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      workout_id,
      null, // completed_by will be set via update if needed
      JSON.stringify(actual_performance),
      session_notes || null,
      overall_rir || null,
      client_energy_level || null,
      trainer_observations || null,
      started_at ? new Date(started_at) : null,
      new Date(completed_at),
    ]
  );

  const actualWorkout = result.rows[0];
  // Parse JSONB actual_performance if it's a string
  if (actualWorkout && typeof actualWorkout.actual_performance === 'string') {
    actualWorkout.actual_performance = JSON.parse(actualWorkout.actual_performance);
  }
  return actualWorkout;
}

export async function getActualWorkoutByWorkoutId(
  workoutId: number
): Promise<ActualWorkout | null> {
  const result = await pool.query<ActualWorkout>(
    'SELECT * FROM actual_workouts WHERE workout_id = $1',
    [workoutId]
  );

  if (result.rows[0]) {
    const actualWorkout = result.rows[0];
    if (typeof actualWorkout.actual_performance === 'string') {
      actualWorkout.actual_performance = JSON.parse(actualWorkout.actual_performance);
    }
  }

  return result.rows[0] || null;
}

export async function getActualWorkoutById(
  id: number
): Promise<ActualWorkout | null> {
  const result = await pool.query<ActualWorkout>(
    'SELECT * FROM actual_workouts WHERE id = $1',
    [id]
  );

  if (result.rows[0]) {
    const actualWorkout = result.rows[0];
    if (typeof actualWorkout.actual_performance === 'string') {
      actualWorkout.actual_performance = JSON.parse(actualWorkout.actual_performance);
    }
  }

  return result.rows[0] || null;
}

export async function updateActualWorkout(
  id: number,
  updates: Partial<CreateActualWorkoutInput>
): Promise<ActualWorkout | null> {
  const updateFields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (updates.actual_performance !== undefined) {
    updateFields.push(`actual_performance = $${paramCount}`);
    values.push(JSON.stringify(updates.actual_performance));
    paramCount++;
  }
  if (updates.session_notes !== undefined) {
    updateFields.push(`session_notes = $${paramCount}`);
    values.push(updates.session_notes || null);
    paramCount++;
  }
  if (updates.overall_rir !== undefined) {
    updateFields.push(`overall_rir = $${paramCount}`);
    values.push(updates.overall_rir || null);
    paramCount++;
  }
  if (updates.client_energy_level !== undefined) {
    updateFields.push(`client_energy_level = $${paramCount}`);
    values.push(updates.client_energy_level || null);
    paramCount++;
  }
  if (updates.trainer_observations !== undefined) {
    updateFields.push(`trainer_observations = $${paramCount}`);
    values.push(updates.trainer_observations || null);
    paramCount++;
  }
  if (updates.started_at !== undefined) {
    updateFields.push(`started_at = $${paramCount}`);
    values.push(updates.started_at ? new Date(updates.started_at) : null);
    paramCount++;
  }
  if (updates.completed_at !== undefined) {
    updateFields.push(`completed_at = $${paramCount}`);
    values.push(new Date(updates.completed_at));
    paramCount++;
  }

  if (updateFields.length === 0) {
    return getActualWorkoutById(id);
  }

  values.push(id);
  const result = await pool.query<ActualWorkout>(
    `UPDATE actual_workouts 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows[0]) {
    const actualWorkout = result.rows[0];
    if (typeof actualWorkout.actual_performance === 'string') {
      actualWorkout.actual_performance = JSON.parse(actualWorkout.actual_performance);
    }
  }

  return result.rows[0] || null;
}

export async function deleteActualWorkout(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM actual_workouts WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

