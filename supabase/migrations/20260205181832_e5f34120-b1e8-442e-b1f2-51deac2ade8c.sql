-- Session Slot Locking Functions
-- These functions manage temporary slot locks during AI voice calls

-- 1. fn_release_session_locks: Release all locks for a session (call ended without booking)
CREATE OR REPLACE FUNCTION public.fn_release_session_locks(_session_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count integer;
BEGIN
  UPDATE busy_blocks
  SET is_active = false
  WHERE session_id = _session_id
    AND block_type = 'session_lock'
    AND is_active = true;
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  
  RETURN released_count;
END;
$$;

-- 2. fn_extend_session_locks: Extend TTL for all locks in a session (keep-alive)
CREATE OR REPLACE FUNCTION public.fn_extend_session_locks(
  _session_id text,
  _extend_minutes integer DEFAULT 10
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extended_count integer;
BEGIN
  UPDATE busy_blocks
  SET expires_at = NOW() + (_extend_minutes || ' minutes')::interval
  WHERE session_id = _session_id
    AND block_type = 'session_lock'
    AND is_active = true;
  
  GET DIAGNOSTICS extended_count = ROW_COUNT;
  
  RETURN extended_count;
END;
$$;

-- 3. fn_lock_offered_slots: Lock multiple slots that were offered to a caller
CREATE OR REPLACE FUNCTION public.fn_lock_offered_slots(
  _tenant_id uuid,
  _session_id text,
  _slots jsonb,  -- Array of {start_at, end_at} objects
  _lock_minutes integer DEFAULT 10
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_record jsonb;
  locked_count integer := 0;
BEGIN
  FOR slot_record IN SELECT * FROM jsonb_array_elements(_slots)
  LOOP
    INSERT INTO busy_blocks (
      tenant_id,
      session_id,
      block_type,
      start_at,
      end_at,
      expires_at,
      is_active
    ) VALUES (
      _tenant_id,
      _session_id,
      'session_lock',
      (slot_record->>'start_at')::timestamptz,
      (slot_record->>'end_at')::timestamptz,
      NOW() + (_lock_minutes || ' minutes')::interval,
      true
    );
    locked_count := locked_count + 1;
  END LOOP;
  
  RETURN locked_count;
END;
$$;

-- 4. fn_confirm_slot_from_session: Convert a session lock to a confirmed booking
CREATE OR REPLACE FUNCTION public.fn_confirm_slot_from_session(
  _session_id text,
  _slot_start timestamptz,
  _slot_end timestamptz,
  _customer_id uuid DEFAULT NULL,
  _service_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS TABLE(success boolean, booking_id uuid, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_lock_id uuid;
  v_booking_id uuid;
  v_lead_id uuid;
BEGIN
  -- Find the session lock
  SELECT bb.id, bb.tenant_id INTO v_lock_id, v_tenant_id
  FROM busy_blocks bb
  WHERE bb.session_id = _session_id
    AND bb.block_type = 'session_lock'
    AND bb.start_at = _slot_start
    AND bb.end_at = _slot_end
    AND bb.is_active = true
    AND (bb.expires_at IS NULL OR bb.expires_at > NOW())
  LIMIT 1;
  
  IF v_lock_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'No valid lock found for this slot';
    RETURN;
  END IF;
  
  -- Get or create a lead for this customer
  IF _customer_id IS NOT NULL THEN
    SELECT l.id INTO v_lead_id
    FROM leads l
    WHERE l.customer_id = _customer_id AND l.tenant_id = v_tenant_id
    ORDER BY l.created_at DESC
    LIMIT 1;
    
    IF v_lead_id IS NULL THEN
      INSERT INTO leads (tenant_id, customer_id, name, phone_e164, source)
      SELECT v_tenant_id, _customer_id, c.full_name, c.phone_e164, 'ai_voice'
      FROM customers c WHERE c.id = _customer_id
      RETURNING id INTO v_lead_id;
    END IF;
  ELSE
    -- Create anonymous lead
    INSERT INTO leads (tenant_id, name, source)
    VALUES (v_tenant_id, 'AI Voice Booking', 'ai_voice')
    RETURNING id INTO v_lead_id;
  END IF;
  
  -- Create the booking
  INSERT INTO bookings (
    tenant_id,
    lead_id,
    service_id,
    session_id,
    start_at,
    end_at,
    status,
    notes
  ) VALUES (
    v_tenant_id,
    v_lead_id,
    _service_id,
    _session_id,
    _slot_start,
    _slot_end,
    'confirmed',
    _notes
  )
  RETURNING id INTO v_booking_id;
  
  -- Convert the session lock to a booking block
  UPDATE busy_blocks
  SET block_type = 'booking',
      booking_id = v_booking_id,
      expires_at = NULL  -- Permanent now
  WHERE id = v_lock_id;
  
  -- Release any other session locks for this session
  UPDATE busy_blocks
  SET is_active = false
  WHERE session_id = _session_id
    AND block_type = 'session_lock'
    AND id != v_lock_id;
  
  RETURN QUERY SELECT true, v_booking_id, NULL::text;
END;
$$;

-- 5. fn_refresh_session_slots: Clean up expired session locks (maintenance)
CREATE OR REPLACE FUNCTION public.fn_refresh_session_slots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count integer;
BEGIN
  UPDATE busy_blocks
  SET is_active = false
  WHERE block_type = 'session_lock'
    AND is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.fn_release_session_locks(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_extend_session_locks(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_lock_offered_slots(uuid, text, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_confirm_slot_from_session(text, timestamptz, timestamptz, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_refresh_session_slots() TO service_role;