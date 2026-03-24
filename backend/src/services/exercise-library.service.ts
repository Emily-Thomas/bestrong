import pool from '../config/database';
import type {
  CreateExerciseLibraryExerciseInput,
  ExerciseLibraryExercise,
  UpdateExerciseLibraryExerciseInput,
} from '../types';

export async function getExercises(options?: {
  search?: string;
  status?: 'active' | 'archived' | 'all';
}): Promise<ExerciseLibraryExercise[]> {
  const { search, status } = options || {};

  const conditions: string[] = [];
  const values: unknown[] = [];
  let param = 1;

  if (status && status !== 'all') {
    conditions.push(`status = $${param}`);
    values.push(status);
    param++;
  } else {
    // Default to active only
    conditions.push(`status = 'active'`);
  }

  if (search && search.trim() !== '') {
    const term = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      `(LOWER(name) LIKE $${param} OR LOWER(COALESCE(primary_muscle_group, '')) LIKE $${param} OR LOWER(COALESCE(equipment, '')) LIKE $${param} OR LOWER(COALESCE(category, '')) LIKE $${param} OR LOWER(COALESCE(notes, '')) LIKE $${param})`
    );
    values.push(term);
    param++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query<ExerciseLibraryExercise>(
    `SELECT * FROM exercise_library_exercises
     ${whereClause}
     ORDER BY LOWER(name) ASC`,
    values
  );

  return result.rows;
}

export async function getExerciseById(
  id: number
): Promise<ExerciseLibraryExercise | null> {
  const result = await pool.query<ExerciseLibraryExercise>(
    'SELECT * FROM exercise_library_exercises WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createExercise(
  input: CreateExerciseLibraryExerciseInput,
  createdBy?: number
): Promise<ExerciseLibraryExercise> {
  const {
    name,
    primary_muscle_group,
    secondary_muscle_groups,
    movement_pattern,
    equipment,
    category,
    default_sets,
    default_reps,
    default_load,
    default_rest_seconds,
    default_tempo,
    notes,
  } = input;

  const result = await pool.query<ExerciseLibraryExercise>(
    `INSERT INTO exercise_library_exercises (
      name,
      primary_muscle_group,
      secondary_muscle_groups,
      movement_pattern,
      equipment,
      category,
      default_sets,
      default_reps,
      default_load,
      default_rest_seconds,
      default_tempo,
      notes,
      status,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13)
    RETURNING *`,
    [
      name,
      primary_muscle_group || null,
      secondary_muscle_groups || null,
      movement_pattern || null,
      equipment || null,
      category || null,
      default_sets ?? null,
      default_reps !== undefined ? String(default_reps) : null,
      default_load || null,
      default_rest_seconds ?? null,
      default_tempo || null,
      notes || null,
      createdBy ?? null,
    ]
  );

  return result.rows[0];
}

export async function updateExercise(
  id: number,
  updates: UpdateExerciseLibraryExerciseInput
): Promise<ExerciseLibraryExercise | null> {
  const updateFields: string[] = [];
  const values: unknown[] = [];
  let param = 1;

  if (updates.name !== undefined) {
    updateFields.push(`name = $${param}`);
    values.push(updates.name);
    param++;
  }
  if (updates.primary_muscle_group !== undefined) {
    updateFields.push(`primary_muscle_group = $${param}`);
    values.push(updates.primary_muscle_group || null);
    param++;
  }
  if (updates.secondary_muscle_groups !== undefined) {
    updateFields.push(`secondary_muscle_groups = $${param}`);
    values.push(
      updates.secondary_muscle_groups &&
        updates.secondary_muscle_groups.length > 0
        ? updates.secondary_muscle_groups
        : null
    );
    param++;
  }
  if (updates.movement_pattern !== undefined) {
    updateFields.push(`movement_pattern = $${param}`);
    values.push(updates.movement_pattern || null);
    param++;
  }
  if (updates.equipment !== undefined) {
    updateFields.push(`equipment = $${param}`);
    values.push(updates.equipment || null);
    param++;
  }
  if (updates.category !== undefined) {
    updateFields.push(`category = $${param}`);
    values.push(updates.category || null);
    param++;
  }
  if (updates.default_sets !== undefined) {
    updateFields.push(`default_sets = $${param}`);
    values.push(updates.default_sets ?? null);
    param++;
  }
  if (updates.default_reps !== undefined) {
    updateFields.push(`default_reps = $${param}`);
    values.push(
      updates.default_reps !== undefined ? String(updates.default_reps) : null
    );
    param++;
  }
  if (updates.default_load !== undefined) {
    updateFields.push(`default_load = $${param}`);
    values.push(updates.default_load || null);
    param++;
  }
  if (updates.default_rest_seconds !== undefined) {
    updateFields.push(`default_rest_seconds = $${param}`);
    values.push(updates.default_rest_seconds ?? null);
    param++;
  }
  if (updates.default_tempo !== undefined) {
    updateFields.push(`default_tempo = $${param}`);
    values.push(updates.default_tempo || null);
    param++;
  }
  if (updates.notes !== undefined) {
    updateFields.push(`notes = $${param}`);
    values.push(updates.notes || null);
    param++;
  }
  if (updates.status !== undefined) {
    updateFields.push(`status = $${param}`);
    values.push(updates.status);
    param++;
  }

  if (updateFields.length === 0) {
    return getExerciseById(id);
  }

  values.push(id);
  const result = await pool.query<ExerciseLibraryExercise>(
    `UPDATE exercise_library_exercises
     SET ${updateFields.join(', ')}
     WHERE id = $${param}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function archiveExercise(
  id: number
): Promise<ExerciseLibraryExercise | null> {
  const result = await pool.query<ExerciseLibraryExercise>(
    `UPDATE exercise_library_exercises
     SET status = 'archived'
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}
