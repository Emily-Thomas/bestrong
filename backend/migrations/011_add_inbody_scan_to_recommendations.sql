-- Migration: 011_add_inbody_scan_to_recommendations
-- Description: Adds reference to InBody scan used during recommendation generation
-- Created: 2024-12-23
-- Author: System

BEGIN;

ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS inbody_scan_id INTEGER REFERENCES inbody_scans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_inbody_scan_id ON recommendations(inbody_scan_id);

COMMIT;

