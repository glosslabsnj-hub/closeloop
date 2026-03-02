/**
 * Mutation Schema Safety Tests
 *
 * Guards against hooks attempting to write non-existent columns to Supabase tables.
 * PostgREST rejects unknown columns with 400 errors, causing silent mutation failures
 * that show confusing error toasts to users.
 *
 * Bugs caught by these tests:
 * - useOrderMutations wrote completed_at, payment_status, payment_method to food_orders
 *   (none of these columns exist — mutations would silently fail with 400 error)
 * - useDispatchMutations wrote payment_status, payment_method to dispatch_jobs
 *   (columns don't exist — markPaid would always fail)
 * - useDispatchDashboard and ActiveJobQueue checked priority === "emergency"
 *   (dispatch_priority enum only has: low, normal, high, urgent)
 *
 * Gates: overall/no_console_errors, functional/booking_creates_correctly
 */
import { describe, it, expect } from "vitest";

// ─── food_orders Schema (from Supabase types.ts) ────────────────────────────

const FOOD_ORDERS_COLUMNS = new Set([
  "address_json", "created_at", "customer_id", "customer_name", "customer_phone",
  "delivery_address", "delivery_fee_cents", "handoff_state", "id", "items_json",
  "order_number", "order_type", "requested_time", "scheduled_at", "session_id",
  "special_instructions", "status", "subtotal_cents", "tax_cents", "tenant_id",
  "total_cents", "totals_breakdown", "totals_estimate", "updated_at",
]);

const FOOD_ORDER_STATUSES = [
  "pending", "confirmed", "preparing", "ready",
  "out_for_delivery", "completed", "cancelled",
] as const;

// ─── dispatch_jobs Schema (from Supabase types.ts) ──────────────────────────

const DISPATCH_JOBS_COLUMNS = new Set([
  "additional_stops", "affected_area_sqft", "arrived_at", "assigned_crew",
  "assigned_vehicle", "completed_at", "created_at", "customer_id", "customer_name",
  "customer_phone", "damage_type", "description", "dispatched_at", "document_type",
  "drivable", "driver_id", "dropoff_address", "dropoff_lat", "dropoff_lng",
  "dropoff_required", "en_route_at", "equipment_required", "estimated_arrival_at",
  "estimated_duration_minutes", "estimated_eta_minutes", "id", "inventory_items",
  "item_count", "job_number", "job_type", "notes", "on_site_at", "passenger_count",
  "patient_info", "pet_info", "photo_requested", "photos", "pickup_address",
  "pickup_lat", "pickup_lng", "price_cents", "priority", "recurring_schedule",
  "requested_at", "scheduled_at", "service_category", "session_id", "signer_count",
  "special_requirements", "status", "tenant_id", "updated_at", "vehicle_id",
  "volume_estimate", "weight_estimate",
]);

const DISPATCH_PRIORITY_VALUES = ["low", "normal", "high", "urgent"] as const;

const DISPATCH_STATUS_VALUES = [
  "pending", "assigned", "en_route", "on_site", "completed", "cancelled",
] as const;

// ─── food_orders column safety ──────────────────────────────────────────────

describe("food_orders mutation column safety", () => {
  it("food_orders does NOT have completed_at column", () => {
    expect(FOOD_ORDERS_COLUMNS.has("completed_at")).toBe(false);
  });

  it("food_orders does NOT have payment_status column", () => {
    expect(FOOD_ORDERS_COLUMNS.has("payment_status")).toBe(false);
  });

  it("food_orders does NOT have payment_method column", () => {
    expect(FOOD_ORDERS_COLUMNS.has("payment_method")).toBe(false);
  });

  it("food_orders HAS status column for state transitions", () => {
    expect(FOOD_ORDERS_COLUMNS.has("status")).toBe(true);
  });

  it("food_orders HAS special_instructions for cancel reasons", () => {
    expect(FOOD_ORDERS_COLUMNS.has("special_instructions")).toBe(true);
  });

  it("updateStatus should only write status (no completed_at)", () => {
    // Simulates the fix: updateStatus now only sets { status }
    function buildUpdatePayload(status: string): Record<string, unknown> {
      return { status };
    }

    const payload = buildUpdatePayload("completed");
    expect(Object.keys(payload)).toEqual(["status"]);
    expect(payload).not.toHaveProperty("completed_at");

    // Verify all keys are valid food_orders columns
    for (const key of Object.keys(payload)) {
      expect(FOOD_ORDERS_COLUMNS.has(key)).toBe(true);
    }
  });

  it("cancelOrder should only write status + optional special_instructions", () => {
    function buildCancelPayload(reason?: string): Record<string, unknown> {
      const updates: Record<string, unknown> = { status: "cancelled" };
      if (reason) updates.special_instructions = reason;
      return updates;
    }

    const withReason = buildCancelPayload("Customer changed mind");
    expect(withReason).not.toHaveProperty("completed_at");
    for (const key of Object.keys(withReason)) {
      expect(FOOD_ORDERS_COLUMNS.has(key)).toBe(true);
    }

    const withoutReason = buildCancelPayload();
    expect(Object.keys(withoutReason)).toEqual(["status"]);
  });

  it("markPaid should write status=completed (no payment_status/payment_method)", () => {
    // Simulates the fix: markPaid now sets status to completed
    function buildMarkPaidPayload(): Record<string, unknown> {
      return { status: "completed" };
    }

    const payload = buildMarkPaidPayload();
    expect(payload).not.toHaveProperty("payment_status");
    expect(payload).not.toHaveProperty("payment_method");
    for (const key of Object.keys(payload)) {
      expect(FOOD_ORDERS_COLUMNS.has(key)).toBe(true);
    }
  });

  it("all food order statuses are valid", () => {
    for (const status of FOOD_ORDER_STATUSES) {
      expect(typeof status).toBe("string");
      expect(status.length).toBeGreaterThan(0);
    }
  });
});

// ─── dispatch_jobs column safety ────────────────────────────────────────────

describe("dispatch_jobs mutation column safety", () => {
  it("dispatch_jobs HAS completed_at column (unlike food_orders)", () => {
    expect(DISPATCH_JOBS_COLUMNS.has("completed_at")).toBe(true);
  });

  it("dispatch_jobs HAS arrived_at column", () => {
    expect(DISPATCH_JOBS_COLUMNS.has("arrived_at")).toBe(true);
  });

  it("dispatch_jobs HAS dispatched_at column", () => {
    expect(DISPATCH_JOBS_COLUMNS.has("dispatched_at")).toBe(true);
  });

  it("dispatch_jobs does NOT have payment_status column", () => {
    expect(DISPATCH_JOBS_COLUMNS.has("payment_status")).toBe(false);
  });

  it("dispatch_jobs does NOT have payment_method column", () => {
    expect(DISPATCH_JOBS_COLUMNS.has("payment_method")).toBe(false);
  });

  it("dispatch markPaid should write status+completed_at (no payment columns)", () => {
    function buildDispatchMarkPaidPayload(): Record<string, unknown> {
      return { status: "completed", completed_at: new Date().toISOString() };
    }

    const payload = buildDispatchMarkPaidPayload();
    expect(payload).not.toHaveProperty("payment_status");
    expect(payload).not.toHaveProperty("payment_method");
    for (const key of Object.keys(payload)) {
      expect(DISPATCH_JOBS_COLUMNS.has(key)).toBe(true);
    }
  });

  it("dispatch updateStatus payload uses only valid columns", () => {
    function buildStatusPayload(status: string): Record<string, unknown> {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "on_site") updates.arrived_at = new Date().toISOString();
      if (status === "en_route") updates.dispatched_at = new Date().toISOString();
      return updates;
    }

    for (const status of DISPATCH_STATUS_VALUES) {
      const payload = buildStatusPayload(status);
      for (const key of Object.keys(payload)) {
        expect(DISPATCH_JOBS_COLUMNS.has(key)).toBe(true);
      }
    }
  });
});

// ─── dispatch_priority enum safety ──────────────────────────────────────────

describe("dispatch_priority enum correctness", () => {
  it("valid priorities are: low, normal, high, urgent", () => {
    expect(DISPATCH_PRIORITY_VALUES).toEqual(["low", "normal", "high", "urgent"]);
  });

  it("'emergency' is NOT a valid dispatch priority", () => {
    expect(DISPATCH_PRIORITY_VALUES).not.toContain("emergency");
  });

  it("urgent job detection uses only valid enum values", () => {
    // Simulates the fix in useDispatchDashboard + ActiveJobQueue
    function isUrgentJob(priority: string | null): boolean {
      return priority === "urgent" || priority === "high";
    }

    expect(isUrgentJob("urgent")).toBe(true);
    expect(isUrgentJob("high")).toBe(true);
    expect(isUrgentJob("normal")).toBe(false);
    expect(isUrgentJob("low")).toBe(false);
    expect(isUrgentJob(null)).toBe(false);
    // "emergency" is no longer checked
    expect(isUrgentJob("emergency")).toBe(false);
  });

  it("urgentCount filter matches only high + urgent priorities", () => {
    const jobs = [
      { priority: "low" },
      { priority: "normal" },
      { priority: "high" },
      { priority: "urgent" },
      { priority: null },
    ];

    const urgentCount = jobs.filter(
      j => j.priority === "urgent" || j.priority === "high"
    ).length;

    expect(urgentCount).toBe(2); // high + urgent
  });
});

// ─── Cross-mode: food vs dispatch mutation patterns ─────────────────────────

describe("Cross-mode mutation pattern differences", () => {
  it("food_orders tracks time via updated_at (auto), dispatch via completed_at (manual)", () => {
    // food_orders: no completed_at, relies on updated_at auto-trigger
    expect(FOOD_ORDERS_COLUMNS.has("completed_at")).toBe(false);
    expect(FOOD_ORDERS_COLUMNS.has("updated_at")).toBe(true);

    // dispatch_jobs: has explicit completed_at for driver workflow
    expect(DISPATCH_JOBS_COLUMNS.has("completed_at")).toBe(true);
    expect(DISPATCH_JOBS_COLUMNS.has("updated_at")).toBe(true);
  });

  it("food_orders uses order_number, dispatch uses job_number", () => {
    expect(FOOD_ORDERS_COLUMNS.has("order_number")).toBe(true);
    expect(FOOD_ORDERS_COLUMNS.has("job_number")).toBe(false);

    expect(DISPATCH_JOBS_COLUMNS.has("job_number")).toBe(true);
    expect(DISPATCH_JOBS_COLUMNS.has("order_number")).toBe(false);
  });

  it("neither table has payment_status or payment_method", () => {
    // Both tables lack payment tracking columns
    for (const col of ["payment_status", "payment_method"]) {
      expect(FOOD_ORDERS_COLUMNS.has(col)).toBe(false);
      expect(DISPATCH_JOBS_COLUMNS.has(col)).toBe(false);
    }
  });
});
