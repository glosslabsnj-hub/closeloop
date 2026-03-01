-- Add calendar_tokens table for secure token storage (service role only)
CREATE TABLE IF NOT EXISTS public.calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'calendly', 'square')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, provider)
);

-- Enable RLS but LOCK DOWN completely - only service role can access
ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated users
-- Only service_role bypasses RLS

DROP TRIGGER IF EXISTS update_calendar_tokens_updated_at ON public.calendar_tokens;
CREATE TRIGGER update_calendar_tokens_updated_at
  BEFORE UPDATE ON public.calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_tenant ON public.calendar_tokens(tenant_id);

-- Add expires_at column to busy_blocks if not exists (for hold expiration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'busy_blocks' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.busy_blocks ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add session_id for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'busy_blocks' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.busy_blocks ADD COLUMN session_id TEXT;
  END IF;
END $$;

-- CREATE INDEX IF NOT EXISTS for hold cleanup
CREATE INDEX IF NOT EXISTS idx_busy_blocks_expires_at ON public.busy_blocks(expires_at) WHERE expires_at IS NOT NULL;

-- Update fn_place_hold to include session_id for idempotency
CREATE OR REPLACE FUNCTION public.fn_place_hold(
  _tenant_id UUID,
  _start_at TIMESTAMPTZ,
  _end_at TIMESTAMPTZ,
  _hold_minutes INTEGER DEFAULT 5,
  _session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_expires_at := now() + (_hold_minutes || ' minutes')::INTERVAL;
  
  -- If session_id provided, check for existing hold
  IF _session_id IS NOT NULL THEN
    SELECT id INTO v_hold_id
    FROM busy_blocks
    WHERE tenant_id = _tenant_id
      AND session_id = _session_id
      AND block_type = 'hold'
      AND is_active = TRUE
      AND expires_at > now();
    
    IF v_hold_id IS NOT NULL THEN
      -- Extend existing hold
      UPDATE busy_blocks
      SET expires_at = v_expires_at
      WHERE id = v_hold_id;
      RETURN v_hold_id;
    END IF;
  END IF;
  
  -- First, clean up expired holds
  UPDATE busy_blocks
  SET is_active = FALSE
  WHERE tenant_id = _tenant_id
    AND block_type = 'hold'
    AND expires_at < now()
    AND is_active = TRUE;
  
  -- Try to insert - will fail if overlap exists due to exclusion constraint
  BEGIN
    INSERT INTO busy_blocks (
      tenant_id, 
      start_at, 
      end_at, 
      block_type, 
      expires_at,
      session_id,
      is_active
    )
    VALUES (
      _tenant_id,
      _start_at,
      _end_at,
      'hold',
      v_expires_at,
      _session_id,
      TRUE
    )
    RETURNING id INTO v_hold_id;
    
    RETURN v_hold_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Time slot is not available';
  END;
END;
$$;

-- Update fn_confirm_booking to handle external calendar sync flag
CREATE OR REPLACE FUNCTION public.fn_confirm_booking(
  _hold_id UUID,
  _lead_id UUID DEFAULT NULL,
  _service_id UUID DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold RECORD;
  v_booking_id UUID;
  v_service RECORD;
  v_end_at TIMESTAMPTZ;
BEGIN
  -- Get the hold with lock
  SELECT * INTO v_hold
  FROM busy_blocks
  WHERE id = _hold_id
    AND block_type = 'hold'
    AND is_active = TRUE
  FOR UPDATE;
  
  IF v_hold IS NULL THEN
    RAISE EXCEPTION 'Hold not found or expired';
  END IF;
  
  IF v_hold.expires_at < now() THEN
    UPDATE busy_blocks SET is_active = FALSE WHERE id = _hold_id;
    RAISE EXCEPTION 'Hold has expired';
  END IF;
  
  -- Get service duration if provided
  IF _service_id IS NOT NULL THEN
    SELECT * INTO v_service FROM services WHERE id = _service_id;
    IF v_service IS NOT NULL THEN
      v_end_at := v_hold.start_at + (v_service.duration_minutes || ' minutes')::INTERVAL;
    ELSE
      v_end_at := v_hold.end_at;
    END IF;
  ELSE
    v_end_at := v_hold.end_at;
  END IF;
  
  -- Create the booking
  INSERT INTO bookings (
    tenant_id,
    lead_id,
    service_id,
    start_at,
    end_at,
    status,
    notes
  )
  VALUES (
    v_hold.tenant_id,
    _lead_id,
    _service_id,
    v_hold.start_at,
    v_end_at,
    'confirmed',
    _notes
  )
  RETURNING id INTO v_booking_id;
  
  -- Convert hold to confirmed booking
  UPDATE busy_blocks
  SET 
    block_type = 'confirmed_booking',
    booking_id = v_booking_id,
    expires_at = NULL,
    end_at = v_end_at
  WHERE id = _hold_id;
  
  RETURN v_booking_id;
END;
$$;

-- Function to sync external calendar events to busy_blocks
CREATE OR REPLACE FUNCTION public.fn_sync_busy_blocks(
  _tenant_id UUID,
  _connection_id UUID,
  _events JSONB -- Array of {start_at, end_at, external_event_id, summary?}
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_event JSONB;
  v_min_date TIMESTAMPTZ;
  v_max_date TIMESTAMPTZ;
BEGIN
  -- Calculate date range from events
  SELECT 
    MIN((e->>'start_at')::TIMESTAMPTZ),
    MAX((e->>'end_at')::TIMESTAMPTZ)
  INTO v_min_date, v_max_date
  FROM jsonb_array_elements(_events) e;
  
  -- Delete old external_busy blocks for this connection in the date range
  DELETE FROM busy_blocks
  WHERE tenant_id = _tenant_id
    AND source_connection_id = _connection_id
    AND block_type = 'external_busy'
    AND start_at >= v_min_date
    AND end_at <= v_max_date + INTERVAL '1 day';
  
  -- Insert new blocks
  FOR v_event IN SELECT * FROM jsonb_array_elements(_events)
  LOOP
    INSERT INTO busy_blocks (
      tenant_id,
      source_connection_id,
      start_at,
      end_at,
      block_type,
      external_event_id,
      is_active,
      metadata_json
    )
    VALUES (
      _tenant_id,
      _connection_id,
      (v_event->>'start_at')::TIMESTAMPTZ,
      (v_event->>'end_at')::TIMESTAMPTZ,
      'external_busy',
      v_event->>'external_event_id',
      TRUE,
      jsonb_build_object('summary', COALESCE(v_event->>'summary', 'Busy'))
    )
    ON CONFLICT DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  -- Update last_sync_at on connection
  UPDATE calendar_connections
  SET last_sync_at = now()
  WHERE id = _connection_id;
  
  RETURN v_count;
END;
$$;

-- Function to clean up expired holds (can be called by cron or edge function)
CREATE OR REPLACE FUNCTION public.fn_cleanup_expired_holds()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE busy_blocks
  SET is_active = FALSE
  WHERE block_type = 'hold'
    AND expires_at < now()
    AND is_active = TRUE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;