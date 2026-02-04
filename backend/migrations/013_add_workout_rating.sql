-- Migration: 013_add_workout_rating
-- Description: Add workout_rating field to actual_workouts table for overall workout feedback
-- Created: 2025-01-XX
-- Author: System

BEGIN;

-- Add workout_rating column to actual_workouts table
-- Values: 'happy', 'meh', 'sad' (representing happy face, meh face, sad face)
ALTER TABLE actual_workouts 
ADD COLUMN IF NOT EXISTS workout_rating VARCHAR(10);

-- Add check constraint to ensure only valid values
ALTER TABLE actual_workouts
DROP CONSTRAINT IF EXISTS check_workout_rating;

ALTER TABLE actual_workouts
ADD CONSTRAINT check_workout_rating 
CHECK (workout_rating IS NULL OR workout_rating IN ('happy', 'meh', 'sad'));

-- Add index for filtering by rating
CREATE INDEX IF NOT EXISTS idx_actual_workouts_workout_rating 
ON actual_workouts(workout_rating);

COMMENT ON COLUMN actual_workouts.workout_rating IS 'Overall workout rating: happy (good), meh (okay), sad (poor)';

COMMIT;
