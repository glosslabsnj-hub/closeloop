
-- Create sales_inventory table for dealer vehicle listings
CREATE TABLE IF NOT EXISTS public.sales_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stock_number text,
  vin text,
  year text,
  make text,
  model text,
  trim text,
  body_style text,
  color_exterior text,
  color_interior text,
  msrp_cents bigint,
  asking_price_cents bigint,
  internet_price_cents bigint,
  condition text DEFAULT 'used',
  mileage integer,
  status text DEFAULT 'available',
  features text[],
  description text,
  photo_urls text[],
  lot_location text,
  days_on_lot integer,
  external_id text,
  external_source text,
  listing_url text,
  financing_available boolean DEFAULT true,
  trade_in_eligible boolean DEFAULT true,
  special_notes text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique indexes for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_inventory_stock ON public.sales_inventory(tenant_id, stock_number) WHERE stock_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_inventory_vin ON public.sales_inventory(tenant_id, vin) WHERE vin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_inventory_tenant_status ON public.sales_inventory(tenant_id, status);

-- RLS
ALTER TABLE public.sales_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access" ON public.sales_inventory
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));
CREATE POLICY "service_role_full" ON public.sales_inventory
  FOR ALL USING (auth.role() = 'service_role');

-- Timestamp trigger using existing function
CREATE TRIGGER set_updated_at_sales_inventory
  BEFORE UPDATE ON public.sales_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
