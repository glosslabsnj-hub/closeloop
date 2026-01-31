-- Add elevenlabs_agent_id to ai_assistants table
ALTER TABLE public.ai_assistants
ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT;