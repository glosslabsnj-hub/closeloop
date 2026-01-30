-- Drop and recreate fn_compute_available_slots to be timezone-aware and side-effect-free
-- This function now properly converts local business hours to UTC timestamps

DROP FUNCTION IF EXISTS public.fn_compute_available_slots;

CREATE OR REPLACE FUNCTION public.fn_compute_available_slots(
  _tenant_id uuid,
  _start_date date,
  _end_date date,
  _duration_minutes integer DEFAULT 60,
  _buffer_minutes integer DEFAULT 0,
  _business_hours jsonb DEFAULT NULL
)
RETURNS TABLE (
  slot_start timestamptz,
  slot_end timestamptz,
  slot_date date,
  slot_time_local text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_day date;
  day_name text;
  day_hours jsonb;
  open_time time;
  close_time time;
  slot_start_ts timestamptz;
  slot_end_ts timestamptz;
  total_duration integer;
  tenant_tz text;
  now_ts timestamptz := now();
  min_lead_hours integer;
  max_advance_days integer;
  earliest_allowed timestamptz;
  latest_allowed timestamptz;
BEGIN
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
  
  -- Calculate earliest allowed booking time (min lead time)
  earliest_allowed := now_ts + (min_lead_hours || ' hours')::interval;
  
  -- Calculate latest allowed booking date
  latest_allowed := (now_ts AT TIME ZONE tenant_tz)::date + max_advance_days;
  
  -- Total duration including buffer
  total_duration := _duration_minutes + COALESCE(_buffer_minutes, 0);
  
  -- Iterate through each day in the range
  current_day := _start_date;
  WHILE current_day <= _end_date AND current_day <= latest_allowed LOOP
    -- Get day name in lowercase
    day_name := lower(to_char(current_day, 'FMDay'));
    
    -- Get hours for this day from business_hours parameter
    IF _business_hours IS NOT NULL AND _business_hours ? day_name THEN
      day_hours := _business_hours -> day_name;
      
      -- Skip if closed
      IF day_hours->>'closed' = 'true' OR day_hours->'closed' = 'true'::jsonb THEN
        current_day := current_day + 1;
        CONTINUE;
      END IF;
      
      open_time := (day_hours->>'open')::time;
      close_time := (day_hours->>'close')::time;
      
      -- Generate 30-minute slots within business hours
      -- Build timestamps in tenant's local timezone, then convert to UTC
      slot_start_ts := (current_day::timestamp + open_time) AT TIME ZONE tenant_tz;
      
      WHILE slot_start_ts + (total_duration || ' minutes')::interval <= 
            ((current_day::timestamp + close_time) AT TIME ZONE tenant_tz) LOOP
        
        slot_end_ts := slot_start_ts + (_duration_minutes || ' minutes')::interval;
        
        -- Skip slots that are in the past or before minimum lead time
        IF slot_start_ts >= earliest_allowed THEN
          -- Check for conflicts with busy_blocks (excluding expired holds)
          IF NOT EXISTS (
            SELECT 1 FROM busy_blocks bb
            WHERE bb.tenant_id = _tenant_id
              AND bb.is_active = true
              AND (bb.expires_at IS NULL OR bb.expires_at > now_ts)
              AND bb.start_at < slot_end_ts + (_buffer_minutes || ' minutes')::interval
              AND bb.end_at > slot_start_ts
          ) THEN
            -- Return the slot with local time display
            RETURN QUERY SELECT 
              slot_start_ts,
              slot_end_ts,
              current_day,
              to_char(slot_start_ts AT TIME ZONE tenant_tz, 'HH12:MI AM');
          END IF;
        END IF;
        
        -- Move to next 30-minute slot
        slot_start_ts := slot_start_ts + interval '30 minutes';
      END LOOP;
    END IF;
    
    current_day := current_day + 1;
  END LOOP;
END;
$$;

-- Also update fn_place_hold to properly handle expired holds in conflict check
DROP FUNCTION IF EXISTS public.fn_place_hold(uuid, timestamptz, timestamptz, text, integer);

CREATE OR REPLACE FUNCTION public.fn_place_hold(
  _tenant_id uuid,
  _start_at timestamptz,
  _end_at timestamptz,
  _session_id text,
  _ttl_minutes integer DEFAULT 5
)
RETURNS TABLE (
  hold_id uuid,
  success boolean,
  conflict_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_hold_id uuid;
  conflict_block record;
  now_ts timestamptz := now();
BEGIN
  -- Check for existing active conflicts (excluding expired holds)
  SELECT * INTO conflict_block
  FROM busy_blocks bb
  WHERE bb.tenant_id = _tenant_id
    AND bb.is_active = true
    AND (bb.expires_at IS NULL OR bb.expires_at > now_ts)
    AND bb.start_at < _end_at
    AND bb.end_at > _start_at
  LIMIT 1;
  
  IF conflict_block IS NOT NULL THEN
    RETURN QUERY SELECT 
      NULL::uuid,
      false,
      CASE conflict_block.block_type
        WHEN 'confirmed_booking' THEN 'Time slot already booked'
        WHEN 'hold' THEN 'Time slot is currently on hold'
        WHEN 'external_busy' THEN 'Conflict with external calendar event'
        WHEN 'manual' THEN 'Time blocked by business'
        ELSE 'Time slot not available'
      END;
    RETURN;
  END IF;
  
  -- Create the hold
  INSERT INTO busy_blocks (
    tenant_id,
    block_type,
    start_at,
    end_at,
    session_id,
    expires_at,
    is_active,
    metadata_json
  ) VALUES (
    _tenant_id,
    'hold',
    _start_at,
    _end_at,
    _session_id,
    now_ts + (_ttl_minutes || ' minutes')::interval,
    true,
    jsonb_build_object('created_by', 'ai_agent', 'session_id', _session_id)
  )
  RETURNING id INTO new_hold_id;
  
  RETURN QUERY SELECT new_hold_id, true, NULL::text;
END;
$$;

-- Add index for faster busy block queries if not exists
CREATE INDEX IF NOT EXISTS idx_busy_blocks_active_lookup 
ON busy_blocks (tenant_id, is_active, start_at, end_at) 
WHERE is_active = true;