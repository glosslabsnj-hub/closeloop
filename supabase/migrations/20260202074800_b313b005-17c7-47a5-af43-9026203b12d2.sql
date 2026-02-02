-- Create admin_settings table for persisting admin's active tenant selection
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_active_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only super_admins can access their own row
CREATE POLICY "Super admins manage their own settings"
  ON public.admin_settings
  FOR ALL
  USING (
    user_id = auth.uid() AND 
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    user_id = auth.uid() AND 
    public.has_role(auth.uid(), 'super_admin')
  );

-- Create trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();