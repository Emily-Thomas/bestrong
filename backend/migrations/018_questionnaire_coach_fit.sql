-- Migration: 018_questionnaire_coach_fit
-- Description: Persist AI coach-fit result (suggested trainer + rationale) on questionnaire
-- Date: 2025-03-25

BEGIN;

ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS coach_fit JSONB;

COMMENT ON COLUMN questionnaires.coach_fit IS
  'Last coach-fit AI result: { analysis, trainer_ids_evaluated }';

COMMIT;
