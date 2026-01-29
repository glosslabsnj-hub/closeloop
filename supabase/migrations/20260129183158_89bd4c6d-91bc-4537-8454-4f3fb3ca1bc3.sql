-- Add extracted_payload column to ai_call_sessions for structured mode-specific data
ALTER TABLE public.ai_call_sessions 
ADD COLUMN IF NOT EXISTS extracted_payload jsonb;

-- Add comment describing the column
COMMENT ON COLUMN public.ai_call_sessions.extracted_payload IS 'Mode-specific extracted data: food(items, modifiers, totals, address), service(service, schedule, intake), dispatch(pickup, dropoff, urgency)';

-- Create ai_event_logs table for call lifecycle tracking
CREATE TABLE IF NOT EXISTS public.ai_event_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  session_id uuid REFERENCES public.ai_call_sessions(id),
  call_sid text,
  conversation_id text,
  stage text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_event_logs_tenant_session ON public.ai_event_logs(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ai_event_logs_call_sid ON public.ai_event_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_ai_event_logs_created_at ON public.ai_event_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_event_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant access
CREATE POLICY "Tenant users can view their event logs"
ON public.ai_event_logs
FOR SELECT
USING (public.has_tenant_access(auth.uid(), tenant_id));

-- Allow service role full access
CREATE POLICY "Service role can manage event logs"
ON public.ai_event_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Add outcome types to the enum if missing (order/dispatch for mode-specific outcomes)
-- First check if they exist, if not, alter the type
DO $$ 
BEGIN
  -- Try to add 'order' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ai_call_outcome') AND enumlabel = 'order') THEN
    ALTER TYPE public.ai_call_outcome ADD VALUE 'order';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  -- Try to add 'dispatch' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ai_call_outcome') AND enumlabel = 'dispatch') THEN
    ALTER TYPE public.ai_call_outcome ADD VALUE 'dispatch';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  -- Try to add 'message' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ai_call_outcome') AND enumlabel = 'message') THEN
    ALTER TYPE public.ai_call_outcome ADD VALUE 'message';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  -- Try to add 'lead_captured' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ai_call_outcome') AND enumlabel = 'lead_captured') THEN
    ALTER TYPE public.ai_call_outcome ADD VALUE 'lead_captured';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;