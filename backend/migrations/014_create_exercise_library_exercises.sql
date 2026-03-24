-- Migration: 014_create_exercise_library_exercises
-- Description: Create exercise_library_exercises table for atomic exercise definitions
-- Created: 2026-03-03
-- Author: System

BEGIN;

CREATE TABLE IF NOT EXISTS exercise_library_exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  primary_muscle_group VARCHAR(100),
  secondary_muscle_groups TEXT[],
  movement_pattern VARCHAR(100),
  equipment VARCHAR(100),
  category VARCHAR(100),
  default_sets INTEGER,
  default_reps VARCHAR(50),
  default_load VARCHAR(100),
  default_rest_seconds INTEGER,
  default_tempo VARCHAR(50),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exercise_library_status
  ON exercise_library_exercises(status);

CREATE INDEX IF NOT EXISTS idx_exercise_library_name
  ON exercise_library_exercises(LOWER(name));

CREATE INDEX IF NOT EXISTS idx_exercise_library_primary_muscle
  ON exercise_library_exercises(primary_muscle_group);

CREATE INDEX IF NOT EXISTS idx_exercise_library_equipment
  ON exercise_library_exercises(equipment);

-- Trigger for updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_exercise_library_exercises_updated_at
      ON exercise_library_exercises;
    CREATE TRIGGER update_exercise_library_exercises_updated_at
      BEFORE UPDATE ON exercise_library_exercises
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;

