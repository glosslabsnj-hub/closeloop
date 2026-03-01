
-- Drop and recreate fn_compute_available_slots with windows format support
DROP FUNCTION IF EXISTS public.fn_compute_available_slots(uuid, date, date, integer, integer, jsonb);

CREATE OR REPLACE FUNCTION public.fn_compute_available_slots(
  _tenant_id UUID,
  _start_date DATE,
  _end_date DATE,
  _duration_minutes INT DEFAULT 60,
  _buffer_minutes INT DEFAULT 0,
  _business_hours JSONB DEFAULT NULL
)
RETURNS TABLE(slot_start TIMESTAMPTZ, slot_end TIMESTAMPTZ, slot_date DATE, slot_time_local TEXT)
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
  now_ts TIMESTAMPTZ := NOW();
  min_lead_hours INTEGER;
  max_advance_days INTEGER;
  earliest_allowed TIMESTAMPTZ;
  latest_allowed DATE;
BEGIN
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
  
  earliest_allowed := now_ts + (min_lead_hours || ' hours')::INTERVAL;
  latest_allowed := (now_ts AT TIME ZONE tenant_tz)::DATE + max_advance_days;
  total_duration := _duration_minutes + COALESCE(_buffer_minutes, 0);
  
  current_day := _start_date;
  WHILE current_day <= _end_date AND current_day <= latest_allowed LOOP
    day_name := LOWER(TO_CHAR(current_day, 'FMDay'));
    
    IF _business_hours IS NOT NULL AND _business_hours ? day_name THEN
      day_hours := _business_hours -> day_name;
      
      IF day_hours ->> 'closed' = 'true' OR day_hours -> 'closed' = 'true'::JSONB THEN
        current_day := current_day + 1;
        CONTINUE;
      END IF;
      
      -- *** NORMALIZE: handle both flat and windows format ***
      IF day_hours ? 'windows' AND jsonb_array_length(day_hours -> 'windows') > 0 THEN
        open_time := ((day_hours -> 'windows' -> 0) ->> 'open')::TIME;
        close_time := ((day_hours -> 'windows' -> 0) ->> 'close')::TIME;
      ELSE
        open_time := (day_hours ->> 'open')::TIME;
        close_time := (day_hours ->> 'close')::TIME;
      END IF;
      
      IF open_time IS NOT NULL AND close_time IS NOT NULL THEN
        slot_start_ts := (current_day::TIMESTAMP + open_time) AT TIME ZONE tenant_tz;
        
        WHILE slot_start_ts + (total_duration || ' minutes')::INTERVAL <= 
              ((current_day::TIMESTAMP + close_time) AT TIME ZONE tenant_tz) LOOP
          
          slot_end_ts := slot_start_ts + (_duration_minutes || ' minutes')::INTERVAL;
          
          IF slot_start_ts >= earliest_allowed THEN
            IF NOT EXISTS (
              SELECT 1 FROM busy_blocks bb
              WHERE bb.tenant_id = _tenant_id
                AND bb.is_active = TRUE
                AND (bb.expires_at IS NULL OR bb.expires_at > now_ts)
                AND bb.start_at < slot_end_ts + (_buffer_minutes || ' minutes')::INTERVAL
                AND bb.end_at > slot_start_ts
            ) THEN
              RETURN QUERY SELECT 
                slot_start_ts,
                slot_end_ts,
                current_day,
                TO_CHAR(slot_start_ts AT TIME ZONE tenant_tz, 'HH12:MI AM');
            END IF;
          END IF;
          
          slot_start_ts := slot_start_ts + INTERVAL '30 minutes';
        END LOOP;
      END IF;
    END IF;
    
    current_day := current_day + 1;
  END LOOP;
END;
$$;

-- Fix Blue Boxer min_lead_hours (skip if tenant doesn't exist)
UPDATE public.tenants
SET min_lead_hours = 2
WHERE id = '3b567b02-eddb-4c4c-a7d5-aeb2e4d0d9c3';

-- Insert assistant_settings for Blue Boxer (skip if tenant doesn't exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.tenants WHERE id = '3b567b02-eddb-4c4c-a7d5-aeb2e4d0d9c3') THEN
    INSERT INTO public.assistant_settings (
      tenant_id, voice_ai_enabled, ai_booking_mode, calendar_provider, same_day_enabled, ai_behavior_mode
    ) VALUES (
      '3b567b02-eddb-4c4c-a7d5-aeb2e4d0d9c3', true, 'pending_approval', 'google', true, 'full_service'
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      ai_booking_mode = EXCLUDED.ai_booking_mode,
      calendar_provider = EXCLUDED.calendar_provider,
      same_day_enabled = EXCLUDED.same_day_enabled;
  END IF;
END $$;
