
-- Add default_capacity column to tenants (how many concurrent appointments)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS default_capacity integer NOT NULL DEFAULT 1;

-- Update fn_compute_available_slots to be capacity-aware
-- The function now counts bookings per slot and only excludes when bookings >= capacity
CREATE OR REPLACE FUNCTION public.fn_compute_available_slots(
  _tenant_id uuid,
  _start_date date,
  _end_date date,
  _duration_minutes integer DEFAULT 60,
  _buffer_minutes integer DEFAULT 0,
  _business_hours jsonb DEFAULT NULL,
  _capacity integer DEFAULT NULL
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _tz text;
  _effective_capacity integer;
  _current_date date;
  _dow integer;
  _day_key text;
  _day_config jsonb;
  _open_time time;
  _close_time time;
  _slot_start timestamptz;
  _slot_end timestamptz;
  _interval_minutes integer;
  _min_lead_hours integer;
  _earliest_allowed timestamptz;
BEGIN
  -- Resolve tenant timezone
  SELECT COALESCE(t.timezone, 'America/Chicago')
  INTO _tz
  FROM tenants t WHERE t.id = _tenant_id;

  -- Resolve effective capacity: parameter > tenant default > 1
  IF _capacity IS NOT NULL AND _capacity > 0 THEN
    _effective_capacity := _capacity;
  ELSE
    SELECT COALESCE(t.default_capacity, 1)
    INTO _effective_capacity
    FROM tenants t WHERE t.id = _tenant_id;
  END IF;

  -- Resolve min lead hours
  SELECT COALESCE(t.min_lead_hours, 0)
  INTO _min_lead_hours
  FROM tenants t WHERE t.id = _tenant_id;

  _earliest_allowed := (now() AT TIME ZONE _tz + (_min_lead_hours || ' hours')::interval) AT TIME ZONE _tz;
  _interval_minutes := _duration_minutes + _buffer_minutes;

  _current_date := _start_date;
  WHILE _current_date <= _end_date LOOP
    _dow := EXTRACT(DOW FROM _current_date)::integer;

    -- Map DOW to hours key
    _day_key := CASE _dow
      WHEN 0 THEN 'sunday'
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
    END;

    -- Get business hours for this day
    IF _business_hours IS NOT NULL AND _business_hours ? _day_key THEN
      _day_config := _business_hours -> _day_key;

      IF (_day_config ->> 'enabled')::boolean = true THEN
        _open_time := (_day_config ->> 'open')::time;
        _close_time := (_day_config ->> 'close')::time;

        _slot_start := (_current_date || ' ' || _open_time::text)::timestamp AT TIME ZONE _tz;

        WHILE (_slot_start + (_duration_minutes || ' minutes')::interval) <=
              ((_current_date || ' ' || _close_time::text)::timestamp AT TIME ZONE _tz) LOOP

          _slot_end := _slot_start + (_duration_minutes || ' minutes')::interval;

          -- Skip past slots
          IF _slot_start >= _earliest_allowed THEN
            -- Check capacity: count overlapping bookings + busy_blocks
            IF (
              SELECT COUNT(*)
              FROM bookings b
              WHERE b.tenant_id = _tenant_id
                AND b.status NOT IN ('canceled', 'no_show')
                AND b.start_at < _slot_end
                AND b.end_at > _slot_start
            ) < _effective_capacity
            AND NOT EXISTS (
              SELECT 1
              FROM busy_blocks bb
              WHERE bb.tenant_id = _tenant_id
                AND bb.is_active = true
                AND bb.block_type != 'booking'
                AND (bb.expires_at IS NULL OR bb.expires_at > now())
                AND bb.start_at < _slot_end
                AND bb.end_at > _slot_start
            )
            THEN
              slot_start := _slot_start;
              slot_end := _slot_end;
              RETURN NEXT;
            END IF;
          END IF;

          _slot_start := _slot_start + (_interval_minutes || ' minutes')::interval;
        END LOOP;
      END IF;
    ELSE
      -- No business hours config: check availability_slots table
      _slot_start := (_current_date || ' 08:00:00')::timestamp AT TIME ZONE _tz;

      WHILE (_slot_start + (_duration_minutes || ' minutes')::interval) <=
            ((_current_date || ' 18:00:00')::timestamp AT TIME ZONE _tz) LOOP

        _slot_end := _slot_start + (_duration_minutes || ' minutes')::interval;

        IF _slot_start >= _earliest_allowed THEN
          -- Check if within availability_slots
          IF EXISTS (
            SELECT 1
            FROM availability_slots avs
            WHERE avs.tenant_id = _tenant_id
              AND avs.day_of_week = _dow
              AND avs.is_available = true
              AND avs.start_time <= (_slot_start AT TIME ZONE _tz)::time
              AND avs.end_time >= (_slot_end AT TIME ZONE _tz)::time
          ) THEN
            -- Check capacity
            IF (
              SELECT COUNT(*)
              FROM bookings b
              WHERE b.tenant_id = _tenant_id
                AND b.status NOT IN ('canceled', 'no_show')
                AND b.start_at < _slot_end
                AND b.end_at > _slot_start
            ) < _effective_capacity
            AND NOT EXISTS (
              SELECT 1
              FROM busy_blocks bb
              WHERE bb.tenant_id = _tenant_id
                AND bb.is_active = true
                AND bb.block_type != 'booking'
                AND (bb.expires_at IS NULL OR bb.expires_at > now())
                AND bb.start_at < _slot_end
                AND bb.end_at > _slot_start
            )
            THEN
              slot_start := _slot_start;
              slot_end := _slot_end;
              RETURN NEXT;
            END IF;
          END IF;
        END IF;

        _slot_start := _slot_start + (_interval_minutes || ' minutes')::interval;
      END LOOP;
    END IF;

    _current_date := _current_date + 1;
  END LOOP;

  RETURN;
END;
$$;
