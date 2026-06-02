-- Version: 020
-- Description: Track whether a client follows full intake or imported off-platform program setup
-- Date: 2026-06-02

BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS onboarding_track TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_onboarding_track_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_onboarding_track_check
  CHECK (onboarding_track IN ('standard', 'imported_program'));

CREATE INDEX IF NOT EXISTS idx_clients_onboarding_track ON clients(onboarding_track);

UPDATE clients
SET onboarding_track = 'standard'
WHERE onboarding_track IS NULL OR onboarding_track = '';

COMMIT;
