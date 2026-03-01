-- Enable realtime for dispatch_jobs table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dispatch_jobs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_jobs;
  END IF;
END $$;