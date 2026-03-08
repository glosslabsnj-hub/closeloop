-- ============================================================
-- Fix 1: Auto-enable dispatch_queue for all dispatch-mode tenants
-- dispatch tenants must always have dispatch_queue in enabled_modules
-- ============================================================
UPDATE public.tenants
SET enabled_modules =
  CASE
    WHEN enabled_modules IS NULL THEN '["dispatch_queue"]'::jsonb
    WHEN NOT (enabled_modules @> '["dispatch_queue"]'::jsonb)
      THEN enabled_modules || '["dispatch_queue"]'::jsonb
    ELSE enabled_modules
  END
WHERE business_mode = 'dispatch'
  AND NOT (COALESCE(enabled_modules, '[]'::jsonb) @> '["dispatch_queue"]'::jsonb);

-- ============================================================
-- Fix 2: Make dispatch_jobs.customer_id nullable
-- Manual jobs created from the dashboard don't have a customer record.
-- AI-created jobs always have one (enforced at app level).
-- ============================================================
ALTER TABLE public.dispatch_jobs ALTER COLUMN customer_id DROP NOT NULL;

-- ============================================================
-- Fix 3: Fix leads ON CONFLICT — add proper UNIQUE CONSTRAINT
-- The partial unique index (WHERE phone IS NOT NULL) doesn't work
-- with PostgREST upsert onConflict. Replace with full UNIQUE CONSTRAINT.
-- PostgreSQL allows multiple NULLs even in UNIQUE constraints.
-- ============================================================

-- Deduplicate first (keep oldest row per tenant+phone, only where phone is not null)
DELETE FROM public.leads
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY tenant_id, phone ORDER BY created_at ASC) AS rn
    FROM public.leads
    WHERE phone IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Drop the partial index (replaced by full constraint below)
DROP INDEX IF EXISTS public.idx_leads_tenant_phone;

-- Add proper UNIQUE CONSTRAINT (allows multiple NULLs per PostgreSQL standard)
-- Idempotent: skip if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_tenant_phone_unique'
  ) THEN
    ALTER TABLE public.leads ADD CONSTRAINT leads_tenant_phone_unique UNIQUE (tenant_id, phone);
  END IF;
END $$;
