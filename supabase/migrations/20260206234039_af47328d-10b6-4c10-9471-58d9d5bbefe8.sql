-- Add new settings to assistant_settings for service agent flow control
ALTER TABLE public.assistant_settings
ADD COLUMN IF NOT EXISTS same_day_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS emergency_surcharge text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancellation_notice_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS confirmation_method text DEFAULT 'sms',
ADD COLUMN IF NOT EXISTS waitlist_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_amount text DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant_settings.same_day_enabled IS 'Whether this business offers same-day appointments';
COMMENT ON COLUMN public.assistant_settings.emergency_surcharge IS 'Additional fee for emergency/same-day service, e.g. "$50" or empty';
COMMENT ON COLUMN public.assistant_settings.cancellation_notice_hours IS 'Hours required for cancellation notice, e.g. 24';
COMMENT ON COLUMN public.assistant_settings.confirmation_method IS 'How to send confirmations: sms, email, or both';
COMMENT ON COLUMN public.assistant_settings.waitlist_enabled IS 'Whether to offer waitlist when fully booked';
COMMENT ON COLUMN public.assistant_settings.recurring_enabled IS 'Whether to offer recurring/repeat appointments';
COMMENT ON COLUMN public.assistant_settings.deposit_required IS 'Whether a deposit is required to hold appointments';
COMMENT ON COLUMN public.assistant_settings.deposit_amount IS 'Deposit amount, e.g. "$25" or "50%"';

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  preferred_date date,
  preferred_time_start time,
  preferred_time_end time,
  service_name text,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  notes text,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'booked', 'expired', 'cancelled')),
  session_id uuid REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  contacted_at timestamptz,
  expires_at timestamptz
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for waitlist
DROP POLICY IF EXISTS "Users can view their tenant waitlist" ON public.waitlist;
CREATE POLICY "Users can view their tenant waitlist"
  ON public.waitlist
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert to their tenant waitlist" ON public.waitlist;
CREATE POLICY "Users can insert to their tenant waitlist"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their tenant waitlist" ON public.waitlist;
CREATE POLICY "Users can update their tenant waitlist"
  ON public.waitlist
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete from their tenant waitlist" ON public.waitlist;
CREATE POLICY "Users can delete from their tenant waitlist"
  ON public.waitlist
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
    )
  );

-- Service role bypass for edge functions
DROP POLICY IF EXISTS "Service role has full access to waitlist" ON public.waitlist;
CREATE POLICY "Service role has full access to waitlist"
  ON public.waitlist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_id ON public.waitlist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_waitlist_preferred_date ON public.waitlist(preferred_date) WHERE status = 'waiting';

-- Create updated_at trigger
CREATE OR REPLACE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();