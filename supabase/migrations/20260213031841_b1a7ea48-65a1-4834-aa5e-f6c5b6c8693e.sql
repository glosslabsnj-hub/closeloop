
-- Drop both overloads first
DROP FUNCTION IF EXISTS public.fn_compute_available_slots(uuid, date, date, integer, integer, jsonb);
DROP FUNCTION IF EXISTS public.fn_compute_available_slots(uuid, date, date, integer, integer, jsonb, integer);

-- Recreate with unified signature supporting both hours_json formats
CREATE OR REPLACE FUNCTION public.fn_compute_available_slots(
  _tenant_id uuid,
  _start_date date,
  _end_date date,
  _duration_minutes integer DEFAULT 60,
  _buffer_minutes integer DEFAULT 0,
  _business_hours jsonb DEFAULT NULL::jsonb,
  _capacity integer DEFAULT NULL::integer
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz, slot_date text, slot_time_local text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
  _is_open boolean;
  _window jsonb;
BEGIN
  SELECT COALESCE(t.timezone, 'America/Chicago') INTO _tz FROM tenants t WHERE t.id = _tenant_id;

  IF _capacity IS NOT NULL AND _capacity > 0 THEN
    _effective_capacity := _capacity;
  ELSE
    SELECT COALESCE(t.default_capacity, 1) INTO _effective_capacity FROM tenants t WHERE t.id = _tenant_id;
  END IF;

  SELECT COALESCE(t.min_lead_hours, 0) INTO _min_lead_hours FROM tenants t WHERE t.id = _tenant_id;

  _earliest_allowed := (now() AT TIME ZONE _tz + (_min_lead_hours || ' hours')::interval) AT TIME ZONE _tz;
  _interval_minutes := _duration_minutes + _buffer_minutes;

  _current_date := _start_date;
  WHILE _current_date <= _end_date LOOP
    _dow := EXTRACT(DOW FROM _current_date)::integer;
    _day_key := CASE _dow
      WHEN 0 THEN 'sunday' WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday' WHEN 4 THEN 'thursday' WHEN 5 THEN 'friday' WHEN 6 THEN 'saturday'
    END;

    IF _business_hours IS NOT NULL AND _business_hours ? _day_key THEN
      _day_config := _business_hours -> _day_key;

      -- Support BOTH formats:
      -- Format A (windows): {"closed": false, "windows": [{"open":"08:00","close":"16:30"}]}
      -- Format B (flat):    {"enabled": true, "open": "08:00", "close": "16:30"}
      _is_open := false;
      IF _day_config ? 'closed' THEN
        _is_open := NOT COALESCE((_day_config ->> 'closed')::boolean, true);
      ELSIF _day_config ? 'enabled' THEN
        _is_open := COALESCE((_day_config ->> 'enabled')::boolean, false);
      END IF;

      IF _is_open THEN
        IF _day_config ? 'windows' AND jsonb_array_length(COALESCE(_day_config -> 'windows', '[]'::jsonb)) > 0 THEN
          FOR _window IN SELECT * FROM jsonb_array_elements(_day_config -> 'windows')
          LOOP
            _open_time := (_window ->> 'open')::time;
            _close_time := (_window ->> 'close')::time;
            _slot_start := (_current_date || ' ' || _open_time::text)::timestamp AT TIME ZONE _tz;

            WHILE (_slot_start + (_duration_minutes || ' minutes')::interval) <=
                  ((_current_date || ' ' || _close_time::text)::timestamp AT TIME ZONE _tz) LOOP
              _slot_end := _slot_start + (_duration_minutes || ' minutes')::interval;

              IF _slot_start >= _earliest_allowed THEN
                IF (
                  SELECT COUNT(*) FROM bookings b
                  WHERE b.tenant_id = _tenant_id AND b.status NOT IN ('canceled','no_show')
                    AND b.start_at < _slot_end AND b.end_at > _slot_start
                ) < _effective_capacity
                AND NOT EXISTS (
                  SELECT 1 FROM busy_blocks bb
                  WHERE bb.tenant_id = _tenant_id AND bb.is_active = true AND bb.block_type != 'booking'
                    AND (bb.expires_at IS NULL OR bb.expires_at > now())
                    AND bb.start_at < _slot_end AND bb.end_at > _slot_start
                ) THEN
                  slot_start := _slot_start;
                  slot_end := _slot_end;
                  slot_date := to_char(_current_date, 'YYYY-MM-DD');
                  slot_time_local := to_char(_slot_start AT TIME ZONE _tz, 'HH12:MI AM');
                  RETURN NEXT;
                END IF;
              END IF;
              _slot_start := _slot_start + (_interval_minutes || ' minutes')::interval;
            END LOOP;
          END LOOP;
        ELSE
          -- Flat format
          _open_time := (_day_config ->> 'open')::time;
          _close_time := (_day_config ->> 'close')::time;
          IF _open_time IS NOT NULL AND _close_time IS NOT NULL THEN
            _slot_start := (_current_date || ' ' || _open_time::text)::timestamp AT TIME ZONE _tz;
            WHILE (_slot_start + (_duration_minutes || ' minutes')::interval) <=
                  ((_current_date || ' ' || _close_time::text)::timestamp AT TIME ZONE _tz) LOOP
              _slot_end := _slot_start + (_duration_minutes || ' minutes')::interval;
              IF _slot_start >= _earliest_allowed THEN
                IF (
                  SELECT COUNT(*) FROM bookings b
                  WHERE b.tenant_id = _tenant_id AND b.status NOT IN ('canceled','no_show')
                    AND b.start_at < _slot_end AND b.end_at > _slot_start
                ) < _effective_capacity
                AND NOT EXISTS (
                  SELECT 1 FROM busy_blocks bb
                  WHERE bb.tenant_id = _tenant_id AND bb.is_active = true AND bb.block_type != 'booking'
                    AND (bb.expires_at IS NULL OR bb.expires_at > now())
                    AND bb.start_at < _slot_end AND bb.end_at > _slot_start
                ) THEN
                  slot_start := _slot_start;
                  slot_end := _slot_end;
                  slot_date := to_char(_current_date, 'YYYY-MM-DD');
                  slot_time_local := to_char(_slot_start AT TIME ZONE _tz, 'HH12:MI AM');
                  RETURN NEXT;
                END IF;
              END IF;
              _slot_start := _slot_start + (_interval_minutes || ' minutes')::interval;
            END LOOP;
          END IF;
        END IF;
      END IF;
    ELSE
      -- Fallback: availability_slots table
      _slot_start := (_current_date || ' 08:00:00')::timestamp AT TIME ZONE _tz;
      WHILE (_slot_start + (_duration_minutes || ' minutes')::interval) <=
            ((_current_date || ' 18:00:00')::timestamp AT TIME ZONE _tz) LOOP
        _slot_end := _slot_start + (_duration_minutes || ' minutes')::interval;
        IF _slot_start >= _earliest_allowed THEN
          IF EXISTS (
            SELECT 1 FROM availability_slots avs
            WHERE avs.tenant_id = _tenant_id AND avs.day_of_week = _dow AND avs.is_available = true
              AND avs.start_time <= (_slot_start AT TIME ZONE _tz)::time
              AND avs.end_time >= (_slot_end AT TIME ZONE _tz)::time
          ) THEN
            IF (
              SELECT COUNT(*) FROM bookings b
              WHERE b.tenant_id = _tenant_id AND b.status NOT IN ('canceled','no_show')
                AND b.start_at < _slot_end AND b.end_at > _slot_start
            ) < _effective_capacity
            AND NOT EXISTS (
              SELECT 1 FROM busy_blocks bb
              WHERE bb.tenant_id = _tenant_id AND bb.is_active = true AND bb.block_type != 'booking'
                AND (bb.expires_at IS NULL OR bb.expires_at > now())
                AND bb.start_at < _slot_end AND bb.end_at > _slot_start
            ) THEN
              slot_start := _slot_start;
              slot_end := _slot_end;
              slot_date := to_char(_current_date, 'YYYY-MM-DD');
              slot_time_local := to_char(_slot_start AT TIME ZONE _tz, 'HH12:MI AM');
              RETURN NEXT;
            END IF;
          END IF;
        END IF;
        _slot_start := _slot_start + (_interval_minutes || ' minutes')::interval;
      END LOOP;
    END IF;

    _current_date := _current_date + 1;
  END LOOP;
END;
$function$;
