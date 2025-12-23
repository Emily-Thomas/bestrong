-- Migration: 010_create_inbody_scans_table
-- Description: Creates table for storing InBody scan PNG images and extracted data
-- Created: 2024-12-23
-- Author: System

BEGIN;

-- Create inbody_scans table
CREATE TABLE IF NOT EXISTS inbody_scans (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES admin_users(id),
  
  -- File storage
  file_path VARCHAR(500) NOT NULL, -- Path to stored PNG image file
  file_name VARCHAR(255) NOT NULL, -- Original filename
  file_size_bytes INTEGER, -- File size in bytes
  mime_type VARCHAR(100) DEFAULT 'image/png',
  
  -- Extracted data (structured)
  scan_date DATE, -- Date of the scan (extracted or manually entered)
  weight_lbs DECIMAL(5,2), -- Weight in pounds
  smm_lbs DECIMAL(5,2), -- Skeletal Muscle Mass in pounds
  body_fat_mass_lbs DECIMAL(5,2), -- Body Fat Mass in pounds
  bmi DECIMAL(4,2), -- Body Mass Index
  percent_body_fat DECIMAL(5,2), -- Percent Body Fat
  segment_analysis JSONB, -- Analysis by segment (flexible structure)
  
  -- Extraction metadata
  extraction_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, verified
  extraction_raw_response TEXT, -- Raw LLM response for debugging
  verified BOOLEAN DEFAULT false, -- Whether user has verified the extracted data
  verified_at TIMESTAMP,
  verified_by INTEGER REFERENCES admin_users(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_weight CHECK (weight_lbs IS NULL OR weight_lbs > 0),
  CONSTRAINT valid_bmi CHECK (bmi IS NULL OR (bmi > 0 AND bmi < 100)),
  CONSTRAINT valid_body_fat_percent CHECK (percent_body_fat IS NULL OR (percent_body_fat >= 0 AND percent_body_fat <= 100))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inbody_scans_client_id ON inbody_scans(client_id);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_scan_date ON inbody_scans(client_id, scan_date DESC);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_uploaded_by ON inbody_scans(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_extraction_status ON inbody_scans(extraction_status);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_verified ON inbody_scans(client_id, verified, scan_date DESC);

-- Create trigger for updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_inbody_scans_updated_at ON inbody_scans;
    CREATE TRIGGER update_inbody_scans_updated_at BEFORE UPDATE ON inbody_scans
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;

