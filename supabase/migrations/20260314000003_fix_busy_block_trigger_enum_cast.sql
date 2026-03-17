-- Fix: Cast booking_status enum to TEXT for array comparison in trigger function

CREATE OR REPLACE FUNCTION fn_booking_sync_busy_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status          TEXT;
  v_block_type      TEXT;
  v_expires_at      TIMESTAMPTZ;
  v_buffer_minutes  INTEGER;
  v_block_end       TIMESTAMPTZ;
BEGIN
  -- ── DELETE: deactivate any linked busy_block ──
  IF TG_OP = 'DELETE' THEN
    UPDATE busy_blocks
    SET is_active = FALSE
    WHERE booking_id = OLD.id
      AND is_active = TRUE;
    RETURN OLD;
  END IF;

  -- Cast enum to text once for all comparisons
  v_status := NEW.status::TEXT;

  -- If booking moved to a terminal status, deactivate the block
  IF v_status IN ('canceled', 'cancelled', 'no_show', 'completed') THEN
    UPDATE busy_blocks
    SET is_active = FALSE
    WHERE booking_id = NEW.id
      AND is_active = TRUE;
    RETURN NEW;
  END IF;

  -- Only create/update blocks for active statuses
  IF v_status NOT IN ('confirmed', 'pending', 'pending_deposit') THEN
    RETURN NEW;
  END IF;

  -- Determine block_type and expiry based on status
  IF v_status = 'confirmed' THEN
    v_block_type := 'confirmed_booking';
    v_expires_at := NULL;
  ELSE
    -- pending or pending_deposit: hold with 30-min expiry
    v_block_type := 'hold';
    v_expires_at := now() + INTERVAL '30 minutes';
  END IF;

  -- Calculate end time with buffer (use tenant's buffer if available)
  SELECT COALESCE(t.appointment_buffer_minutes, 0)
  INTO v_buffer_minutes
  FROM tenants t
  WHERE t.id = NEW.tenant_id;

  v_buffer_minutes := COALESCE(v_buffer_minutes, 0);
  v_block_end := NEW.end_at + (v_buffer_minutes || ' minutes')::INTERVAL;

  -- Upsert: update existing block or create new one
  IF EXISTS (SELECT 1 FROM busy_blocks WHERE booking_id = NEW.id) THEN
    -- Update existing block (handles reschedule + status changes)
    UPDATE busy_blocks
    SET
      start_at    = NEW.start_at,
      end_at      = v_block_end,
      block_type  = v_block_type,
      is_active   = TRUE,
      expires_at  = v_expires_at,
      tenant_id   = NEW.tenant_id,
      staff_id    = NEW.staff_id
    WHERE booking_id = NEW.id;
  ELSE
    -- Create new block
    INSERT INTO busy_blocks (
      tenant_id,
      booking_id,
      start_at,
      end_at,
      block_type,
      is_active,
      expires_at,
      session_id,
      staff_id
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.start_at,
      v_block_end,
      v_block_type,
      TRUE,
      v_expires_at,
      NEW.session_id,
      NEW.staff_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill any bookings that were missed (the original migration's backfill failed)
INSERT INTO busy_blocks (tenant_id, booking_id, start_at, end_at, block_type, is_active)
SELECT
  b.tenant_id,
  b.id,
  b.start_at,
  b.end_at,
  CASE
    WHEN b.status::TEXT = 'confirmed' THEN 'confirmed_booking'
    ELSE 'hold'
  END,
  TRUE
FROM bookings b
WHERE b.status::TEXT IN ('confirmed', 'pending', 'pending_deposit')
  AND b.start_at > now() - INTERVAL '1 day'
  AND NOT EXISTS (
    SELECT 1 FROM busy_blocks bb
    WHERE bb.booking_id = b.id
      AND bb.is_active = TRUE
  );
