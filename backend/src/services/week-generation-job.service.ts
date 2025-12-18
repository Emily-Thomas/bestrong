import pool from '../config/database';
import type { WeekGenerationJob, CreateWeekGenerationJobInput } from '../types';

/**
 * Create a new week generation job
 */
export async function createWeekGenerationJob(
  input: CreateWeekGenerationJobInput,
  createdBy?: number
): Promise<WeekGenerationJob> {
  const result = await pool.query<WeekGenerationJob>(
    `INSERT INTO week_generation_jobs (recommendation_id, week_number, created_by, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [input.recommendation_id, input.week_number, createdBy || null]
  );

  return result.rows[0];
}

/**
 * Get a week generation job by ID
 */
export async function getWeekGenerationJobById(
  id: number
): Promise<WeekGenerationJob | null> {
  const result = await pool.query<WeekGenerationJob>(
    `SELECT * FROM week_generation_jobs WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get the latest week generation job for a recommendation and week
 */
export async function getWeekGenerationJobByRecommendationAndWeek(
  recommendationId: number,
  weekNumber: number
): Promise<WeekGenerationJob | null> {
  const result = await pool.query<WeekGenerationJob>(
    `SELECT * FROM week_generation_jobs 
     WHERE recommendation_id = $1 AND week_number = $2
     ORDER BY created_at DESC 
     LIMIT 1`,
    [recommendationId, weekNumber]
  );

  return result.rows[0] || null;
}

/**
 * Get all week generation jobs for a recommendation
 */
export async function getWeekGenerationJobsByRecommendationId(
  recommendationId: number
): Promise<WeekGenerationJob[]> {
  const result = await pool.query<WeekGenerationJob>(
    `SELECT * FROM week_generation_jobs 
     WHERE recommendation_id = $1 
     ORDER BY week_number ASC, created_at DESC`,
    [recommendationId]
  );

  return result.rows;
}

/**
 * Update week generation job status and current step
 */
export async function updateWeekGenerationJobStatus(
  id: number,
  status: WeekGenerationJob['status'],
  currentStep?: string
): Promise<void> {
  const updates: string[] = ['status = $2', 'updated_at = NOW()'];
  const values: unknown[] = [id, status];

  if (currentStep !== undefined) {
    updates.push(`current_step = $${values.length + 1}`);
    values.push(currentStep);
  }

  if (status === 'processing' && !currentStep) {
    // Set started_at when first moving to processing
    const job = await getWeekGenerationJobById(id);
    if (job && !job.started_at) {
      updates.push('started_at = NOW()');
    }
  }

  if (status === 'completed' || status === 'failed') {
    updates.push('completed_at = NOW()');
  }

  await pool.query(
    `UPDATE week_generation_jobs 
     SET ${updates.join(', ')}
     WHERE id = $1`,
    values
  );
}

/**
 * Mark week generation job as completed
 */
export async function completeWeekGenerationJob(id: number): Promise<void> {
  await pool.query(
    `UPDATE week_generation_jobs 
     SET status = 'completed',
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

/**
 * Mark week generation job as failed with error message
 */
export async function failWeekGenerationJob(
  id: number,
  errorMessage: string
): Promise<void> {
  await pool.query(
    `UPDATE week_generation_jobs 
     SET status = 'failed',
         error_message = $2,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [id, errorMessage]
  );
}

