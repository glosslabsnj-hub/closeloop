-- Update fn_sync_busy_blocks to store full event details (location, description)
CREATE OR REPLACE FUNCTION public.fn_sync_busy_blocks(
  _tenant_id UUID,
  _connection_id UUID,
  _events JSONB -- Array of {start_at, end_at, external_event_id, summary?, location?, description?}
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
  
  -- Insert new blocks with full metadata
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
      jsonb_build_object(
        'summary', COALESCE(v_event->>'summary', 'Busy'),
        'location', v_event->>'location',
        'description', v_event->>'description'
      )
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