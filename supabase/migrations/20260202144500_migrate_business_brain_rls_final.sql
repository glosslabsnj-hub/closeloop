-- Migration: Hard enforce tenant isolation on Business Brain tables (Lovable Cloud)
-- Date: 2026-02-02

-- Membership predicate (uses tenant_users if present)
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF to_regclass('public.tenant_users') IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.tenant_users
      WHERE tenant_id = p_tenant_id AND user_id = v_uid
    );
  END IF;

  -- Fallback deny if no membership table exists
  RETURN false;
END;
$fn$;

REVOKE ALL ON FUNCTION public.is_tenant_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;

-- TENANTS (tenant key is tenants.id)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.tenants;
CREATE POLICY tenant_isolation_all
ON public.tenants
FOR ALL
TO authenticated
USING (public.is_tenant_member(id))
WITH CHECK (public.is_tenant_member(id));

-- SERVICES
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services(tenant_id);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.services;
CREATE POLICY tenant_isolation_all
ON public.services
FOR ALL
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

-- BUSINESS_FAQS
ALTER TABLE public.business_faqs ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_business_faqs_tenant_id ON public.business_faqs(tenant_id);
ALTER TABLE public.business_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_faqs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.business_faqs;
CREATE POLICY tenant_isolation_all
ON public.business_faqs
FOR ALL
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

-- OBJECTION_RESPONSES
ALTER TABLE public.objection_responses ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_objection_responses_tenant_id ON public.objection_responses(tenant_id);
ALTER TABLE public.objection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objection_responses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.objection_responses;
CREATE POLICY tenant_isolation_all
ON public.objection_responses
FOR ALL
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

-- AI_KNOWLEDGE_BASE
ALTER TABLE public.ai_knowledge_base ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_base_tenant_id ON public.ai_knowledge_base(tenant_id);
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.ai_knowledge_base;
CREATE POLICY tenant_isolation_all
ON public.ai_knowledge_base
FOR ALL
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

-- ASSISTANT_SETTINGS
ALTER TABLE public.assistant_settings ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_assistant_settings_tenant_id ON public.assistant_settings(tenant_id);
ALTER TABLE public.assistant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.assistant_settings;
CREATE POLICY tenant_isolation_all
ON public.assistant_settings
FOR ALL
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

-- FOOD_ORDER_SETTINGS
ALTER TABLE public.food_order_settings ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_food_order_settings_tenant_id ON public.food_order_settings(tenant_id);
ALTER TABLE public.food_order_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_order_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.food_order_settings;
CREATE POLICY tenant_isolation_all
ON public.food_order_settings
FOR ALL
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

-- TENANT_INTELLIGENCE_SETTINGS
ALTER TABLE public.tenant_intelligence_settings ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_tenant_intelligence_settings_tenant_id ON public.tenant_intelligence_settings(tenant_id);
ALTER TABLE public.tenant_intelligence_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_intelligence_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.tenant_intelligence_settings;
CREATE POLICY tenant_isolation_all
ON public.tenant_intelligence_settings
FOR ALL
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

-- MENU_ITEMS
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant_id ON public.menu_items(tenant_id);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.menu_items;
CREATE POLICY tenant_isolation_all
ON public.menu_items
FOR ALL
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));

-- AVAILABILITY_SLOTS
ALTER TABLE public.availability_slots ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE INDEX IF NOT EXISTS idx_availability_slots_tenant_id ON public.availability_slots(tenant_id);
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_all ON public.availability_slots;
CREATE POLICY tenant_isolation_all
ON public.availability_slots
FOR ALL
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (public.is_tenant_member(tenant_id));
