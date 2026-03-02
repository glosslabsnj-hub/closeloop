/**
 * Edge Function Schema Safety Tests
 *
 * @vitest-environment node
 *
 * Scans edge function source files to ensure they don't insert/update
 * non-existent columns on Supabase tables. PostgREST silently drops
 * unknown columns in INSERT, causing data loss without any error.
 *
 * Bugs caught by these tests:
 * - elevenlabs-create-dispatch-job wrote dispatch_distance_miles, tow_distance_miles,
 *   total_distance_miles, service_tier, pricing_note to dispatch_jobs (none exist)
 * - elevenlabs-webhook wrote vehicle_category to dispatch_jobs (should be service_category)
 * - elevenlabs-webhook wrote dispatch_distance_miles to dispatch_jobs (doesn't exist)
 *
 * Gates: overall/no_console_errors
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ─── Columns that must NEVER appear in .from("dispatch_jobs").insert() ──────

const BANNED_DISPATCH_COLUMNS = [
  "dispatch_distance_miles",
  "tow_distance_miles",
  "total_distance_miles",
  "service_tier",
  "pricing_note",
  "vehicle_category",
  "price_breakdown",
];

// Edge functions that write to dispatch_jobs
const DISPATCH_EDGE_FNS = [
  "supabase/functions/elevenlabs-create-dispatch-job/index.ts",
  "supabase/functions/elevenlabs-webhook/index.ts",
];

function readEdgeFn(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

/**
 * Finds .from("dispatch_jobs").insert({ ... }) blocks and extracts
 * the column names being inserted.
 */
function extractInsertColumns(source: string, table: string): { line: number; column: string }[] {
  const lines = source.split("\n");
  const found: { line: number; column: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    // Look for .from("dispatch_jobs").insert({ or .from("dispatch_jobs")\n.insert({
    if (lines[i].includes(`.from("${table}")`) || lines[i].includes(`.from('${table}')`)) {
      // Scan forward for .insert({ block
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].includes(".insert(")) {
          // Found insert block - scan for column names (key: value patterns)
          for (let k = j; k < Math.min(j + 60, lines.length); k++) {
            // Match "column_name:" or "column_name :" at start of trimmed line
            const colMatch = lines[k].trim().match(/^(\w+)\s*:/);
            if (colMatch && colMatch[1] !== "from" && colMatch[1] !== "const" && colMatch[1] !== "if") {
              found.push({ line: k + 1, column: colMatch[1] });
            }
            // Stop at end of insert object
            if (lines[k].trim().startsWith("})") || lines[k].trim().startsWith(").select")) {
              break;
            }
          }
          break;
        }
      }
    }
  }
  return found;
}

describe("Edge function: dispatch_jobs column safety", () => {
  for (const fnPath of DISPATCH_EDGE_FNS) {
    describe(fnPath.split("/").pop()!, () => {
      const source = readEdgeFn(fnPath);

      for (const banned of BANNED_DISPATCH_COLUMNS) {
        it(`does not INSERT '${banned}' into dispatch_jobs`, () => {
          const columns = extractInsertColumns(source, "dispatch_jobs");
          const violations = columns.filter(c => c.column === banned);
          expect(
            violations,
            `Found banned column '${banned}' in dispatch_jobs INSERT at line(s): ${violations.map(v => v.line).join(", ")}`
          ).toEqual([]);
        });
      }
    });
  }
});

// ─── Bookings column safety (bookings has NO customer_id) ───────────────────

const BANNED_BOOKINGS_COLUMNS = ["customer_id"];

const BOOKINGS_EDGE_FNS = [
  "supabase/functions/elevenlabs-create-booking/index.ts",
  "supabase/functions/elevenlabs-webhook/index.ts",
];

describe("Edge function: bookings column safety", () => {
  for (const fnPath of BOOKINGS_EDGE_FNS) {
    describe(fnPath.split("/").pop()!, () => {
      const source = readEdgeFn(fnPath);

      for (const banned of BANNED_BOOKINGS_COLUMNS) {
        it(`does not INSERT '${banned}' into bookings`, () => {
          const columns = extractInsertColumns(source, "bookings");
          const violations = columns.filter(c => c.column === banned);
          expect(
            violations,
            `Found banned column '${banned}' in bookings INSERT at line(s): ${violations.map(v => v.line).join(", ")}`
          ).toEqual([]);
        });
      }
    });
  }
});

// ─── test_drives column safety (no vehicle_interest column) ─────────────────

const VALID_TEST_DRIVE_COLUMNS = new Set([
  "budget_range", "created_at", "customer_id", "duration_minutes",
  "financing_interest", "id", "notes", "sales_rep_requested",
  "scheduled_at", "scheduled_date", "scheduled_time", "session_id",
  "status", "tenant_id", "trade_in_interest", "trade_in_vehicle_info",
  "updated_at", "vehicle_color", "vehicle_make", "vehicle_model",
  "vehicle_stock_number", "vehicle_trim", "vehicle_type", "vehicle_vin",
  "vehicle_year",
]);

const TEST_DRIVE_EDGE_FNS = [
  "supabase/functions/elevenlabs-webhook/index.ts",
];

describe("Edge function: test_drives column safety", () => {
  for (const fnPath of TEST_DRIVE_EDGE_FNS) {
    describe(fnPath.split("/").pop()!, () => {
      const source = readEdgeFn(fnPath);

      it("only INSERTs valid columns into test_drives", () => {
        const columns = extractInsertColumns(source, "test_drives");
        const invalid = columns.filter(c => !VALID_TEST_DRIVE_COLUMNS.has(c.column));
        expect(
          invalid,
          `Found invalid column(s) in test_drives INSERT: ${invalid.map(c => `'${c.column}' at line ${c.line}`).join(", ")}`
        ).toEqual([]);
      });
    });
  }
});

// ─── food_orders column safety ──────────────────────────────────────────────

const VALID_FOOD_ORDER_COLUMNS = new Set([
  "address_json", "created_at", "customer_id", "customer_name",
  "customer_phone", "delivery_address", "delivery_fee_cents", "handoff_state",
  "id", "items_json", "order_number", "order_type", "requested_time",
  "scheduled_at", "session_id", "special_instructions", "status",
  "subtotal_cents", "tax_cents", "tenant_id", "total_cents",
  "totals_breakdown", "totals_estimate", "updated_at",
]);

const FOOD_ORDER_EDGE_FNS = [
  "supabase/functions/elevenlabs-create-food-order/index.ts",
  "supabase/functions/elevenlabs-webhook/index.ts",
];

describe("Edge function: food_orders column safety", () => {
  for (const fnPath of FOOD_ORDER_EDGE_FNS) {
    describe(fnPath.split("/").pop()!, () => {
      const source = readEdgeFn(fnPath);

      it("only INSERTs valid columns into food_orders", () => {
        const columns = extractInsertColumns(source, "food_orders");
        const invalid = columns.filter(c => !VALID_FOOD_ORDER_COLUMNS.has(c.column));
        expect(
          invalid,
          `Found invalid column(s) in food_orders INSERT: ${invalid.map(c => `'${c.column}' at line ${c.line}`).join(", ")}`
        ).toEqual([]);
      });
    });
  }
});

// ─── medical_intakes column safety ──────────────────────────────────────────

const VALID_MEDICAL_INTAKE_COLUMNS = new Set([
  "ai_summary", "call_session_id", "consent_timestamp", "created_at",
  "customer_id", "id", "insurance_provider", "intake_type",
  "preferred_date", "preferred_time_range", "reason_for_visit",
  "status", "tenant_id", "updated_at", "urgency_level",
  "verbal_consent_given",
]);

const MEDICAL_INTAKE_EDGE_FNS = [
  "supabase/functions/elevenlabs-webhook/index.ts",
];

describe("Edge function: medical_intakes column safety", () => {
  for (const fnPath of MEDICAL_INTAKE_EDGE_FNS) {
    describe(fnPath.split("/").pop()!, () => {
      const source = readEdgeFn(fnPath);

      it("only INSERTs valid columns into medical_intakes", () => {
        const columns = extractInsertColumns(source, "medical_intakes");
        const invalid = columns.filter(c => !VALID_MEDICAL_INTAKE_COLUMNS.has(c.column));
        expect(
          invalid,
          `Found invalid column(s) in medical_intakes INSERT: ${invalid.map(c => `'${c.column}' at line ${c.line}`).join(", ")}`
        ).toEqual([]);
      });
    });
  }
});

// ─── sales_leads column safety ──────────────────────────────────────────────

const VALID_SALES_LEAD_COLUMNS = new Set([
  "assigned_sales_rep", "budget_range", "created_at", "customer_id",
  "financing_preapproved", "follow_up_at", "has_trade_in", "id",
  "interest_type", "lead_number", "notes", "priority", "session_id",
  "source", "status", "tenant_id", "timeline", "trade_in_details",
  "updated_at", "vehicle_interest",
]);

const SALES_LEAD_EDGE_FNS = [
  "supabase/functions/elevenlabs-webhook/index.ts",
];

describe("Edge function: sales_leads column safety", () => {
  for (const fnPath of SALES_LEAD_EDGE_FNS) {
    describe(fnPath.split("/").pop()!, () => {
      const source = readEdgeFn(fnPath);

      it("only INSERTs valid columns into sales_leads", () => {
        const columns = extractInsertColumns(source, "sales_leads");
        const invalid = columns.filter(c => !VALID_SALES_LEAD_COLUMNS.has(c.column));
        expect(
          invalid,
          `Found invalid column(s) in sales_leads INSERT: ${invalid.map(c => `'${c.column}' at line ${c.line}`).join(", ")}`
        ).toEqual([]);
      });
    });
  }
});

// ─── Outcome enum safety (edge functions must use correct values) ───────────

const VALID_OUTCOMES = [
  "booked", "dispatch", "order", "intake", "lead", "followup",
  "escalated", "message", "lost", "info",
] as const;

const INVALID_OUTCOMES = ["booking", "dispatched", "forwarded", "voicemail"];

describe("Edge function: outcome enum correctness", () => {
  const webhookSource = readEdgeFn("supabase/functions/elevenlabs-webhook/index.ts");

  for (const invalid of INVALID_OUTCOMES) {
    it(`elevenlabs-webhook does not set outcome to '${invalid}'`, () => {
      // Look for outcome: "invalid" pattern (direct assignment)
      const pattern = new RegExp(`outcome:\\s*["']${invalid}["']`, "g");
      const matches = webhookSource.match(pattern) || [];
      expect(
        matches.length,
        `Found invalid outcome '${invalid}' being assigned in elevenlabs-webhook`
      ).toBe(0);
    });
  }
});
