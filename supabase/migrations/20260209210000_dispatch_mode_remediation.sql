-- Dispatch Mode Remediation Migration
-- Codifies columns that exist in production but have no migration,
-- adds missing constraints and indexes.

-- 1. Add ghost columns to dispatch_jobs (IF NOT EXISTS safety)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispatch_jobs' AND column_name = 'price_breakdown') THEN
    ALTER TABLE public.dispatch_jobs ADD COLUMN price_breakdown jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispatch_jobs' AND column_name = 'pricing_note') THEN
    ALTER TABLE public.dispatch_jobs ADD COLUMN pricing_note text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispatch_jobs' AND column_name = 'service_tier') THEN
    ALTER TABLE public.dispatch_jobs ADD COLUMN service_tier text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispatch_jobs' AND column_name = 'tow_distance_miles') THEN
    ALTER TABLE public.dispatch_jobs ADD COLUMN tow_distance_miles numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispatch_jobs' AND column_name = 'total_distance_miles') THEN
    ALTER TABLE public.dispatch_jobs ADD COLUMN total_distance_miles numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispatch_jobs' AND column_name = 'dispatch_distance_miles') THEN
    ALTER TABLE public.dispatch_jobs ADD COLUMN dispatch_distance_miles numeric;
  END IF;
END
$$;

-- 2. Add UNIQUE constraint on (tenant_id, job_number)
-- Using CREATE UNIQUE INDEX which is more idempotent-friendly
CREATE UNIQUE INDEX IF NOT EXISTS uq_dispatch_jobs_tenant_job_number
  ON public.dispatch_jobs (tenant_id, job_number);

-- 3. Add index on customer_id for "all jobs for this customer" queries
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_customer
  ON public.dispatch_jobs (customer_id)
  WHERE customer_id IS NOT NULL;

-- 4. Add index on driver_id for driver job queries
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_driver
  ON public.dispatch_jobs (driver_id)
  WHERE driver_id IS NOT NULL;

COMMENT ON INDEX public.uq_dispatch_jobs_tenant_job_number IS 'Prevents duplicate job numbers per tenant';
COMMENT ON INDEX public.idx_dispatch_jobs_customer IS 'Speeds up customer job history queries';
COMMENT ON INDEX public.idx_dispatch_jobs_driver IS 'Speeds up driver job assignment queries';
