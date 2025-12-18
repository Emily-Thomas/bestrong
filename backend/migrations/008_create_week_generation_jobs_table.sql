-- Migration: 008_create_week_generation_jobs_table
-- Description: Creates week_generation_jobs table for tracking progressive week generation jobs
-- Created: 2024-12-19
-- Author: System

BEGIN;

-- Create week_generation_jobs table
CREATE TABLE IF NOT EXISTS week_generation_jobs (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  created_by INTEGER REFERENCES admin_users(id),
  
  -- Job status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  current_step VARCHAR(255),
  
  -- Results
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one job per week per recommendation
  UNIQUE(recommendation_id, week_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_status ON week_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_recommendation_id ON week_generation_jobs(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_week_number ON week_generation_jobs(week_number);

-- Create trigger for updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_week_generation_jobs_updated_at ON week_generation_jobs;
    CREATE TRIGGER update_week_generation_jobs_updated_at BEFORE UPDATE ON week_generation_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;

