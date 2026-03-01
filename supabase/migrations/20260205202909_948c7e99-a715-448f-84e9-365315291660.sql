-- =====================================================
-- Impound Vehicle Tracking System
-- =====================================================

-- 1. Impound Lots - Tracks impound lot locations
CREATE TABLE IF NOT EXISTS public.impound_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Lot info
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    
    -- Operating hours (JSON object with day keys)
    hours_json JSONB DEFAULT '{
        "monday": {"open": "08:00", "close": "18:00"},
        "tuesday": {"open": "08:00", "close": "18:00"},
        "wednesday": {"open": "08:00", "close": "18:00"},
        "thursday": {"open": "08:00", "close": "18:00"},
        "friday": {"open": "08:00", "close": "18:00"},
        "saturday": {"open": "09:00", "close": "14:00"},
        "sunday": {"open": null, "close": null}
    }',
    
    -- Settings
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_impound_lots_tenant ON public.impound_lots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_impound_lots_default ON public.impound_lots(tenant_id, is_default) WHERE is_default = true;

-- 2. Impound Vehicles - Tracks vehicles currently in impound
CREATE TABLE IF NOT EXISTS public.impound_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lot_id UUID REFERENCES public.impound_lots(id),
    
    -- Vehicle identification (for lookup)
    license_plate TEXT,
    license_plate_state TEXT,
    vin TEXT,
    
    -- Vehicle description
    vehicle_year TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    
    -- Tow details
    towed_from_address TEXT,
    towed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tow_reason TEXT DEFAULT 'private_property',
    
    -- Reference to dispatch job (if it was a tow we did)
    dispatch_job_id UUID REFERENCES public.dispatch_jobs(id),
    
    -- Current status
    status TEXT DEFAULT 'in_lot',
    
    -- Fees (in cents)
    base_tow_fee_cents INTEGER DEFAULT 0,
    storage_fee_daily_cents INTEGER DEFAULT 0,
    days_stored INTEGER DEFAULT 0,
    total_storage_cents INTEGER DEFAULT 0,
    admin_fee_cents INTEGER DEFAULT 0,
    gate_fee_cents INTEGER DEFAULT 0,
    additional_fees_cents INTEGER DEFAULT 0,
    total_fees_cents INTEGER DEFAULT 0,
    
    -- Release requirements
    release_requirements TEXT[] DEFAULT ARRAY['valid_id', 'registration'],
    
    -- Release info (filled when released)
    released_at TIMESTAMPTZ,
    released_to_name TEXT,
    released_to_phone TEXT,
    release_notes TEXT,
    payment_method TEXT,
    
    -- Additional info
    notes TEXT,
    photos JSONB DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for vehicle lookups
CREATE INDEX IF NOT EXISTS idx_impound_vehicles_tenant ON public.impound_vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_impound_vehicles_plate ON public.impound_vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_impound_vehicles_status ON public.impound_vehicles(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_impound_vehicles_lot ON public.impound_vehicles(lot_id);
CREATE INDEX IF NOT EXISTS idx_impound_vehicles_dispatch ON public.impound_vehicles(dispatch_job_id) WHERE dispatch_job_id IS NOT NULL;

-- 3. Impound Settings - Per-tenant configuration
CREATE TABLE IF NOT EXISTS public.impound_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Default fees (in cents)
    base_tow_fee_cents INTEGER DEFAULT 15000,
    daily_storage_cents INTEGER DEFAULT 3500,
    gate_fee_cents INTEGER DEFAULT 5000,
    admin_fee_cents INTEGER DEFAULT 2500,
    
    -- Payment options
    accepted_payment TEXT[] DEFAULT ARRAY['cash', 'credit_card', 'debit_card'],
    
    -- Default release requirements
    default_release_requirements TEXT[] DEFAULT ARRAY['valid_id', 'registration', 'payment'],
    
    -- Lot hours for releases
    release_hours_json JSONB DEFAULT '{
        "monday": {"open": "08:00", "close": "17:00"},
        "tuesday": {"open": "08:00", "close": "17:00"},
        "wednesday": {"open": "08:00", "close": "17:00"},
        "thursday": {"open": "08:00", "close": "17:00"},
        "friday": {"open": "08:00", "close": "17:00"},
        "saturday": {"open": "09:00", "close": "12:00"},
        "sunday": {"open": null, "close": null}
    }',
    
    -- Notification settings
    notify_on_new_impound BOOLEAN DEFAULT true,
    notify_on_release BOOLEAN DEFAULT true,
    
    -- Feature toggle
    impound_handling_enabled BOOLEAN DEFAULT false,
    
    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE public.impound_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impound_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impound_settings ENABLE ROW LEVEL SECURITY;

-- Impound Lots Policies
DROP POLICY IF EXISTS "Users can view impound lots for their tenants" ON public.impound_lots;
CREATE POLICY "Users can view impound lots for their tenants"
  ON public.impound_lots FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create impound lots for their tenants" ON public.impound_lots;
CREATE POLICY "Users can create impound lots for their tenants"
  ON public.impound_lots FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update impound lots for their tenants" ON public.impound_lots;
CREATE POLICY "Users can update impound lots for their tenants"
  ON public.impound_lots FOR UPDATE
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete impound lots for their tenants" ON public.impound_lots;
CREATE POLICY "Users can delete impound lots for their tenants"
  ON public.impound_lots FOR DELETE
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

-- Impound Vehicles Policies
DROP POLICY IF EXISTS "Users can view impound vehicles for their tenants" ON public.impound_vehicles;
CREATE POLICY "Users can view impound vehicles for their tenants"
  ON public.impound_vehicles FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create impound vehicles for their tenants" ON public.impound_vehicles;
CREATE POLICY "Users can create impound vehicles for their tenants"
  ON public.impound_vehicles FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update impound vehicles for their tenants" ON public.impound_vehicles;
CREATE POLICY "Users can update impound vehicles for their tenants"
  ON public.impound_vehicles FOR UPDATE
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete impound vehicles for their tenants" ON public.impound_vehicles;
CREATE POLICY "Users can delete impound vehicles for their tenants"
  ON public.impound_vehicles FOR DELETE
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

-- Impound Settings Policies
DROP POLICY IF EXISTS "Users can view impound settings for their tenants" ON public.impound_settings;
CREATE POLICY "Users can view impound settings for their tenants"
  ON public.impound_settings FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert impound settings for their tenants" ON public.impound_settings;
CREATE POLICY "Users can insert impound settings for their tenants"
  ON public.impound_settings FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update impound settings for their tenants" ON public.impound_settings;
CREATE POLICY "Users can update impound settings for their tenants"
  ON public.impound_settings FOR UPDATE
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
);

-- =====================================================
-- Auto-create impound_settings for dispatch tenants
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_create_impound_settings_for_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If tenant is dispatch mode, create impound_settings with defaults
    IF NEW.business_mode = 'dispatch' THEN
        INSERT INTO public.impound_settings (tenant_id)
        VALUES (NEW.id)
        ON CONFLICT (tenant_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger on tenant insert
DROP TRIGGER IF EXISTS trg_create_impound_settings_on_dispatch_tenant ON public.tenants;
CREATE TRIGGER trg_create_impound_settings_on_dispatch_tenant
  AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.fn_create_impound_settings_for_dispatch();

-- Trigger on tenant update (in case business_mode changes to dispatch)
DROP TRIGGER IF EXISTS trg_create_impound_settings_on_dispatch_update ON public.tenants;
CREATE TRIGGER trg_create_impound_settings_on_dispatch_update
  AFTER UPDATE OF business_mode ON public.tenants
FOR EACH ROW
WHEN (NEW.business_mode = 'dispatch' AND (OLD.business_mode IS DISTINCT FROM 'dispatch'))
EXECUTE FUNCTION public.fn_create_impound_settings_for_dispatch();

-- =====================================================
-- Updated_at triggers
-- =====================================================

DROP TRIGGER IF EXISTS set_impound_lots_updated_at ON public.impound_lots;
CREATE TRIGGER set_impound_lots_updated_at
  BEFORE UPDATE ON public.impound_lots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_impound_vehicles_updated_at ON public.impound_vehicles;
CREATE TRIGGER set_impound_vehicles_updated_at
  BEFORE UPDATE ON public.impound_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_impound_settings_updated_at ON public.impound_settings;
CREATE TRIGGER set_impound_settings_updated_at
  BEFORE UPDATE ON public.impound_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Create impound_settings for existing dispatch tenants
-- =====================================================

INSERT INTO public.impound_settings (tenant_id)
SELECT id FROM public.tenants WHERE business_mode = 'dispatch'
ON CONFLICT (tenant_id) DO NOTHING;