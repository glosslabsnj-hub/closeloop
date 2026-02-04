-- Session-based slot locking to prevent race conditions during AI calls
-- When slots are offered to a caller, they're temporarily reserved for that session

-- Add session_id column to busy_blocks for better tracking
ALTER TABLE public.busy_blocks
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Add index for session-based lookups
CREATE INDEX IF NOT EXISTS idx_busy_blocks_session
ON busy_blocks(session_id) WHERE session_id IS NOT NULL;

-- ============================================
-- Function to lock multiple slots for a session
-- Called when slots are computed and about to be offered to caller
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_lock_offered_slots(
  _tenant_id UUID,
  _session_id TEXT,
  _slots JSONB, -- Array of {start_at: timestamptz, end_at: timestamptz}
  _ttl_minutes INTEGER DEFAULT 10 -- Short TTL for offered slots
)
RETURNS TABLE (
  locked_count INTEGER,
  failed_slots JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_record JSONB;
  start_ts TIMESTAMPTZ;
  end_ts TIMESTAMPTZ;
  lock_success BOOLEAN;
  locked INT := 0;
  failed JSONB := '[]'::jsonb;
  now_ts TIMESTAMPTZ := now();
BEGIN
  -- First, release any existing locks for this session
  UPDATE busy_blocks
  SET is_active = FALSE
  WHERE session_id = _session_id
    AND block_type = 'hold'
    AND is_active = TRUE;

  -- Clean up expired holds globally
  PERFORM cleanup_expired_holds();

  -- Lock each offered slot
  FOR slot_record IN SELECT * FROM jsonb_array_elements(_slots)
  LOOP
    start_ts := (slot_record->>'start_at')::timestamptz;
    end_ts := (slot_record->>'end_at')::timestamptz;

    -- Check for conflicts
    IF NOT EXISTS (
      SELECT 1 FROM busy_blocks bb
      WHERE bb.tenant_id = _tenant_id
        AND bb.is_active = TRUE
        AND (bb.expires_at IS NULL OR bb.expires_at > now_ts)
        AND bb.start_at < end_ts
        AND bb.end_at > start_ts
    ) THEN
      -- Create the lock
      BEGIN
        INSERT INTO busy_blocks (
          tenant_id, block_type, start_at, end_at, session_id, expires_at, is_active, metadata_json
        ) VALUES (
          _tenant_id, 'hold', start_ts, end_ts, _session_id,
          now_ts + (_ttl_minutes || ' minutes')::interval, TRUE,
          jsonb_build_object('lock_type', 'offered_slot', 'locked_at', now_ts)
        );
        locked := locked + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Exclusion constraint violation - slot was taken
        failed := failed || jsonb_build_object('start_at', start_ts, 'end_at', end_ts, 'reason', 'conflict');
      END;
    ELSE
      failed := failed || jsonb_build_object('start_at', start_ts, 'end_at', end_ts, 'reason', 'already_busy');
    END IF;
  END LOOP;

  RETURN QUERY SELECT locked, failed;
END;
$$;

-- ============================================
-- Function to extend locks for a session
-- Called during long calls to prevent lock expiration
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_extend_session_locks(
  _session_id TEXT,
  _extend_minutes INTEGER DEFAULT 10
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
  now_ts TIMESTAMPTZ := now();
BEGIN
  UPDATE busy_blocks
  SET expires_at = now_ts + (_extend_minutes || ' minutes')::interval
  WHERE session_id = _session_id
    AND block_type = 'hold'
    AND is_active = TRUE
    AND expires_at IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ============================================
-- Function to release all locks for a session
-- Called when a call ends without booking
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_release_session_locks(
  _session_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE busy_blocks
  SET is_active = FALSE
  WHERE session_id = _session_id
    AND block_type = 'hold'
    AND is_active = TRUE;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;

-- ============================================
-- Function to convert a session lock to confirmed booking
-- Called when caller selects a slot and confirms
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_confirm_slot_from_session(
  _session_id TEXT,
  _slot_start TIMESTAMPTZ,
  _slot_end TIMESTAMPTZ,
  _customer_id UUID DEFAULT NULL,
  _service_id UUID DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  booking_id UUID,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hold_record RECORD;
  new_booking_id UUID;
  tenant_uuid UUID;
BEGIN
  -- Find the matching hold for this session and slot
  SELECT * INTO hold_record
  FROM busy_blocks bb
  WHERE bb.session_id = _session_id
    AND bb.block_type = 'hold'
    AND bb.is_active = TRUE
    AND bb.start_at = _slot_start
    AND bb.end_at = _slot_end
  FOR UPDATE;

  IF hold_record IS NULL THEN
    -- Try to create a new hold if the session lock expired
    -- but the slot is still available
    SELECT tenant_id INTO tenant_uuid
    FROM sessions
    WHERE id = _session_id::uuid
       OR external_session_id = _session_id
    LIMIT 1;

    IF tenant_uuid IS NOT NULL THEN
      -- Check if slot is still available
      IF NOT EXISTS (
        SELECT 1 FROM busy_blocks bb
        WHERE bb.tenant_id = tenant_uuid
          AND bb.is_active = TRUE
          AND (bb.expires_at IS NULL OR bb.expires_at > now())
          AND bb.start_at < _slot_end
          AND bb.end_at > _slot_start
      ) THEN
        -- Create a new hold
        INSERT INTO busy_blocks (
          tenant_id, block_type, start_at, end_at, session_id, expires_at, is_active
        ) VALUES (
          tenant_uuid, 'hold', _slot_start, _slot_end, _session_id,
          now() + interval '5 minutes', TRUE
        )
        RETURNING * INTO hold_record;
      ELSE
        RETURN QUERY SELECT NULL::uuid, false, 'Slot is no longer available';
        RETURN;
      END IF;
    ELSE
      RETURN QUERY SELECT NULL::uuid, false, 'Session not found';
      RETURN;
    END IF;
  END IF;

  -- Check if hold has expired
  IF hold_record.expires_at < now() THEN
    UPDATE busy_blocks SET is_active = FALSE WHERE id = hold_record.id;

    -- Try to reclaim if still available
    IF NOT EXISTS (
      SELECT 1 FROM busy_blocks bb
      WHERE bb.tenant_id = hold_record.tenant_id
        AND bb.id != hold_record.id
        AND bb.is_active = TRUE
        AND (bb.expires_at IS NULL OR bb.expires_at > now())
        AND bb.start_at < _slot_end
        AND bb.end_at > _slot_start
    ) THEN
      -- Reactivate the hold
      UPDATE busy_blocks
      SET is_active = TRUE, expires_at = now() + interval '5 minutes'
      WHERE id = hold_record.id;
    ELSE
      RETURN QUERY SELECT NULL::uuid, false, 'Slot was taken while hold expired';
      RETURN;
    END IF;
  END IF;

  -- Create the booking
  INSERT INTO bookings (
    tenant_id, customer_id, service_id, start_at, end_at, status, notes
  ) VALUES (
    hold_record.tenant_id,
    _customer_id,
    _service_id,
    hold_record.start_at,
    hold_record.end_at,
    'confirmed',
    _notes
  )
  RETURNING id INTO new_booking_id;

  -- Convert hold to confirmed booking
  UPDATE busy_blocks
  SET block_type = 'confirmed_booking',
      expires_at = NULL,
      booking_id = new_booking_id,
      metadata_json = metadata_json || jsonb_build_object('confirmed_at', now())
  WHERE id = hold_record.id;

  -- Release any other locks for this session
  UPDATE busy_blocks
  SET is_active = FALSE
  WHERE session_id = _session_id
    AND block_type = 'hold'
    AND is_active = TRUE
    AND id != hold_record.id;

  RETURN QUERY SELECT new_booking_id, true, NULL::text;
END;
$$;

-- ============================================
-- Function to get current valid slots for a session
-- Refreshes slots, respecting existing locks for this session
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_refresh_session_slots(
  _tenant_id UUID,
  _session_id TEXT,
  _start_date DATE,
  _end_date DATE,
  _duration_minutes INTEGER DEFAULT 60,
  _buffer_minutes INTEGER DEFAULT 0,
  _business_hours JSONB DEFAULT NULL
)
RETURNS TABLE (
  slot_start TIMESTAMPTZ,
  slot_end TIMESTAMPTZ,
  slot_date DATE,
  slot_time_local TEXT,
  is_locked_for_session BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_day DATE;
  day_name TEXT;
  day_hours JSONB;
  open_time TIME;
  close_time TIME;
  slot_start_ts TIMESTAMPTZ;
  slot_end_ts TIMESTAMPTZ;
  total_duration INTEGER;
  tenant_tz TEXT;
  now_ts TIMESTAMPTZ := now();
  min_lead_hours INTEGER;
  max_advance_days INTEGER;
  earliest_allowed TIMESTAMPTZ;
  latest_allowed TIMESTAMPTZ;
  has_session_lock BOOLEAN;
BEGIN
  -- Clean up expired holds
  PERFORM cleanup_expired_holds();

  -- Get tenant timezone and settings
  SELECT
    COALESCE(t.timezone, 'America/New_York'),
    COALESCE(t.min_lead_hours, 2),
    COALESCE(t.max_advance_days, 30)
  INTO tenant_tz, min_lead_hours, max_advance_days
  FROM tenants t
  WHERE t.id = _tenant_id;

  IF tenant_tz IS NULL THEN
    tenant_tz := 'America/New_York';
    min_lead_hours := 2;
    max_advance_days := 30;
  END IF;

  earliest_allowed := now_ts + (min_lead_hours || ' hours')::interval;
  latest_allowed := (now_ts AT TIME ZONE tenant_tz)::date + max_advance_days;
  total_duration := _duration_minutes + COALESCE(_buffer_minutes, 0);

  current_day := _start_date;
  WHILE current_day <= _end_date AND current_day <= latest_allowed LOOP
    day_name := lower(to_char(current_day, 'FMDay'));

    IF _business_hours IS NOT NULL AND _business_hours ? day_name THEN
      day_hours := _business_hours -> day_name;

      IF day_hours->>'closed' = 'true' OR day_hours->'closed' = 'true'::jsonb THEN
        current_day := current_day + 1;
        CONTINUE;
      END IF;

      open_time := (day_hours->>'open')::time;
      close_time := (day_hours->>'close')::time;

      slot_start_ts := (current_day::timestamp + open_time) AT TIME ZONE tenant_tz;

      WHILE slot_start_ts + (total_duration || ' minutes')::interval <=
            ((current_day::timestamp + close_time) AT TIME ZONE tenant_tz) LOOP

        slot_end_ts := slot_start_ts + (_duration_minutes || ' minutes')::interval;

        IF slot_start_ts >= earliest_allowed THEN
          -- Check if this session has a lock on this slot
          has_session_lock := EXISTS (
            SELECT 1 FROM busy_blocks bb
            WHERE bb.tenant_id = _tenant_id
              AND bb.session_id = _session_id
              AND bb.block_type = 'hold'
              AND bb.is_active = TRUE
              AND (bb.expires_at IS NULL OR bb.expires_at > now_ts)
              AND bb.start_at = slot_start_ts
              AND bb.end_at = slot_end_ts
          );

          -- Check for conflicts (exclude this session's locks)
          IF has_session_lock OR NOT EXISTS (
            SELECT 1 FROM busy_blocks bb
            WHERE bb.tenant_id = _tenant_id
              AND bb.is_active = TRUE
              AND (bb.expires_at IS NULL OR bb.expires_at > now_ts)
              AND bb.start_at < slot_end_ts + (_buffer_minutes || ' minutes')::interval
              AND bb.end_at > slot_start_ts
              AND (bb.session_id IS NULL OR bb.session_id != _session_id)
          ) THEN
            RETURN QUERY SELECT
              slot_start_ts,
              slot_end_ts,
              current_day,
              to_char(slot_start_ts AT TIME ZONE tenant_tz, 'HH12:MI AM'),
              has_session_lock;
          END IF;
        END IF;

        slot_start_ts := slot_start_ts + interval '30 minutes';
      END LOOP;
    END IF;

    current_day := current_day + 1;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.fn_lock_offered_slots TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_extend_session_locks TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_release_session_locks TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_confirm_slot_from_session TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_refresh_session_slots TO authenticated, service_role;
