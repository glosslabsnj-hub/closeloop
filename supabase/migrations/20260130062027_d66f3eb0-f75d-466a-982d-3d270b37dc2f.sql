-- Enable realtime on ai_call_sessions for live updates when webhook processes calls
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ai_call_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_call_sessions;
  END IF;
END $$;