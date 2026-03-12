-- Fix missing RLS policies on automations table
-- RLS was enabled in base_schema.sql but NO policies were created,
-- causing error 42501 for all authenticated user operations.
-- This blocks onboarding Step 9 from inserting default automations.

-- Allow tenant members to view their automations
CREATE POLICY "Tenant members can view automations"
  ON public.automations FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Allow tenant members to insert automations for their tenant
CREATE POLICY "Tenant members can insert automations"
  ON public.automations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Allow tenant members to update their automations
CREATE POLICY "Tenant members can update automations"
  ON public.automations FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Allow tenant members to delete their automations
CREATE POLICY "Tenant members can delete automations"
  ON public.automations FOR DELETE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
