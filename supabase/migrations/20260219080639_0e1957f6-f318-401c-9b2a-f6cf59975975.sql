
-- Create the agency_applications table
CREATE TABLE IF NOT EXISTS public.agency_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    company_name text NOT NULL,
    company_website text,
    expected_clients integer NOT NULL,
    current_client_count integer,
    services_offered text[] DEFAULT '{}',
    referral_source text,
    message text,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'approved', 'rejected')),
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    approved_agency_id uuid REFERENCES public.agency_accounts(id),
    user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agency_applications_email ON public.agency_applications(email);
CREATE INDEX IF NOT EXISTS idx_agency_applications_status ON public.agency_applications(status);

-- Enable RLS
ALTER TABLE public.agency_applications ENABLE ROW LEVEL SECURITY;

-- Anon users can insert (public application form)
CREATE POLICY "Anyone can submit agency applications"
ON public.agency_applications FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Authenticated users can view their own applications
CREATE POLICY "Users can view own applications"
ON public.agency_applications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Super admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.agency_applications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can update applications
CREATE POLICY "Admins can update applications"
ON public.agency_applications FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_agency_applications_updated_at
BEFORE UPDATE ON public.agency_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
