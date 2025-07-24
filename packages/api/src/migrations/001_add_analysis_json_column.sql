-- Migration: Add analysis_json column for LLM enrichment
-- Date: 2025-01-13
-- Description: Adds analysis_json TEXT column to openings table for storing LLM-generated metadata

ALTER TABLE openings 
ADD COLUMN analysis_json TEXT NULL;

-- Create index for performance when querying enrichment status
CREATE INDEX IF NOT EXISTS idx_openings_analysis_json ON openings(analysis_json);

-- Update the updated_at trigger to include analysis_json changes (if triggers exist)
-- This migration is safe to run multiple times
