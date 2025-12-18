-- Migration: 009_workout_execution_feature
-- Description: Consolidated migration for workout execution feature
-- Includes: client status, workout status tracking, actual workouts table, 
--          recommendation week tracking, and week generation jobs table
-- Created: 2024-12-19
-- Author: System

BEGIN;

-- ============================================
-- 1. Add status column to clients table
-- ============================================
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'prospect';

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

UPDATE clients SET status = 'prospect' WHERE status IS NULL;

-- ============================================
-- 2. Add status tracking to workouts table
-- ============================================
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);
CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);

UPDATE workouts SET status = 'scheduled' WHERE status IS NULL;

-- ============================================
-- 3. Create actual_workouts table
-- ============================================
CREATE TABLE IF NOT EXISTS actual_workouts (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  completed_by INTEGER REFERENCES admin_users(id),
  
  -- Actual performance data (stored as JSONB for flexibility)
  actual_performance JSONB NOT NULL,
  
  -- Session feedback
  session_notes TEXT,
  overall_rpe INTEGER, -- Overall session RPE (1-10)
  client_energy_level INTEGER, -- 1-10 scale
  trainer_observations TEXT,
  
  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one actual workout per proposed workout
  UNIQUE(workout_id)
);

CREATE INDEX IF NOT EXISTS idx_actual_workouts_workout_id ON actual_workouts(workout_id);
CREATE INDEX IF NOT EXISTS idx_actual_workouts_completed_by ON actual_workouts(completed_by);
CREATE INDEX IF NOT EXISTS idx_actual_workouts_completed_at ON actual_workouts(completed_at);

-- Create trigger for updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_actual_workouts_updated_at ON actual_workouts;
    CREATE TRIGGER update_actual_workouts_updated_at BEFORE UPDATE ON actual_workouts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 4. Add week tracking to recommendations table
-- ============================================
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_recommendations_current_week ON recommendations(current_week);

UPDATE recommendations SET current_week = 1 WHERE current_week IS NULL;

-- ============================================
-- 5. Create week_generation_jobs table
-- ============================================
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

