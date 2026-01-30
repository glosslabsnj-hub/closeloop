-- Enable realtime on ai_call_sessions for live updates when webhook processes calls
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_call_sessions;