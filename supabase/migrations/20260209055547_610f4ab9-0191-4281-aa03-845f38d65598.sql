-- ============================================
-- INTELLIGENCE LAYER - Database Schema
-- ============================================

-- 1. Call outcomes for conversion tracking
CREATE TABLE public.call_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('booked', 'callback_scheduled', 'order_placed', 'dispatch_created', 'transferred', 'hangup', 'voicemail', 'faq_answered', 'other')),
  intent TEXT,
  service_requested TEXT,
  conversion_value_cents INTEGER,
  duration_seconds INTEGER,
  ai_handled_fully BOOLEAN DEFAULT true,
  escalation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.call_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view call outcomes"
ON public.call_outcomes FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE INDEX idx_call_outcomes_tenant_created ON public.call_outcomes(tenant_id, created_at DESC);
CREATE INDEX idx_call_outcomes_outcome_type ON public.call_outcomes(tenant_id, outcome_type);

-- 2. Business patterns detected across calls
CREATE TABLE public.business_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('time_pattern', 'service_trend', 'objection_pattern', 'conversion_pattern', 'capacity_pattern', 'upsell_opportunity')),
  pattern_key TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  observation_count INTEGER DEFAULT 1,
  first_observed_at TIMESTAMPTZ DEFAULT now(),
  last_observed_at TIMESTAMPTZ DEFAULT now(),
  data_json JSONB DEFAULT '{}',
  is_actionable BOOLEAN DEFAULT false,
  suggested_action TEXT,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view business patterns"
ON public.business_patterns FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update business patterns"
ON public.business_patterns FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE INDEX idx_business_patterns_tenant ON public.business_patterns(tenant_id, is_dismissed, confidence_score DESC);
CREATE UNIQUE INDEX idx_business_patterns_key ON public.business_patterns(tenant_id, pattern_type, pattern_key);

-- 3. Actionable insights for owner review
CREATE TABLE public.intelligence_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('knowledge_gap', 'upsell_opportunity', 'capacity_warning', 'conversion_drop', 'time_opportunity', 'service_recommendation', 'policy_needed')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_action TEXT,
  action_link TEXT,
  impact_estimate TEXT,
  source_pattern_id UUID REFERENCES public.business_patterns(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  is_actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.intelligence_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view intelligence insights"
ON public.intelligence_insights FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update intelligence insights"
ON public.intelligence_insights FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE INDEX idx_intelligence_insights_tenant ON public.intelligence_insights(tenant_id, is_actioned, severity DESC);
CREATE INDEX idx_intelligence_insights_unread ON public.intelligence_insights(tenant_id, is_read) WHERE is_read = false;

-- 4. Weekly digest snapshots
CREATE TABLE public.intelligence_digest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  digest_type TEXT DEFAULT 'weekly' CHECK (digest_type IN ('daily', 'weekly', 'monthly')),
  metrics_json JSONB NOT NULL DEFAULT '{}',
  highlights_json JSONB NOT NULL DEFAULT '[]',
  recommendations_json JSONB NOT NULL DEFAULT '[]',
  patterns_discovered INTEGER DEFAULT 0,
  gaps_identified INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.intelligence_digest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view intelligence digest"
ON public.intelligence_digest FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE UNIQUE INDEX idx_intelligence_digest_period ON public.intelligence_digest(tenant_id, period_start, period_end, digest_type);

-- 5. AI response quality tracking
CREATE TABLE public.ai_response_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL,
  question_asked TEXT NOT NULL,
  response_given TEXT,
  response_source TEXT CHECK (response_source IN ('faq', 'policy', 'service', 'menu', 'fallback', 'escalation')),
  customer_satisfied BOOLEAN,
  required_human_assist BOOLEAN DEFAULT false,
  knowledge_gap_id UUID REFERENCES public.knowledge_gaps(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_response_quality ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ai response quality"
ON public.ai_response_quality FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE INDEX idx_ai_response_quality_tenant ON public.ai_response_quality(tenant_id, created_at DESC);
CREATE INDEX idx_ai_response_quality_source ON public.ai_response_quality(tenant_id, response_source);

-- Enable realtime for insights (so owners see new insights immediately)
ALTER PUBLICATION supabase_realtime ADD TABLE public.intelligence_insights;