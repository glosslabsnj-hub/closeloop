-- ============================================
-- HIPAA Compliance Hardening
-- Creates universal data_retention_settings table
-- Adds constraints and defaults for all modes
-- ============================================

-- Create data_retention_settings table (replaces split medical_settings + retention_policies)
CREATE TABLE IF NOT EXISTS public.data_retention_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Recording/transcript controls
  store_recordings BOOLEAN NOT NULL DEFAULT false,
  store_transcripts BOOLEAN NOT NULL DEFAULT false,
  store_caller_phone BOOLEAN NOT NULL DEFAULT true,
  
  -- Retention periods (days, 0 = immediate deletion, null = indefinite)
  recording_retention_days INTEGER DEFAULT 90,
  transcript_retention_days INTEGER DEFAULT 90,
  call_summary_retention_days INTEGER DEFAULT 365,
  audit_log_retention_days INTEGER DEFAULT 730,
  
  -- HIPAA-specific flags
  require_verbal_consent BOOLEAN NOT NULL DEFAULT false,
  phi_minimization_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Customer memory controls
  allow_customer_memory BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_retention_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Tenant members can view retention settings" ON public.data_retention_settings;
CREATE POLICY "Tenant members can view retention settings"
  ON public.data_retention_settings FOR SELECT
  TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can update retention settings" ON public.data_retention_settings;
CREATE POLICY "Tenant members can update retention settings"
  ON public.data_retention_settings FOR UPDATE
  TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can insert retention settings" ON public.data_retention_settings;
CREATE POLICY "Tenant members can insert retention settings"
  ON public.data_retention_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

DROP TRIGGER IF EXISTS update_data_retention_settings_updated_at ON public.data_retention_settings;
CREATE TRIGGER update_data_retention_settings_updated_at
  BEFORE UPDATE ON public.data_retention_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize retention settings based on business mode
CREATE OR REPLACE FUNCTION public.initialize_retention_settings(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode TEXT;
  v_hipaa BOOLEAN;
BEGIN
  SELECT business_mode, COALESCE(hipaa_mode, false) INTO v_mode, v_hipaa
  FROM tenants WHERE id = _tenant_id;
  
  IF v_mode = 'medical' OR v_hipaa THEN
    -- HIPAA-compliant defaults
    INSERT INTO data_retention_settings (
      tenant_id, 
      store_recordings, 
      store_transcripts, 
      store_caller_phone,
      require_verbal_consent,
      phi_minimization_enabled,
      allow_customer_memory,
      recording_retention_days,
      transcript_retention_days
    ) VALUES (
      _tenant_id, 
      false,  -- no recordings
      false,  -- no transcripts
      false,  -- redact caller phone
      true,   -- require verbal consent
      true,   -- minimize PHI
      false,  -- no customer memory
      0,      -- immediate deletion if enabled
      0       -- immediate deletion if enabled
    ) ON CONFLICT (tenant_id) DO NOTHING;
  ELSE
    -- Standard defaults
    INSERT INTO data_retention_settings (
      tenant_id,
      store_recordings,
      store_transcripts,
      store_caller_phone,
      require_verbal_consent,
      phi_minimization_enabled,
      allow_customer_memory
    ) VALUES (
      _tenant_id,
      true,   -- store recordings
      true,   -- store transcripts
      true,   -- store caller phone
      false,  -- no verbal consent needed
      false,  -- no PHI minimization
      true    -- allow customer memory
    ) ON CONFLICT (tenant_id) DO NOTHING;
  END IF;
END;
$$;

-- Migrate existing medical_settings to new table
INSERT INTO data_retention_settings (
  tenant_id,
  store_recordings,
  store_transcripts,
  store_caller_phone,
  require_verbal_consent,
  phi_minimization_enabled,
  allow_customer_memory,
  recording_retention_days,
  transcript_retention_days
)
SELECT 
  tenant_id,
  store_recordings,
  store_transcripts,
  false, -- HIPAA = no caller phone storage
  require_verbal_consent,
  true,  -- PHI minimization enabled for medical
  false, -- no customer memory for medical
  CASE WHEN store_recordings THEN retention_days ELSE 0 END,
  CASE WHEN store_transcripts THEN retention_days ELSE 0 END
FROM medical_settings
ON CONFLICT (tenant_id) DO UPDATE SET
  store_recordings = EXCLUDED.store_recordings,
  store_transcripts = EXCLUDED.store_transcripts,
  require_verbal_consent = EXCLUDED.require_verbal_consent,
  updated_at = now();

-- Add comment for documentation
COMMENT ON TABLE public.data_retention_settings IS 'Universal data retention and privacy settings. HIPAA mode tenants have stricter defaults with no PHI storage.';

-- Grant service role access for edge functions
GRANT SELECT ON public.data_retention_settings TO service_role;