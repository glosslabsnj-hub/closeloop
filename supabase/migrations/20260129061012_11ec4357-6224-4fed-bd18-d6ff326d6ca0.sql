-- Add ai_policies_json column to tenants table for storing smart AI behavior policies
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_policies_json jsonb DEFAULT '{}'::jsonb;