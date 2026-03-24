-- Migration: 016_trainer_structured_persona
-- Description: LLM-generated structured coaching persona from raw trainer text
-- Date: 2025-03-23

BEGIN;

ALTER TABLE trainers
  ADD COLUMN IF NOT EXISTS structured_persona JSONB,
  ADD COLUMN IF NOT EXISTS persona_generated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS persona_raw_content_hash VARCHAR(64);

COMMIT;
