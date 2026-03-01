-- Add modifiers column to menu_items for food ordering with modifications
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS modifiers text[] DEFAULT '{}';

-- Add menu-related fields to tenants for food mode configuration
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS food_settings jsonb DEFAULT '{}';

-- Create order_settings table for food mode tenant settings
CREATE TABLE IF NOT EXISTS public.food_order_settings (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  accepts_pickup boolean DEFAULT true,
  accepts_delivery boolean DEFAULT true,
  accepts_dine_in boolean DEFAULT false,
  delivery_radius_miles integer DEFAULT 5,
  delivery_minimum_cents integer DEFAULT 1500,
  estimated_prep_minutes integer DEFAULT 15,
  accepts_catering boolean DEFAULT false,
  catering_min_guests integer DEFAULT 10,
  catering_lead_days integer DEFAULT 3,
  menu_notes text,
  order_confirmation_mode text DEFAULT 'auto_confirm' CHECK (order_confirmation_mode IN ('auto_confirm', 'review_required')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_order_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Tenants can view their food_order_settings" ON public.food_order_settings;
CREATE POLICY "Tenants can view their food_order_settings"
  ON public.food_order_settings
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can update their food_order_settings" ON public.food_order_settings;
CREATE POLICY "Tenants can update their food_order_settings"
  ON public.food_order_settings
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can insert their food_order_settings" ON public.food_order_settings;
CREATE POLICY "Tenants can insert their food_order_settings"
  ON public.food_order_settings
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Service role can manage food_order_settings" ON public.food_order_settings;
CREATE POLICY "Service role can manage food_order_settings"
  ON public.food_order_settings
  FOR ALL
  USING (auth.role() = 'service_role');

-- Initialize default food_order_settings for existing food mode tenants
INSERT INTO public.food_order_settings (tenant_id)
SELECT id FROM tenants WHERE business_mode = 'food'
ON CONFLICT (tenant_id) DO NOTHING;