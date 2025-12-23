import pool from '../config/database';
import type { Workout, CreateWorkoutInput, UpdateWorkoutInput } from '../types';

export async function createWorkout(
  input: CreateWorkoutInput
): Promise<Workout> {
  const {
    recommendation_id,
    week_number,
    session_number,
    workout_name,
    workout_data,
    workout_reasoning,
  } = input;

  const result = await pool.query<Workout>(
    `INSERT INTO workouts (
      recommendation_id, week_number, session_number, workout_name,
      workout_data, workout_reasoning
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      recommendation_id,
      week_number,
      session_number,
      workout_name || null,
      JSON.stringify(workout_data),
      workout_reasoning || null,
    ]
  );

  const workout = result.rows[0];
  // Parse JSONB workout_data if it's a string
  if (workout && typeof workout.workout_data === 'string') {
    workout.workout_data = JSON.parse(workout.workout_data);
  }
  return workout;
}

export async function createWorkouts(
  workouts: CreateWorkoutInput[]
): Promise<Workout[]> {
  const createdWorkouts: Workout[] = [];

  for (const workoutInput of workouts) {
    const workout = await createWorkout(workoutInput);
    createdWorkouts.push(workout);
  }

  return createdWorkouts;
}

export async function getWorkoutById(id: number): Promise<Workout | null> {
  const result = await pool.query<Workout>(
    'SELECT * FROM workouts WHERE id = $1',
    [id]
  );

  if (result.rows[0]) {
    const workout = result.rows[0];
    if (typeof workout.workout_data === 'string') {
      workout.workout_data = JSON.parse(workout.workout_data);
    }
  }

  return result.rows[0] || null;
}

export async function getWorkoutsByRecommendationId(
  recommendationId: number
): Promise<Workout[]> {
  const result = await pool.query<Workout>(
    `SELECT * FROM workouts 
     WHERE recommendation_id = $1 
     ORDER BY week_number ASC, session_number ASC`,
    [recommendationId]
  );

  // Parse JSONB workout_data for each workout
  return result.rows.map((workout) => {
    if (typeof workout.workout_data === 'string') {
      workout.workout_data = JSON.parse(workout.workout_data);
    }
    return workout;
  });
}

export async function getWorkoutByWeekAndSession(
  recommendationId: number,
  weekNumber: number,
  sessionNumber: number
): Promise<Workout | null> {
  const result = await pool.query<Workout>(
    `SELECT * FROM workouts 
     WHERE recommendation_id = $1 
       AND week_number = $2 
       AND session_number = $3`,
    [recommendationId, weekNumber, sessionNumber]
  );

  if (result.rows[0]) {
    const workout = result.rows[0];
    if (typeof workout.workout_data === 'string') {
      workout.workout_data = JSON.parse(workout.workout_data);
    }
  }

  return result.rows[0] || null;
}

export async function deleteWorkout(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM workouts WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteWorkoutsByRecommendationId(
  recommendationId: number
): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM workouts WHERE recommendation_id = $1',
    [recommendationId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateWorkout(
  id: number,
  input: UpdateWorkoutInput
): Promise<Workout | null> {
  const updateFields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (input.workout_name !== undefined) {
    updateFields.push(`workout_name = $${paramCount}`);
    values.push(input.workout_name || null);
    paramCount++;
  }
  if (input.workout_data !== undefined) {
    updateFields.push(`workout_data = $${paramCount}`);
    values.push(JSON.stringify(input.workout_data));
    paramCount++;
  }
  if (input.workout_reasoning !== undefined) {
    updateFields.push(`workout_reasoning = $${paramCount}`);
    values.push(input.workout_reasoning || null);
    paramCount++;
  }
  if (input.status !== undefined) {
    updateFields.push(`status = $${paramCount}`);
    values.push(input.status);
    paramCount++;
  }
  if (input.scheduled_date !== undefined) {
    updateFields.push(`scheduled_date = $${paramCount}`);
    values.push(input.scheduled_date ? new Date(input.scheduled_date) : null);
    paramCount++;
  }
  if (input.completed_at !== undefined) {
    updateFields.push(`completed_at = $${paramCount}`);
    values.push(input.completed_at ? new Date(input.completed_at) : null);
    paramCount++;
  }

  if (updateFields.length === 0) {
    return getWorkoutById(id);
  }

  values.push(id);
  const result = await pool.query<Workout>(
    `UPDATE workouts 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows[0]) {
    const workout = result.rows[0];
    if (typeof workout.workout_data === 'string') {
      workout.workout_data = JSON.parse(workout.workout_data);
    }
  }

  return result.rows[0] || null;
}

export async function getWorkoutByIdWithActual(
  id: number
): Promise<Workout | null> {
  interface WorkoutRow extends Workout {
    actual_workout_id?: number;
    actual_workout_completed_by?: number;
    actual_workout_performance?: string | unknown;
    actual_workout_session_notes?: string;
    actual_workout_overall_rir?: number;
    actual_workout_client_energy_level?: number;
    actual_workout_trainer_observations?: string;
    actual_workout_started_at?: Date;
    actual_workout_completed_at?: Date;
    actual_workout_created_at?: Date;
    actual_workout_updated_at?: Date;
  }

  const result = await pool.query<WorkoutRow>(
    `SELECT 
      w.*,
      aw.id as actual_workout_id,
      aw.completed_by as actual_workout_completed_by,
      aw.actual_performance as actual_workout_performance,
      aw.session_notes as actual_workout_session_notes,
      aw.overall_rir as actual_workout_overall_rir,
      aw.client_energy_level as actual_workout_client_energy_level,
      aw.trainer_observations as actual_workout_trainer_observations,
      aw.started_at as actual_workout_started_at,
      aw.completed_at as actual_workout_completed_at,
      aw.created_at as actual_workout_created_at,
      aw.updated_at as actual_workout_updated_at
    FROM workouts w
    LEFT JOIN actual_workouts aw ON w.id = aw.workout_id
    WHERE w.id = $1`,
    [id]
  );

  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0];
  const workout: Workout = {
    id: row.id,
    recommendation_id: row.recommendation_id,
    week_number: row.week_number,
    session_number: row.session_number,
    workout_name: row.workout_name,
    workout_data: typeof row.workout_data === 'string' 
      ? JSON.parse(row.workout_data) 
      : row.workout_data,
    workout_reasoning: row.workout_reasoning,
    status: row.status,
    scheduled_date: row.scheduled_date,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  // Add actual workout if it exists
  if (row.actual_workout_id) {
    workout.actual_workout = {
      id: row.actual_workout_id,
      workout_id: row.id,
      completed_by: row.actual_workout_completed_by || undefined,
      actual_performance: typeof row.actual_workout_performance === 'string'
        ? JSON.parse(row.actual_workout_performance)
        : (row.actual_workout_performance as {
            exercises: Array<{
              exercise_name: string;
              sets_completed?: number;
              reps_completed?: number | string;
              weight_used?: string;
              rir?: number;
              notes?: string;
            }>;
          }),
      session_notes: row.actual_workout_session_notes || undefined,
      overall_rir: row.actual_workout_overall_rir || undefined,
      client_energy_level: row.actual_workout_client_energy_level || undefined,
      trainer_observations: row.actual_workout_trainer_observations || undefined,
      started_at: row.actual_workout_started_at || undefined,
      completed_at: row.actual_workout_completed_at || new Date(),
      created_at: row.actual_workout_created_at || new Date(),
      updated_at: row.actual_workout_updated_at || new Date(),
    };
  }

  return workout;
}

export async function getWorkoutsByWeek(
  recommendationId: number,
  weekNumber: number
): Promise<Workout[]> {
  const result = await pool.query<Workout>(
    `SELECT * FROM workouts 
     WHERE recommendation_id = $1 AND week_number = $2
     ORDER BY session_number ASC`,
    [recommendationId, weekNumber]
  );

  // Parse JSONB workout_data for each workout
  return result.rows.map((workout) => {
    if (typeof workout.workout_data === 'string') {
      workout.workout_data = JSON.parse(workout.workout_data);
    }
    return workout;
  });
}

export async function isWeekComplete(
  recommendationId: number,
  weekNumber: number
): Promise<boolean> {
  const result = await pool.query<{ total: number; completed: number; skipped: number }>(
    `SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped
    FROM workouts
    WHERE recommendation_id = $1 AND week_number = $2`,
    [recommendationId, weekNumber]
  );

  const { total, completed, skipped } = result.rows[0];
  // Week is complete if all workouts are either completed or skipped
  return total > 0 && total === completed + skipped;
}

export async function getWeekCompletionStatus(
  recommendationId: number,
  weekNumber: number
): Promise<{
  total: number;
  completed: number;
  skipped: number;
  in_progress: number;
  scheduled: number;
  cancelled: number;
  is_complete: boolean;
}> {
  const result = await pool.query<{
    total: number;
    completed: number;
    skipped: number;
    in_progress: number;
    scheduled: number;
    cancelled: number;
    null_status: number;
  }>(
    `SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN LOWER(COALESCE(status, '')) = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN LOWER(COALESCE(status, '')) = 'skipped' THEN 1 END) as skipped,
      COUNT(CASE WHEN LOWER(COALESCE(status, '')) = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN LOWER(COALESCE(status, '')) = 'scheduled' THEN 1 END) as scheduled,
      COUNT(CASE WHEN LOWER(COALESCE(status, '')) = 'cancelled' THEN 1 END) as cancelled,
      COUNT(CASE WHEN status IS NULL OR status = '' THEN 1 END) as null_status
    FROM workouts
    WHERE recommendation_id = $1 AND week_number = $2`,
    [recommendationId, weekNumber]
  );

  const status = result.rows[0];
  
  if (!status) {
    return {
      total: 0,
      completed: 0,
      skipped: 0,
      in_progress: 0,
      scheduled: 0,
      cancelled: 0,
      is_complete: false,
    };
  }
  
  // Convert all counts to numbers (PostgreSQL returns strings or bigint)
  const total = parseInt(String(status.total || 0), 10);
  const completed = parseInt(String(status.completed || 0), 10);
  const skipped = parseInt(String(status.skipped || 0), 10);
  const cancelled = parseInt(String(status.cancelled || 0), 10);
  const nullStatus = parseInt(String(status.null_status || 0), 10);
  const inProgress = parseInt(String(status.in_progress || 0), 10);
  const scheduled = parseInt(String(status.scheduled || 0), 10);
  
  // Week is complete if all workouts are either completed or skipped
  // Cancelled workouts and NULL status don't count toward completion
  const completedOrSkipped = completed + skipped;
  // Total active workouts = total minus cancelled and null status
  const totalActive = total - cancelled - nullStatus;
  
  const isComplete = totalActive > 0 && totalActive === completedOrSkipped;
  
  return {
    total,
    completed,
    skipped,
    in_progress: inProgress || 0,
    scheduled,
    cancelled,
    is_complete: isComplete,
  };
}

