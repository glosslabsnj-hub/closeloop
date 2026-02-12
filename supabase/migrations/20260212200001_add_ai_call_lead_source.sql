-- Fix: Add 'ai_call' to lead_source enum so AI-originated leads can be inserted.
-- Previously the enum only had: missed_call, website_form, manual, referral.
-- All inserts with source='ai_call' silently failed at the DB level.

ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'ai_call';

-- Unique index to support upsert logic in ensureLead():
-- lookup by (tenant_id, phone) before insert to avoid duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_tenant_phone
ON leads(tenant_id, phone) WHERE phone IS NOT NULL;
