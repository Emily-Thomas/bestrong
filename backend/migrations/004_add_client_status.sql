-- Migration: 004_add_client_status
-- Description: Adds status field to clients table to track prospect/active/inactive/archived status
-- Created: 2024-12-19
-- Author: System

BEGIN;

-- Add status column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'prospect';

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Update existing clients to have 'prospect' status if null (shouldn't happen with default, but safe)
UPDATE clients SET status = 'prospect' WHERE status IS NULL;

COMMIT;

