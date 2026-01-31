-- Calendar Connections table
CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'calendly', 'square', 'ics', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
  display_name TEXT,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth', 'api_key', 'ics_url', 'manual')),
  config_json JSONB DEFAULT '{}',
  scopes_json JSONB DEFAULT '[]',
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenants can manage own calendar connections"
  ON public.calendar_connections FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_connections_tenant ON public.calendar_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_status ON public.calendar_connections(tenant_id, status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_calendar_connections_updated_at ON public.calendar_connections;
CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON public.calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Busy Blocks table (source of truth for availability)
-- ============================================
CREATE TABLE IF NOT EXISTS public.busy_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_connection_id UUID REFERENCES public.calendar_connections(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('external_busy', 'manual_busy', 'hold', 'confirmed_booking')),
  external_event_id TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ, -- For holds
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Instead of checking now() in constraint
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint: end must be after start
  CONSTRAINT busy_blocks_time_check CHECK (end_at > start_at)
);

-- Enable RLS
ALTER TABLE public.busy_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenants can manage own busy blocks"
  ON public.busy_blocks FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_busy_blocks_tenant_time ON public.busy_blocks(tenant_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_busy_blocks_connection ON public.busy_blocks(source_connection_id);
CREATE INDEX IF NOT EXISTS idx_busy_blocks_type ON public.busy_blocks(tenant_id, block_type);
CREATE INDEX IF NOT EXISTS idx_busy_blocks_expires ON public.busy_blocks(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_busy_blocks_active ON public.busy_blocks(tenant_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- Exclusion constraint for active holds/bookings only (immutable)
-- ============================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.busy_blocks
DROP CONSTRAINT IF EXISTS busy_blocks_no_overlap;

ALTER TABLE public.busy_blocks
ADD CONSTRAINT busy_blocks_no_overlap
EXCLUDE USING gist (
  tenant_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (block_type IN ('hold', 'confirmed_booking') AND is_active = TRUE);

-- ============================================
-- Update bookings table with external_event_id if not exists
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'external_event_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN external_event_id TEXT;
  END IF;
END $$;

-- ============================================
-- Function to clean up expired holds (deactivates them)
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_holds()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.busy_blocks 
  SET is_active = FALSE
  WHERE block_type = 'hold' 
    AND is_active = TRUE
    AND expires_at IS NOT NULL 
    AND expires_at < now();
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- Function to compute available slots
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_compute_available_slots(
  _tenant_id UUID,
  _start_date DATE,
  _end_date DATE,
  _duration_minutes INTEGER DEFAULT 60,
  _buffer_minutes INTEGER DEFAULT 0,
  _business_hours JSONB DEFAULT NULL
)
RETURNS TABLE (
  slot_start TIMESTAMPTZ,
  slot_end TIMESTAMPTZ
) AS $$
DECLARE
  current_day DATE;
  day_name TEXT;
  day_hours JSONB;
  open_time TIME;
  close_time TIME;
  slot_start_ts TIMESTAMPTZ;
  slot_end_ts TIMESTAMPTZ;
  total_duration INTEGER;
BEGIN
  total_duration := _duration_minutes + _buffer_minutes;
  
  -- Clean up expired holds first
  PERFORM cleanup_expired_holds();
  
  -- Loop through each day
  current_day := _start_date;
  WHILE current_day <= _end_date LOOP
    day_name := lower(to_char(current_day, 'fmday'));
    
    -- Get business hours for this day
    IF _business_hours IS NOT NULL AND _business_hours ? day_name THEN
      day_hours := _business_hours -> day_name;
      
      -- Skip if closed
      IF (day_hours ->> 'closed')::boolean IS NOT TRUE THEN
        open_time := (day_hours ->> 'open')::TIME;
        close_time := (day_hours ->> 'close')::TIME;
        
        -- Generate slots for this day
        slot_start_ts := current_day + open_time;
        
        WHILE (slot_start_ts + (total_duration || ' minutes')::INTERVAL) <= (current_day + close_time) LOOP
          slot_end_ts := slot_start_ts + (total_duration || ' minutes')::INTERVAL;
          
          -- Check if slot conflicts with any active busy blocks
          IF NOT EXISTS (
            SELECT 1 FROM public.busy_blocks bb
            WHERE bb.tenant_id = _tenant_id
              AND bb.is_active = TRUE
              AND bb.start_at < slot_end_ts
              AND bb.end_at > slot_start_ts
          ) THEN
            slot_start := slot_start_ts;
            slot_end := slot_end_ts;
            RETURN NEXT;
          END IF;
          
          -- Move to next slot (30-minute increments)
          slot_start_ts := slot_start_ts + INTERVAL '30 minutes';
        END LOOP;
      END IF;
    END IF;
    
    current_day := current_day + 1;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- Function to place a hold
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_place_hold(
  _tenant_id UUID,
  _start_at TIMESTAMPTZ,
  _end_at TIMESTAMPTZ,
  _hold_minutes INTEGER DEFAULT 5,
  _session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  hold_id UUID;
BEGIN
  -- Clean up expired holds first
  PERFORM cleanup_expired_holds();
  
  -- Check for conflicts
  IF EXISTS (
    SELECT 1 FROM public.busy_blocks bb
    WHERE bb.tenant_id = _tenant_id
      AND bb.is_active = TRUE
      AND bb.start_at < _end_at
      AND bb.end_at > _start_at
      AND bb.block_type IN ('hold', 'confirmed_booking')
  ) THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;
  
  -- Create hold
  INSERT INTO public.busy_blocks (
    tenant_id, start_at, end_at, block_type, expires_at, is_active, metadata_json
  ) VALUES (
    _tenant_id, _start_at, _end_at, 'hold', now() + (_hold_minutes || ' minutes')::INTERVAL, TRUE,
    jsonb_build_object('session_id', _session_id)
  )
  RETURNING id INTO hold_id;
  
  RETURN hold_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- Function to confirm a booking from a hold
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_confirm_booking(
  _hold_id UUID,
  _lead_id UUID DEFAULT NULL,
  _service_id UUID DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  hold_record RECORD;
  new_booking_id UUID;
  actual_lead_id UUID;
BEGIN
  -- Lock and fetch the hold
  SELECT * INTO hold_record
  FROM public.busy_blocks
  WHERE id = _hold_id AND block_type = 'hold' AND is_active = TRUE
  FOR UPDATE;
  
  IF hold_record IS NULL THEN
    RAISE EXCEPTION 'Hold not found or already used';
  END IF;
  
  IF hold_record.expires_at < now() THEN
    UPDATE public.busy_blocks SET is_active = FALSE WHERE id = _hold_id;
    RAISE EXCEPTION 'Hold has expired';
  END IF;
  
  -- Get or create lead
  actual_lead_id := _lead_id;
  IF actual_lead_id IS NULL THEN
    SELECT id INTO actual_lead_id FROM public.leads WHERE tenant_id = hold_record.tenant_id LIMIT 1;
  END IF;
  
  IF actual_lead_id IS NULL THEN
    -- Create a placeholder lead
    INSERT INTO public.leads (tenant_id, full_name, phone_e164, source)
    VALUES (hold_record.tenant_id, 'AI Booking', '+10000000000', 'ai_booking')
    RETURNING id INTO actual_lead_id;
  END IF;
  
  -- Create booking
  INSERT INTO public.bookings (
    tenant_id, lead_id, service_id, start_at, end_at, status, notes
  ) VALUES (
    hold_record.tenant_id,
    actual_lead_id,
    _service_id,
    hold_record.start_at,
    hold_record.end_at,
    'confirmed',
    _notes
  )
  RETURNING id INTO new_booking_id;
  
  -- Convert hold to confirmed booking
  UPDATE public.busy_blocks
  SET block_type = 'confirmed_booking',
      expires_at = NULL,
      booking_id = new_booking_id
  WHERE id = _hold_id;
  
  RETURN new_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;