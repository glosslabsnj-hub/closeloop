-- Service Intelligence: booking_type, prerequisite_note, duration range
-- AgentGAPS7: Enables data-driven booking type triage instead of hardcoded industry defaults

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'direct_book',
  ADD COLUMN IF NOT EXISTS prerequisite_note text,
  ADD COLUMN IF NOT EXISTS duration_min_minutes integer,
  ADD COLUMN IF NOT EXISTS duration_max_minutes integer;

-- Validate booking_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_booking_type_check'
  ) THEN
    ALTER TABLE services
      ADD CONSTRAINT services_booking_type_check
      CHECK (booking_type IN ('direct_book', 'estimate_first', 'consultation'));
  END IF;
END $$;

-- Validate duration range is logical
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_duration_range_check'
  ) THEN
    ALTER TABLE services
      ADD CONSTRAINT services_duration_range_check
      CHECK (
        (duration_min_minutes IS NULL OR duration_min_minutes > 0) AND
        (duration_max_minutes IS NULL OR duration_max_minutes > 0) AND
        (duration_min_minutes IS NULL OR duration_max_minutes IS NULL OR duration_min_minutes <= duration_max_minutes)
      );
  END IF;
END $$;
