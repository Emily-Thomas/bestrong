-- Migration: 019_questionnaire_nutrition_habits_text
-- Description: Widen nutrition_habits — app stores a summary string (choices + optional notes), not a 50-char enum
-- Date: 2026-03-31

BEGIN;

ALTER TABLE questionnaires
  ALTER COLUMN nutrition_habits TYPE TEXT;

COMMIT;
