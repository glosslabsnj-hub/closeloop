/**
 * QA Framework Configuration
 *
 * SAFETY: All QA operations are isolated to [QA] prefixed test tenants.
 * Real tenant IDs are listed in PROTECTED_TENANT_IDS and will NEVER be modified.
 */

export const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co";
export const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdHpsdnpnd2tpZGJlcWFvZXZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA1OTU1OCwiZXhwIjoyMDg3NjM1NTU4fQ.wcWk27OBb2cVHid_gKiiu9wTHL_jkAHQ1Pv4raWfwz4";

// Test tenant prefix — all test tenants use this to avoid colliding with real data
export const TEST_PREFIX = "[QA]";
export const TEST_CUSTOMER_PREFIX = "QATest";

// PROTECTED TENANTS — QA must NEVER read, write, update, or delete data for these
// Gloss Labs (live business), Comfort Zone HVAC (demo), and any future production tenants
export const PROTECTED_TENANT_IDS = [
  "582b44cf-3026-4a34-a0f9-515c95797405", // Gloss Labs NJ (LIVE)
  "f758cc2b-e5b3-459d-968e-1e0b5e23bae1", // Comfort Zone HVAC (demo)
];

// Concurrency
export const MAX_PARALLEL_TESTS = 3;

// Timeouts
export const EDGE_FUNCTION_TIMEOUT = 30_000;
export const DB_POLL_TIMEOUT = 15_000;
export const DB_POLL_INTERVAL = 2_000;
