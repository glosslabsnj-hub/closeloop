-- Create golden_path_runs table to persist test results
CREATE TABLE public.golden_path_runs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    overall_status TEXT NOT NULL DEFAULT 'running' CHECK (overall_status IN ('running', 'passed', 'partial', 'failed')),
    results_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    pass_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    mode TEXT,
    run_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.golden_path_runs ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can select (admin page already checks isSuperAdmin in code)
CREATE POLICY "Authenticated users can view golden_path_runs"
ON public.golden_path_runs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policy: authenticated users can insert
CREATE POLICY "Authenticated users can insert golden_path_runs"
ON public.golden_path_runs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: authenticated users can update their own runs
CREATE POLICY "Authenticated users can update golden_path_runs"
ON public.golden_path_runs
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create index for fast lookups
CREATE INDEX idx_golden_path_runs_tenant ON public.golden_path_runs(tenant_id);
CREATE INDEX idx_golden_path_runs_status ON public.golden_path_runs(overall_status);
CREATE INDEX idx_golden_path_runs_created ON public.golden_path_runs(created_at DESC);

-- Add comment
COMMENT ON TABLE public.golden_path_runs IS 'Stores Golden Path QA test run results for validating core flows across business modes';