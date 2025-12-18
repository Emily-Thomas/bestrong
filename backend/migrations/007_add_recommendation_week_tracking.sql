-- Migration: 007_add_recommendation_week_tracking
-- Description: Adds current_week, started_at, and completed_at fields to recommendations table
-- Created: 2024-12-19
-- Author: System

BEGIN;

-- Add week tracking columns to recommendations table
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Create index for current_week queries
CREATE INDEX IF NOT EXISTS idx_recommendations_current_week ON recommendations(current_week);

-- Update existing recommendations to have current_week = 1 if null
UPDATE recommendations SET current_week = 1 WHERE current_week IS NULL;

COMMIT;

