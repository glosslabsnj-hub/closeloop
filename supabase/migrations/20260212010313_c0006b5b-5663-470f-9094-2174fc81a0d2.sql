
-- Add lead scoring and follow-up tracking to ai_call_sessions
-- Using validation trigger instead of CHECK constraint per guidelines

ALTER TABLE public.ai_call_sessions
  ADD COLUMN lead_score text DEFAULT 'warm',
  ADD COLUMN followup_status text DEFAULT 'new';

-- Create validation trigger for lead_score
CREATE OR REPLACE FUNCTION public.validate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_score IS NOT NULL AND NEW.lead_score NOT IN ('hot', 'warm', 'cool') THEN
    RAISE EXCEPTION 'Invalid lead_score: %. Must be hot, warm, or cool', NEW.lead_score;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_lead_score_trigger ON public.ai_call_sessions;
CREATE TRIGGER validate_lead_score_trigger
  BEFORE INSERT OR UPDATE ON public.ai_call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lead_score();

-- Create validation trigger for followup_status
CREATE OR REPLACE FUNCTION public.validate_followup_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.followup_status IS NOT NULL AND NEW.followup_status NOT IN ('new', 'called_back', 'no_answer', 'completed', 'lost') THEN
    RAISE EXCEPTION 'Invalid followup_status: %. Must be new, called_back, no_answer, completed, or lost', NEW.followup_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_followup_status_trigger ON public.ai_call_sessions;
CREATE TRIGGER validate_followup_status_trigger
  BEFORE INSERT OR UPDATE ON public.ai_call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_followup_status();

-- Index for fast lead hub queries
CREATE INDEX IF NOT EXISTS idx_ai_call_sessions_lead_score ON public.ai_call_sessions (tenant_id, lead_score, followup_status);
