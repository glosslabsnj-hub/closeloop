/**
 * QA Framework Types
 * Tests real platform functionality by calling edge functions + verifying DB state.
 * No ElevenLabs API needed — tests the backend directly.
 */

// ── Business Configuration ──────────────────────────────────────────

export type BusinessMode = "service" | "dispatch" | "food" | "medical" | "sales" | "general";

export interface BusinessConfig {
  name: string;
  slug: string;
  mode: BusinessMode;
  industry: string;
  timezone: string;
  size: "solo" | "small" | "medium" | "large";
  phone: string;
  address: string;
  hours: Record<string, { open: string; close: string } | null>;
  services: ServiceConfig[];
  staff?: StaffConfig[];
  settings: {
    ai_booking_mode: "auto_confirm" | "pending";
    same_day_enabled: boolean;
    buffer_minutes: number;
    max_advance_days: number;
    deposit_required?: boolean;
    deposit_amount?: string;
    dropoff_instructions?: string;
  };
}

export interface ServiceConfig {
  name: string;
  duration_minutes: number;
  price_type: "fixed" | "starting_at" | "quote_only";
  price_amount?: number;
  confirmation_mode?: "auto_confirm" | "pending" | null;
  requires_dropoff?: boolean;
  booking_type?: "direct_book" | "estimate_first" | "consultation";
  preparation_instructions?: string;
}

export interface StaffConfig {
  name: string;
  role: string;
  services?: string[]; // service names this staff member handles
}

// ── Test Definitions ────────────────────────────────────────────────

export interface TestSuite {
  name: string;
  description: string;
  tests: TestCase[];
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  priority: "p0" | "p1" | "p2";
  businesses: string[]; // business slugs to run against, or ["*"] for all
  modes?: BusinessMode[]; // only run for these modes
  steps: TestStep[];
}

export interface TestStep {
  name: string;
  action: TestAction;
  expect: TestExpectation;
}

export type TestAction =
  | { type: "call_edge_function"; function: string; body: Record<string, unknown> }
  | { type: "query_db"; table: string; filters: Record<string, unknown>; select?: string }
  | { type: "insert_db"; table: string; data: Record<string, unknown> }
  | { type: "update_db"; table: string; filters: Record<string, unknown>; data: Record<string, unknown> }
  | { type: "delete_db"; table: string; filters: Record<string, unknown> }
  | { type: "wait"; ms: number }
  | { type: "custom"; fn: (ctx: TestContext) => Promise<unknown> };

export interface TestExpectation {
  status?: number;
  bodyContains?: Record<string, unknown>;
  bodyMatches?: (body: unknown) => boolean;
  dbHasRow?: { table: string; filters: Record<string, unknown>; fields?: Record<string, FieldCheck> };
  dbNoRow?: { table: string; filters: Record<string, unknown> };
  custom?: (result: unknown, ctx: TestContext) => boolean | string;
}

export type FieldCheck =
  | { op: "equals"; value: unknown }
  | { op: "contains"; value: string }
  | { op: "not_null" }
  | { op: "truthy" }
  | { op: "one_of"; values: unknown[] }
  | { op: "gt"; value: number }
  | { op: "lt"; value: number };

// ── Test Context (runtime state) ────────────────────────────────────

export interface TestContext {
  tenantId: string;
  businessConfig: BusinessConfig;
  serviceIds: Record<string, string>; // service name → id
  staffIds: Record<string, string>;   // staff name → id
  createdRecords: { table: string; id: string }[]; // for cleanup
  variables: Record<string, unknown>; // step results carried forward
  supabaseUrl: string;
  serviceRoleKey: string;
}

// ── Test Results ────────────────────────────────────────────────────

export interface TestResult {
  testId: string;
  testName: string;
  business: string;
  passed: boolean;
  steps: StepResult[];
  duration_ms: number;
  error?: string;
}

export interface StepResult {
  name: string;
  passed: boolean;
  duration_ms: number;
  details?: string;
  error?: string;
}

export interface SuiteResult {
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  results: TestResult[];
  byBusiness: Record<string, { total: number; passed: number; failed: number }>;
  byPriority: Record<string, { total: number; passed: number; failed: number }>;
}
