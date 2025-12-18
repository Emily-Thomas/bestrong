-- Migration: 005_add_workout_status_tracking
-- Description: Adds status, scheduled_date, and completed_at fields to workouts table for execution tracking
-- Created: 2024-12-19
-- Author: System

BEGIN;

-- Add status column to workouts table
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Create indexes for status and date queries
CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);
CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);

-- Update existing workouts to have 'scheduled' status if null
UPDATE workouts SET status = 'scheduled' WHERE status IS NULL;

COMMIT;

