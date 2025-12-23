-- Migration: 012_rename_rpe_to_rir
-- Description: Rename overall_rpe to overall_rir (Reps in Reserve instead of Rate of Perceived Exertion)
-- Created: 2025-01-XX
-- Author: System

BEGIN;

-- Rename overall_rpe column to overall_rir in actual_workouts table
ALTER TABLE actual_workouts 
RENAME COLUMN overall_rpe TO overall_rir;

-- Update comment to reflect RIR (0-5 scale)
COMMENT ON COLUMN actual_workouts.overall_rir IS 'Overall session RIR (Reps in Reserve, 0-5 scale)';

COMMIT;

