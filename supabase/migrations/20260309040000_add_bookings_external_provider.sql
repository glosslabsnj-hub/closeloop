-- Add external_provider column to bookings table
-- This column tracks which external system created/owns the booking (e.g., "square", "google_calendar")
-- Used by sync-square-availability to deduplicate: skip bookings that Flux already pushed to Square
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'external_provider'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN external_provider TEXT;
  END IF;
END $$;

-- Index for efficient filtering by provider
CREATE INDEX IF NOT EXISTS idx_bookings_external_provider
  ON public.bookings(external_provider)
  WHERE external_provider IS NOT NULL;
