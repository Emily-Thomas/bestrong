import pool from '../config/database';
import type { Workout, CreateWorkoutInput } from '../types';

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

