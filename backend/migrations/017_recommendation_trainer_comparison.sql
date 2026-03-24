-- Migration: 017_recommendation_trainer_comparison
-- Description: Link recommendations to trainer personas; support multi-coach comparison batches
-- Date: 2025-03-23

BEGIN;

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS trainer_id INTEGER REFERENCES trainers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comparison_batch_id UUID;

CREATE INDEX IF NOT EXISTS idx_recommendations_trainer_id ON recommendations(trainer_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_comparison_batch ON recommendations(comparison_batch_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_questionnaire_status ON recommendations(questionnaire_id, status);

ALTER TABLE recommendation_jobs
  ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMIT;
