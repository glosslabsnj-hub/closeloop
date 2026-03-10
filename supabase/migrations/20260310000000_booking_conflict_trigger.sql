-- Migration: Add database-level booking conflict detection
-- Prevents two non-cancelled bookings from overlapping for the same tenant
-- when the tenant has default_capacity = 1 (single technician).
-- This is a backstop — the application layer also checks conflicts.

-- Function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INTEGER;
  v_conflict_count INTEGER;
BEGIN
  -- Only check for non-cancelled/no-show bookings
  IF NEW.status IN ('canceled', 'cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  -- Get tenant capacity (default 1 if not set)
  SELECT COALESCE(
    (SELECT (capabilities_json->>'default_capacity')::INTEGER
     FROM tenants WHERE id = NEW.tenant_id),
    1
  ) INTO v_capacity;

  -- If capacity > 1, allow multiple bookings in the same slot
  IF v_capacity > 1 THEN
    RETURN NEW;
  END IF;

  -- Count overlapping confirmed/pending bookings (excluding this booking on UPDATE)
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE tenant_id = NEW.tenant_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status NOT IN ('canceled', 'cancelled', 'no_show')
    AND start_at < NEW.end_at
    AND end_at > NEW.start_at;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'BOOKING_CONFLICT: This time slot overlaps with an existing booking. Please choose a different time.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS booking_conflict_check ON bookings;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER booking_conflict_check
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_conflict();

-- Add comment
COMMENT ON FUNCTION check_booking_conflict() IS
  'Prevents double-booking when tenant capacity = 1. Raises BOOKING_CONFLICT exception on overlap.';
