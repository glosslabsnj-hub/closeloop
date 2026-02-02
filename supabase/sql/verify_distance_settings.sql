-- ============================================================================
-- VERIFICATION SCRIPT: tenant_distance_settings
-- ============================================================================
-- Run this script to verify the Distance-aware ETA migration was applied correctly.
-- Safe to run in production - queries only pg_catalog metadata, no tenant data.
--
-- Usage:
--   psql -f verify_distance_settings.sql
--   OR run in Supabase SQL Editor
-- ============================================================================

WITH checks AS (
  -- Check 1: Table exists
  SELECT
    'table_exists' AS check_name,
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_tables
      WHERE schemaname = 'public' AND tablename = 'tenant_distance_settings'
    ) AS ok,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_catalog.pg_tables
        WHERE schemaname = 'public' AND tablename = 'tenant_distance_settings'
      ) THEN 'Table public.tenant_distance_settings exists'
      ELSE 'MISSING: Table public.tenant_distance_settings not found'
    END AS details

  UNION ALL

  -- Check 2: RLS enabled
  SELECT
    'rls_enabled' AS check_name,
    COALESCE((
      SELECT relrowsecurity
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'tenant_distance_settings'
    ), false) AS ok,
    CASE
      WHEN COALESCE((
        SELECT relrowsecurity
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'tenant_distance_settings'
      ), false) THEN 'RLS is ENABLED'
      ELSE 'MISSING: RLS is NOT enabled'
    END AS details

  UNION ALL

  -- Check 3: FORCE RLS enabled
  SELECT
    'force_rls_enabled' AS check_name,
    COALESCE((
      SELECT relforcerowsecurity
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'tenant_distance_settings'
    ), false) AS ok,
    CASE
      WHEN COALESCE((
        SELECT relforcerowsecurity
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'tenant_distance_settings'
      ), false) THEN 'FORCE RLS is ENABLED'
      ELSE 'MISSING: FORCE RLS is NOT enabled'
    END AS details

  UNION ALL

  -- Check 4: Policy tenant_isolation_all exists for authenticated role
  SELECT
    'policy_tenant_isolation_all' AS check_name,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'tenant_distance_settings'
        AND policyname = 'tenant_isolation_all'
        AND roles @> ARRAY['authenticated']::name[]
    ) AS ok,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'tenant_distance_settings'
          AND policyname = 'tenant_isolation_all'
          AND roles @> ARRAY['authenticated']::name[]
      ) THEN 'Policy tenant_isolation_all exists for authenticated role'
      ELSE 'MISSING: Policy tenant_isolation_all not found for authenticated'
    END AS details

  UNION ALL

  -- Check 5: No public (anon) policies exist
  SELECT
    'no_public_policy' AS check_name,
    NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'tenant_distance_settings'
        AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])
    ) AS ok,
    CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'tenant_distance_settings'
          AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])
      ) THEN 'No anon/public policies (correct)'
      ELSE 'WARNING: Found anon or public policies - review security'
    END AS details

  UNION ALL

  -- Check 6: updated_at trigger exists
  SELECT
    'updated_at_trigger' AS check_name,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND c.relname = 'tenant_distance_settings'
        AND t.tgname = 'update_tenant_distance_settings_updated_at'
    ) AS ok,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
        JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relname = 'tenant_distance_settings'
          AND t.tgname = 'update_tenant_distance_settings_updated_at'
      ) THEN 'Trigger update_tenant_distance_settings_updated_at exists'
      ELSE 'MISSING: updated_at trigger not found'
    END AS details

  UNION ALL

  -- Check 7: All required columns exist
  SELECT
    'required_columns' AS check_name,
    (
      SELECT COUNT(*) = 9
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND c.relname = 'tenant_distance_settings'
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND a.attname IN (
          'tenant_id', 'enabled', 'provider', 'fallback_mode',
          'fallback_minutes_per_mile', 'eta_rounding_minutes',
          'max_distance_miles', 'created_at', 'updated_at'
        )
    ) AS ok,
    (
      SELECT string_agg(a.attname, ', ' ORDER BY a.attnum)
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND c.relname = 'tenant_distance_settings'
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) AS details
)
SELECT
  check_name,
  ok,
  details
FROM checks
ORDER BY
  CASE check_name
    WHEN 'table_exists' THEN 1
    WHEN 'rls_enabled' THEN 2
    WHEN 'force_rls_enabled' THEN 3
    WHEN 'policy_tenant_isolation_all' THEN 4
    WHEN 'no_public_policy' THEN 5
    WHEN 'updated_at_trigger' THEN 6
    WHEN 'required_columns' THEN 7
  END;

-- Summary: All checks should show ok = true
SELECT
  'SUMMARY' AS check_name,
  bool_and(ok) AS all_passed,
  COUNT(*) FILTER (WHERE ok) || '/' || COUNT(*) || ' checks passed' AS details
FROM (
  SELECT ok FROM checks
) sub;
