ALTER TABLE dispatch_jobs
  ADD COLUMN IF NOT EXISTS estimated_eta_minutes integer,
  ADD COLUMN IF NOT EXISTS drivable boolean;