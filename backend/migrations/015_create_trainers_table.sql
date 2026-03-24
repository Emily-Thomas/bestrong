-- Migration: 015_create_trainers_table
-- Description: Trainer profiles for coaching style and AI context
-- Date: 2025-03-23

BEGIN;

CREATE TABLE IF NOT EXISTS trainers (
  id SERIAL PRIMARY KEY,
  created_by INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  image_url TEXT,
  raw_trainer_definition TEXT NOT NULL,
  raw_client_needs TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trainers_created_by ON trainers(created_by);

COMMIT;
