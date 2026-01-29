-- Add dynamic_variables_json column to ai_context_snapshots for instrumentation
ALTER TABLE public.ai_context_snapshots 
ADD COLUMN IF NOT EXISTS dynamic_variables_json JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.ai_context_snapshots.dynamic_variables_json IS 'Stores the exact dynamic_variables sent to ElevenLabs (with sensitive data redacted) for debugging AI context issues';