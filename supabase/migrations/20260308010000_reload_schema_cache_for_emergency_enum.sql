-- Reload PostgREST schema cache to pick up 'emergency' value added to dispatch_priority enum.
-- When ALTER TYPE ADD VALUE is run, PostgREST may cache the old enum values and silently
-- drop inserts with the new value (using the DEFAULT 'normal' instead). This pg_notify
-- forces PostgREST to reload its schema cache and recognize 'emergency'.
SELECT pg_notify('pgrst', 'reload schema');
