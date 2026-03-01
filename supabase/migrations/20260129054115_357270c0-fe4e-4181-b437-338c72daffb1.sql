-- Phase 1: Advanced Intelligence Layers Schema

-- 1.1 Memory type enum
CREATE TYPE memory_type AS ENUM (
  'customer_preference',
  'time_pattern',
  'service_pattern',
  'capacity_pattern',
  'exception_pattern'
);

-- 1.2 Intent rule type enum
CREATE TYPE intent_rule_type AS ENUM (
  'time_preference',
  'upsell_rule',
  'discount_guardrail',
  'urgency_handling',
  'capacity_protection'
);

-- 1.3 Business Memory table - Stores learned patterns per location
CREATE TABLE IF NOT EXISTS public.business_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.tenant_locations(id) ON DELETE CASCADE,
  memory_type memory_type NOT NULL,
  subject_key TEXT, -- e.g. customer_id, service_id, weekday, hour_range
  summary TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  first_observed_at TIMESTAMPTZ DEFAULT now(),
  last_observed_at TIMESTAMPTZ DEFAULT now(),
  observation_count INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for business_memory
CREATE INDEX IF NOT EXISTS idx_business_memory_tenant ON public.business_memory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_business_memory_location ON public.business_memory(location_id);
CREATE INDEX IF NOT EXISTS idx_business_memory_active ON public.business_memory(tenant_id, is_active, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_business_memory_type ON public.business_memory(tenant_id, memory_type);

-- RLS for business_memory
ALTER TABLE public.business_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant users can view their memory" ON public.business_memory;
CREATE POLICY "Tenant users can view their memory"
  ON public.business_memory FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant users can manage their memory" ON public.business_memory;
CREATE POLICY "Tenant users can manage their memory"
  ON public.business_memory FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- 1.4 Business Intent Rules table - Configurable negotiation rules
CREATE TABLE IF NOT EXISTS public.business_intent_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_type intent_rule_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  condition_json JSONB NOT NULL DEFAULT '{}',
  action_json JSONB NOT NULL DEFAULT '{}',
  priority INT DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  is_suggested BOOLEAN DEFAULT false,
  suggested_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for business_intent_rules
CREATE INDEX IF NOT EXISTS idx_intent_rules_tenant ON public.business_intent_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intent_rules_enabled ON public.business_intent_rules(tenant_id, is_enabled, priority DESC);
CREATE INDEX IF NOT EXISTS idx_intent_rules_suggested ON public.business_intent_rules(tenant_id, is_suggested);

-- RLS for business_intent_rules
ALTER TABLE public.business_intent_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant users can view their rules" ON public.business_intent_rules;
CREATE POLICY "Tenant users can view their rules"
  ON public.business_intent_rules FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant users can manage their rules" ON public.business_intent_rules;
CREATE POLICY "Tenant users can manage their rules"
  ON public.business_intent_rules FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- 1.5 Tenant Intelligence Settings table - Global settings for memory & rules
CREATE TABLE IF NOT EXISTS public.tenant_intelligence_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  memory_enabled BOOLEAN DEFAULT false, -- OFF by default
  share_memory_across_locations BOOLEAN DEFAULT false,
  copilot_can_suggest_rules BOOLEAN DEFAULT true,
  min_observation_threshold INT DEFAULT 3,
  min_confidence_threshold FLOAT DEFAULT 0.65,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for tenant_intelligence_settings
ALTER TABLE public.tenant_intelligence_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant users can view intelligence settings" ON public.tenant_intelligence_settings;
CREATE POLICY "Tenant users can view intelligence settings"
  ON public.tenant_intelligence_settings FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant users can manage intelligence settings" ON public.tenant_intelligence_settings;
CREATE POLICY "Tenant users can manage intelligence settings"
  ON public.tenant_intelligence_settings FOR ALL
USING (has_tenant_access(auth.uid(), tenant_id));

-- 1.6 Trigger for updated_at on business_intent_rules
DROP TRIGGER IF EXISTS update_business_intent_rules_updated_at ON public.business_intent_rules;
CREATE TRIGGER update_business_intent_rules_updated_at
  BEFORE UPDATE ON public.business_intent_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.7 Trigger for updated_at on tenant_intelligence_settings
DROP TRIGGER IF EXISTS update_tenant_intelligence_settings_updated_at ON public.tenant_intelligence_settings;
CREATE TRIGGER update_tenant_intelligence_settings_updated_at
  BEFORE UPDATE ON public.tenant_intelligence_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.8 Function to initialize intelligence settings for new tenants
CREATE OR REPLACE FUNCTION public.initialize_intelligence_settings(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO tenant_intelligence_settings (tenant_id)
  VALUES (_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;
END;
$$;