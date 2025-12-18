-- Migration: 006_create_actual_workouts_table
-- Description: Creates actual_workouts table to store executed workout performance data
-- Created: 2024-12-19
-- Author: System

BEGIN;

-- Create actual_workouts table
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

-- Create indexes
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

COMMIT;

