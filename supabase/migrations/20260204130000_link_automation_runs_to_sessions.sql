-- Add session_id to automation_runs and workflow_runs for traceability
-- This allows us to trace which AI call triggered which automation

-- Add session_id to automation_runs
ALTER TABLE public.automation_runs
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL;

-- Add session_id to workflow_runs
ALTER TABLE public.workflow_runs
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.ai_call_sessions(id) ON DELETE SET NULL;

-- Add indexes for efficient session-based lookups
CREATE INDEX IF NOT EXISTS idx_automation_runs_session
ON public.automation_runs(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_session
ON public.workflow_runs(session_id) WHERE session_id IS NOT NULL;

-- Create a view for easy session-to-automation tracing
CREATE OR REPLACE VIEW public.session_automation_summary AS
SELECT
  s.id AS session_id,
  s.tenant_id,
  s.caller_phone,
  s.outcome,
  s.started_at AS call_started_at,
  s.ended_at AS call_ended_at,
  COALESCE(ar.automation_count, 0) AS automation_runs_count,
  COALESCE(wr.workflow_count, 0) AS workflow_runs_count,
  COALESCE(ar.successful_automations, 0) AS successful_automations,
  COALESCE(wr.successful_workflows, 0) AS successful_workflows
FROM public.ai_call_sessions s
LEFT JOIN (
  SELECT
    session_id,
    COUNT(*) AS automation_count,
    COUNT(*) FILTER (WHERE status = 'success') AS successful_automations
  FROM public.automation_runs
  WHERE session_id IS NOT NULL
  GROUP BY session_id
) ar ON ar.session_id = s.id
LEFT JOIN (
  SELECT
    session_id,
    COUNT(*) AS workflow_count,
    COUNT(*) FILTER (WHERE status = 'success') AS successful_workflows
  FROM public.workflow_runs
  WHERE session_id IS NOT NULL
  GROUP BY session_id
) wr ON wr.session_id = s.id;

-- Grant access to the view
GRANT SELECT ON public.session_automation_summary TO authenticated;
