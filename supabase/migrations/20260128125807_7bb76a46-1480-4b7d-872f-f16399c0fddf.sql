-- Add context_json column to ai_call_sessions for storing dynamic_variables
ALTER TABLE public.ai_call_sessions 
ADD COLUMN IF NOT EXISTS context_json JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.ai_call_sessions.context_json IS 'Stores the dynamic_variables sent to ElevenLabs. Redacted if hipaa_mode=true.';