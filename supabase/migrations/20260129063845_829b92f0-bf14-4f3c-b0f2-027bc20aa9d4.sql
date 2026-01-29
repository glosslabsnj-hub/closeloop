-- Create twilio_event_logs table for debugging telephony issues
CREATE TABLE public.twilio_event_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  twilio_call_sid TEXT NOT NULL,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  stage TEXT NOT NULL,
  http_status INTEGER,
  error_message TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.twilio_event_logs ENABLE ROW LEVEL SECURITY;

-- Tenant users and super admins can view their tenant's logs
CREATE POLICY "Tenant users can view logs"
  ON public.twilio_event_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = twilio_event_logs.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

-- Index for efficient queries
CREATE INDEX idx_twilio_event_logs_tenant_created ON public.twilio_event_logs(tenant_id, created_at DESC);
CREATE INDEX idx_twilio_event_logs_call_sid ON public.twilio_event_logs(twilio_call_sid);

-- Enable realtime for dev debugging
ALTER PUBLICATION supabase_realtime ADD TABLE public.twilio_event_logs;