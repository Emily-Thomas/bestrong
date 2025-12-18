import pool from '../config/database';

export interface RecommendationJob {
  id: number;
  questionnaire_id: number;
  client_id: number;
  created_by?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_step?: string;
  recommendation_id?: number;
  error_message?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  updated_at: Date;
}

export interface CreateJobInput {
  questionnaire_id: number;
  client_id: number;
  created_by: number;
}

/**
 * Create a new recommendation generation job
 */
export async function createJob(
  input: CreateJobInput
): Promise<RecommendationJob> {
  const result = await pool.query<RecommendationJob>(
    `INSERT INTO recommendation_jobs (questionnaire_id, client_id, created_by, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [input.questionnaire_id, input.client_id, input.created_by]
  );

  return result.rows[0];
}

/**
 * Get a job by ID
 */
export async function getJobById(id: number): Promise<RecommendationJob | null> {
  const result = await pool.query<RecommendationJob>(
    `SELECT * FROM recommendation_jobs WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Get the latest job for a questionnaire
 */
export async function getLatestJobByQuestionnaireId(
  questionnaireId: number
): Promise<RecommendationJob | null> {
  const result = await pool.query<RecommendationJob>(
    `SELECT * FROM recommendation_jobs 
     WHERE questionnaire_id = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [questionnaireId]
  );

  return result.rows[0] || null;
}

/**
 * Update job status and current step
 */
export async function updateJobStatus(
  id: number,
  status: RecommendationJob['status'],
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
    const job = await getJobById(id);
    if (job && !job.started_at) {
      updates.push('started_at = NOW()');
    }
  }

  if (status === 'completed' || status === 'failed') {
    updates.push('completed_at = NOW()');
  }

  await pool.query(
    `UPDATE recommendation_jobs 
     SET ${updates.join(', ')}
     WHERE id = $1`,
    values
  );
}

/**
 * Mark job as completed with recommendation ID
 */
export async function completeJob(
  id: number,
  recommendationId: number
): Promise<void> {
  await pool.query(
    `UPDATE recommendation_jobs 
     SET status = 'completed',
         recommendation_id = $2,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [id, recommendationId]
  );
}

/**
 * Mark job as failed with error message
 */
export async function failJob(id: number, errorMessage: string): Promise<void> {
  await pool.query(
    `UPDATE recommendation_jobs 
     SET status = 'failed',
         error_message = $2,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [id, errorMessage]
  );
}

