-- Lead Recovery System Tables
-- Automated follow-up system for leads who don't book on first call

-- 1. lead_recovery_sequences - Templates for recovery workflows
CREATE TABLE IF NOT EXISTS public.lead_recovery_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_system_template BOOLEAN DEFAULT false,
    trigger_on_outcomes TEXT[] DEFAULT ARRAY['followup', 'callback_requested', 'no_answer'],
    target_business_mode TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. lead_recovery_sequence_steps - Individual steps in a recovery sequence
CREATE TABLE IF NOT EXISTS public.lead_recovery_sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID REFERENCES public.lead_recovery_sequences(id) ON DELETE CASCADE NOT NULL,
    step_order INTEGER NOT NULL,
    delay_minutes INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    message_template TEXT,
    ai_call_purpose TEXT,
    ai_call_script_hints TEXT,
    ai_call_max_duration_seconds INTEGER DEFAULT 120,
    task_description TEXT,
    task_priority TEXT DEFAULT 'normal',
    skip_if_responded BOOLEAN DEFAULT true,
    skip_if_booked BOOLEAN DEFAULT true,
    skip_if_declined BOOLEAN DEFAULT true,
    respect_business_hours BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. lead_recovery_campaigns - Active recovery efforts for specific leads
CREATE TABLE IF NOT EXISTS public.lead_recovery_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    lead_id UUID REFERENCES public.leads(id),
    original_call_id UUID REFERENCES public.ai_call_sessions(id),
    sequence_id UUID REFERENCES public.lead_recovery_sequences(id),
    status TEXT DEFAULT 'active',
    current_step INTEGER DEFAULT 0,
    next_action_at TIMESTAMPTZ,
    total_attempts INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    last_response_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    converted_booking_id UUID REFERENCES public.bookings(id),
    converted_dispatch_job_id UUID REFERENCES public.dispatch_jobs(id),
    converted_food_order_id UUID REFERENCES public.food_orders(id),
    recovered_value_cents INTEGER,
    original_intent TEXT,
    original_service_interest TEXT,
    original_objection TEXT,
    original_call_outcome TEXT,
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    stopped_at TIMESTAMPTZ,
    stopped_reason TEXT
);

-- 4. lead_recovery_actions - Log of each action taken in a campaign
CREATE TABLE IF NOT EXISTS public.lead_recovery_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.lead_recovery_campaigns(id) ON DELETE CASCADE NOT NULL,
    step_id UUID REFERENCES public.lead_recovery_sequence_steps(id),
    action_type TEXT NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT now(),
    message_sent TEXT,
    call_session_id UUID REFERENCES public.ai_call_sessions(id),
    delivery_status TEXT DEFAULT 'pending',
    delivery_error TEXT,
    external_message_id TEXT,
    response_received BOOLEAN DEFAULT false,
    response_at TIMESTAMPTZ,
    response_content TEXT,
    response_sentiment TEXT,
    response_outcome TEXT,
    task_completed BOOLEAN DEFAULT false,
    task_completed_at TIMESTAMPTZ,
    task_completed_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. lead_recovery_templates - Quick reply templates for manual follow-ups
CREATE TABLE IF NOT EXISTS public.lead_recovery_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. lead_recovery_settings - Per-tenant settings for lead recovery
CREATE TABLE IF NOT EXISTS public.lead_recovery_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    recovery_enabled BOOLEAN DEFAULT true,
    auto_start_recovery BOOLEAN DEFAULT true,
    require_phone_number BOOLEAN DEFAULT true,
    respect_business_hours BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '21:00',
    quiet_hours_end TIME DEFAULT '08:00',
    quiet_days TEXT[] DEFAULT ARRAY['sunday'],
    max_attempts_per_lead INTEGER DEFAULT 10,
    max_campaigns_per_day INTEGER DEFAULT 50,
    cooldown_days INTEGER DEFAULT 30,
    ai_calls_enabled BOOLEAN DEFAULT false,
    ai_call_hours_start TIME DEFAULT '09:00',
    ai_call_hours_end TIME DEFAULT '18:00',
    default_offer_code TEXT,
    default_offer_description TEXT,
    notify_on_response BOOLEAN DEFAULT true,
    notify_on_conversion BOOLEAN DEFAULT true,
    notification_email TEXT,
    notification_sms TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Modify existing tables
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS recovery_status TEXT DEFAULT 'none';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS recovery_campaign_id UUID REFERENCES public.lead_recovery_campaigns(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_recovery_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS recovery_attempts INTEGER DEFAULT 0;

ALTER TABLE public.ai_call_sessions ADD COLUMN IF NOT EXISTS triggered_recovery BOOLEAN DEFAULT false;
ALTER TABLE public.ai_call_sessions ADD COLUMN IF NOT EXISTS recovery_campaign_id UUID REFERENCES public.lead_recovery_campaigns(id);
ALTER TABLE public.ai_call_sessions ADD COLUMN IF NOT EXISTS is_recovery_call BOOLEAN DEFAULT false;
ALTER TABLE public.ai_call_sessions ADD COLUMN IF NOT EXISTS recovery_context JSONB;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'sms';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_preferences JSONB DEFAULT '{}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_recovery_sequences_tenant ON public.lead_recovery_sequences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_recovery_sequences_default ON public.lead_recovery_sequences(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_sequence_steps_order ON public.lead_recovery_sequence_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status ON public.lead_recovery_campaigns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_next_action ON public.lead_recovery_campaigns(next_action_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_campaigns_customer ON public.lead_recovery_campaigns(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduler ON public.lead_recovery_campaigns(next_action_at, status) WHERE status = 'active' AND next_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_active_customer ON public.lead_recovery_campaigns(customer_id, status) WHERE status IN ('active', 'paused');
CREATE INDEX IF NOT EXISTS idx_campaigns_converted ON public.lead_recovery_campaigns(tenant_id, converted_at) WHERE status = 'converted';
CREATE INDEX IF NOT EXISTS idx_actions_campaign ON public.lead_recovery_actions(campaign_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON public.lead_recovery_templates(tenant_id);

-- Enable RLS
ALTER TABLE public.lead_recovery_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_recovery_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_recovery_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_recovery_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_recovery_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_recovery_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_recovery_sequences
DROP POLICY IF EXISTS "Users can view their tenant sequences" ON public.lead_recovery_sequences;
CREATE POLICY "Users can view their tenant sequences"
  ON public.lead_recovery_sequences FOR SELECT
    USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant sequences" ON public.lead_recovery_sequences;
CREATE POLICY "Users can insert tenant sequences"
  ON public.lead_recovery_sequences FOR INSERT
    WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant sequences" ON public.lead_recovery_sequences;
CREATE POLICY "Users can update tenant sequences"
  ON public.lead_recovery_sequences FOR UPDATE
    USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can delete tenant sequences" ON public.lead_recovery_sequences;
CREATE POLICY "Users can delete tenant sequences"
  ON public.lead_recovery_sequences FOR DELETE
    USING (public.has_tenant_access(auth.uid(), tenant_id));

-- RLS Policies for lead_recovery_sequence_steps
DROP POLICY IF EXISTS "Users can view steps for tenant sequences" ON public.lead_recovery_sequence_steps;
CREATE POLICY "Users can view steps for tenant sequences"
  ON public.lead_recovery_sequence_steps FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.lead_recovery_sequences s 
        WHERE s.id = sequence_id AND public.has_tenant_access(auth.uid(), s.tenant_id)
    ));

DROP POLICY IF EXISTS "Users can insert steps for tenant sequences" ON public.lead_recovery_sequence_steps;
CREATE POLICY "Users can insert steps for tenant sequences"
  ON public.lead_recovery_sequence_steps FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.lead_recovery_sequences s 
        WHERE s.id = sequence_id AND public.has_tenant_access(auth.uid(), s.tenant_id)
    ));

DROP POLICY IF EXISTS "Users can update steps for tenant sequences" ON public.lead_recovery_sequence_steps;
CREATE POLICY "Users can update steps for tenant sequences"
  ON public.lead_recovery_sequence_steps FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.lead_recovery_sequences s 
        WHERE s.id = sequence_id AND public.has_tenant_access(auth.uid(), s.tenant_id)
    ));

DROP POLICY IF EXISTS "Users can delete steps for tenant sequences" ON public.lead_recovery_sequence_steps;
CREATE POLICY "Users can delete steps for tenant sequences"
  ON public.lead_recovery_sequence_steps FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.lead_recovery_sequences s 
        WHERE s.id = sequence_id AND public.has_tenant_access(auth.uid(), s.tenant_id)
    ));

-- RLS Policies for lead_recovery_campaigns
DROP POLICY IF EXISTS "Users can view tenant campaigns" ON public.lead_recovery_campaigns;
CREATE POLICY "Users can view tenant campaigns"
  ON public.lead_recovery_campaigns FOR SELECT
    USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant campaigns" ON public.lead_recovery_campaigns;
CREATE POLICY "Users can insert tenant campaigns"
  ON public.lead_recovery_campaigns FOR INSERT
    WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant campaigns" ON public.lead_recovery_campaigns;
CREATE POLICY "Users can update tenant campaigns"
  ON public.lead_recovery_campaigns FOR UPDATE
    USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can delete tenant campaigns" ON public.lead_recovery_campaigns;
CREATE POLICY "Users can delete tenant campaigns"
  ON public.lead_recovery_campaigns FOR DELETE
    USING (public.has_tenant_access(auth.uid(), tenant_id));

-- RLS Policies for lead_recovery_actions
DROP POLICY IF EXISTS "Users can view actions for tenant campaigns" ON public.lead_recovery_actions;
CREATE POLICY "Users can view actions for tenant campaigns"
  ON public.lead_recovery_actions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.lead_recovery_campaigns c 
        WHERE c.id = campaign_id AND public.has_tenant_access(auth.uid(), c.tenant_id)
    ));

DROP POLICY IF EXISTS "Users can insert actions for tenant campaigns" ON public.lead_recovery_actions;
CREATE POLICY "Users can insert actions for tenant campaigns"
  ON public.lead_recovery_actions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.lead_recovery_campaigns c 
        WHERE c.id = campaign_id AND public.has_tenant_access(auth.uid(), c.tenant_id)
    ));

DROP POLICY IF EXISTS "Users can update actions for tenant campaigns" ON public.lead_recovery_actions;
CREATE POLICY "Users can update actions for tenant campaigns"
  ON public.lead_recovery_actions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.lead_recovery_campaigns c 
        WHERE c.id = campaign_id AND public.has_tenant_access(auth.uid(), c.tenant_id)
    ));

DROP POLICY IF EXISTS "Users can delete actions for tenant campaigns" ON public.lead_recovery_actions;
CREATE POLICY "Users can delete actions for tenant campaigns"
  ON public.lead_recovery_actions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.lead_recovery_campaigns c 
        WHERE c.id = campaign_id AND public.has_tenant_access(auth.uid(), c.tenant_id)
    ));

-- RLS Policies for lead_recovery_templates
DROP POLICY IF EXISTS "Users can view tenant templates" ON public.lead_recovery_templates;
CREATE POLICY "Users can view tenant templates"
  ON public.lead_recovery_templates FOR SELECT
    USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant templates" ON public.lead_recovery_templates;
CREATE POLICY "Users can insert tenant templates"
  ON public.lead_recovery_templates FOR INSERT
    WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant templates" ON public.lead_recovery_templates;
CREATE POLICY "Users can update tenant templates"
  ON public.lead_recovery_templates FOR UPDATE
    USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can delete tenant templates" ON public.lead_recovery_templates;
CREATE POLICY "Users can delete tenant templates"
  ON public.lead_recovery_templates FOR DELETE
    USING (public.has_tenant_access(auth.uid(), tenant_id));

-- RLS Policies for lead_recovery_settings
DROP POLICY IF EXISTS "Users can view tenant recovery settings" ON public.lead_recovery_settings;
CREATE POLICY "Users can view tenant recovery settings"
  ON public.lead_recovery_settings FOR SELECT
    USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert tenant recovery settings" ON public.lead_recovery_settings;
CREATE POLICY "Users can insert tenant recovery settings"
  ON public.lead_recovery_settings FOR INSERT
    WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update tenant recovery settings" ON public.lead_recovery_settings;
CREATE POLICY "Users can update tenant recovery settings"
  ON public.lead_recovery_settings FOR UPDATE
    USING (public.has_tenant_access(auth.uid(), tenant_id));

-- Trigger to auto-create recovery settings for new tenants
CREATE OR REPLACE FUNCTION public.create_lead_recovery_settings_for_tenant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.lead_recovery_settings (tenant_id)
    VALUES (NEW.id)
    ON CONFLICT (tenant_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_lead_recovery_settings'
    ) THEN
        DROP TRIGGER IF EXISTS trigger_create_lead_recovery_settings ON public.tenants;
CREATE TRIGGER trigger_create_lead_recovery_settings
  AFTER INSERT ON public.tenants
            FOR EACH ROW
            EXECUTE FUNCTION public.create_lead_recovery_settings_for_tenant();
    END IF;
END $$;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_lead_recovery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_lead_recovery_sequences_updated_at ON public.lead_recovery_sequences;
CREATE TRIGGER update_lead_recovery_sequences_updated_at
  BEFORE UPDATE ON public.lead_recovery_sequences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lead_recovery_updated_at();

DROP TRIGGER IF EXISTS update_lead_recovery_campaigns_updated_at ON public.lead_recovery_campaigns;
CREATE TRIGGER update_lead_recovery_campaigns_updated_at
  BEFORE UPDATE ON public.lead_recovery_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lead_recovery_updated_at();

DROP TRIGGER IF EXISTS update_lead_recovery_templates_updated_at ON public.lead_recovery_templates;
CREATE TRIGGER update_lead_recovery_templates_updated_at
  BEFORE UPDATE ON public.lead_recovery_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lead_recovery_updated_at();

DROP TRIGGER IF EXISTS update_lead_recovery_settings_updated_at ON public.lead_recovery_settings;
CREATE TRIGGER update_lead_recovery_settings_updated_at
  BEFORE UPDATE ON public.lead_recovery_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lead_recovery_updated_at();