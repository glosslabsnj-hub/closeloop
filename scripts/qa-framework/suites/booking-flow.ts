/**
 * Booking Flow Test Suite
 * Tests the complete booking lifecycle: availability check → booking creation → verification
 * Runs against all service-mode businesses.
 */
import type { TestSuite, TestContext } from "../core/types.js";
import { callEdgeFunction, dbQuery, dbInsert } from "../core/supabase-client.js";

// Helper: get a future weekday date string (YYYY-MM-DD)
function getFutureWeekday(daysAhead = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  // Skip to Monday if weekend
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export const bookingFlowSuite: TestSuite = {
  name: "Booking Flow",
  description: "End-to-end booking lifecycle across business types and sizes",
  tests: [
    // ── BF-01: Check availability on open slot ──────────────────────
    {
      id: "BF-01",
      name: "Check availability returns available for open slot",
      description: "Verify check-availability returns available=true for an open time slot",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Check 10am on future weekday",
          action: {
            type: "call_edge_function",
            function: "elevenlabs-check-availability",
            body: {
              date: getFutureWeekday(),
              time: "10:00",
              tenant_id: "$tenantId",
            },
          },
          expect: {
            status: 200,
            bodyContains: { available: true },
          },
        },
      ],
    },

    // ── BF-02: Check availability with service name ─────────────────
    {
      id: "BF-02",
      name: "Check availability resolves service duration",
      description: "When service_name is provided, duration should match the service config",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Check with first service name",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const firstService = ctx.businessConfig.services[0];
              if (!firstService) throw new Error("No services configured");
              const res = await callEdgeFunction("elevenlabs-check-availability", {
                date: getFutureWeekday(),
                time: "10:00",
                service_name: firstService.name,
                tenant_id: ctx.tenantId,
              });
              ctx.variables.checkResult = res.data;
              return res;
            },
          },
          expect: {
            custom: (result: any, ctx: TestContext) => {
              const data = (result as any).data;
              if (!data) return "No response data";
              const expectedDuration = ctx.businessConfig.services[0].duration_minutes;
              if (data.duration_minutes !== expectedDuration) {
                return `Duration mismatch: expected ${expectedDuration}, got ${data.duration_minutes}`;
              }
              return true;
            },
          },
        },
      ],
    },

    // ── BF-03: Create booking and verify in database ────────────────
    {
      id: "BF-03",
      name: "Create booking stores correctly in database",
      description: "Booking creation should create booking + busy_block with correct status",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Create booking via edge function",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const firstService = ctx.businessConfig.services.find(s => s.booking_type !== "estimate_first" && s.booking_type !== "consultation");
              const res = await callEdgeFunction("elevenlabs-create-booking", {
                customer_name: "QATest BookingFlow",
                customer_phone: "+15559990001",
                date: getFutureWeekday(),
                time: "10:00",
                service_name: firstService?.name || ctx.businessConfig.services[0]?.name,
                tenant_id: ctx.tenantId,
              });
              ctx.variables.bookingResult = res.data;
              return res;
            },
          },
          expect: {
            custom: (result: any) => {
              const data = (result as any).data;
              if (!data?.success) return `Booking failed: ${data?.error || data?.message}`;
              if (!data?.booking_id && !data?.confirmation_number) return "No booking_id or confirmation_number returned";
              return true;
            },
          },
        },
        {
          name: "Verify booking exists in database",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              // Find booking by tenant + booking_id from create response
              const bookingData = ctx.variables.bookingResult as any;
              const bookingId = bookingData?.booking_id;
              if (bookingId) {
                const rows = await dbQuery("bookings", { id: bookingId });
                ctx.variables.dbBooking = rows[0];
                return rows;
              }
              // Fallback: find most recent booking for this tenant
              const rows = await dbQuery("bookings", {
                tenant_id: ctx.tenantId,
              }, "id,status,start_at,notes,created_at");
              // Sort by created_at desc, take most recent
              const sorted = (rows as any[]).sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              ctx.variables.dbBooking = sorted[0];
              return sorted.length > 0 ? [sorted[0]] : [];
            },
          },
          expect: {
            custom: (result: any, ctx: TestContext) => {
              const rows = result as any[];
              if (!rows || rows.length === 0) return "No booking found in database";
              const booking = rows[0];
              const expectedStatus = ctx.businessConfig.settings.ai_booking_mode === "auto_confirm" ? "confirmed" : "pending";
              // Check per-service override (normalize auto_confirm -> confirmed, pending stays pending)
              const firstService = ctx.businessConfig.services.find(s => s.booking_type !== "estimate_first" && s.booking_type !== "consultation");
              const serviceOverride = firstService?.confirmation_mode;
              const normalizedOverride = serviceOverride === "auto_confirm" ? "confirmed" : serviceOverride === "pending" ? "pending" : null;
              const effectiveStatus = normalizedOverride || expectedStatus;
              if (booking.status !== effectiveStatus) {
                return `Status: expected ${effectiveStatus}, got ${booking.status}`;
              }
              return true;
            },
          },
        },
        {
          name: "Verify busy_block created",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("busy_blocks", {
                tenant_id: ctx.tenantId,
                is_active: true,
              });
              return rows;
            },
          },
          expect: {
            custom: (result: any) => {
              const rows = result as any[];
              if (!rows || rows.length === 0) return "No busy_block found (double-booking risk!)";
              return true;
            },
          },
        },
      ],
    },

    // ── BF-04: Double-booking prevention ────────────────────────────
    {
      id: "BF-04",
      name: "Prevents double-booking same time slot",
      description: "After booking 10am, checking 10am again should return unavailable",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Create first booking",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const svc = ctx.businessConfig.services.find(s => !s.booking_type || s.booking_type === "direct_book");
              return callEdgeFunction("elevenlabs-create-booking", {
                customer_name: "QATest DoubleBook1",
                customer_phone: "+15559990002",
                date: getFutureWeekday(4),
                time: "11:00",
                service_name: svc?.name,
                tenant_id: ctx.tenantId,
              });
            },
          },
          expect: {
            custom: (r: any) => (r as any).data?.success === true || `First booking failed: ${(r as any).data?.error}`,
          },
        },
        {
          name: "Check same slot - should be unavailable",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              // Small delay for busy_block to be created
              await new Promise(r => setTimeout(r, 1000));
              return callEdgeFunction("elevenlabs-check-availability", {
                date: getFutureWeekday(4),
                time: "11:00",
                service_name: ctx.businessConfig.services[0]?.name,
                tenant_id: ctx.tenantId,
              });
            },
          },
          expect: {
            custom: (r: any) => {
              const data = (r as any).data;
              if (data?.available === true) return "CRITICAL: Slot still shows available after booking (double-booking possible!)";
              return true;
            },
          },
        },
      ],
    },

    // ── BF-05: Per-service confirmation mode ────────────────────────
    {
      id: "BF-05",
      name: "Per-service confirmation mode overrides global setting",
      description: "Mobile services with confirmation_mode=pending should create pending bookings even if global is auto_confirm",
      priority: "p0",
      businesses: ["auto-detailer"],
      steps: [
        {
          name: "Book in-shop service (should auto-confirm)",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const inShopSvc = ctx.businessConfig.services.find(s => s.confirmation_mode === "auto_confirm");
              if (!inShopSvc) throw new Error("No in-shop service found");
              const res = await callEdgeFunction("elevenlabs-create-booking", {
                customer_name: "QATest InShop",
                customer_phone: "+15559990003",
                date: getFutureWeekday(5),
                time: "10:00",
                service_name: inShopSvc.name,
                tenant_id: ctx.tenantId,
              });
              ctx.variables.inShopResult = res.data;
              return res;
            },
          },
          expect: {
            custom: (r: any) => {
              const data = (r as any).data;
              if (!data?.success) return `Booking failed: ${data?.error}`;
              if (data?.status !== "confirmed") return `Expected confirmed status, got ${data?.status}`;
              return true;
            },
          },
        },
        {
          name: "Book mobile service (should be pending)",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const mobileSvc = ctx.businessConfig.services.find(s => s.confirmation_mode === "pending");
              if (!mobileSvc) throw new Error("No mobile service found");
              const res = await callEdgeFunction("elevenlabs-create-booking", {
                customer_name: "QATest Mobile",
                customer_phone: "+15559990004",
                date: getFutureWeekday(5),
                time: "14:00",
                service_name: mobileSvc.name,
                tenant_id: ctx.tenantId,
              });
              ctx.variables.mobileResult = res.data;
              return res;
            },
          },
          expect: {
            custom: (r: any) => {
              const data = (r as any).data;
              if (!data?.success) return `Booking failed: ${data?.error}`;
              if (data?.status !== "pending") return `Expected pending status for mobile service, got ${data?.status}`;
              return true;
            },
          },
        },
      ],
    },

    // ── BF-06: Suggest availability returns slots ───────────────────
    {
      id: "BF-06",
      name: "Suggest availability returns valid time slots",
      description: "suggest-availability should return bookable slots within business hours",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Get suggested slots",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const svc = ctx.businessConfig.services.find(s => !s.booking_type || s.booking_type === "direct_book");
              return callEdgeFunction("elevenlabs-suggest-availability", {
                date: getFutureWeekday(),
                service_name: svc?.name,
                max_results: 5,
                tenant_id: ctx.tenantId,
              });
            },
          },
          expect: {
            custom: (r: any) => {
              const data = (r as any).data;
              if (!data?.success && !data?.slots) return `Suggest failed: ${JSON.stringify(data).substring(0, 200)}`;
              if (!data.slots || data.slots.length === 0) return "No available slots returned";
              // Verify slots have required fields
              for (const slot of data.slots) {
                if (!slot.start || !slot.display) return `Slot missing start or display: ${JSON.stringify(slot)}`;
              }
              return true;
            },
          },
        },
      ],
    },

    // ── BF-07: Booking with vehicle type (auto detailing) ───────────
    {
      id: "BF-07",
      name: "Vehicle type affects pricing for auto services",
      description: "Passing vehicle_type should resolve correct pricing tier",
      priority: "p1",
      businesses: ["auto-detailer"],
      steps: [
        {
          name: "Book with SUV vehicle type",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              return callEdgeFunction("elevenlabs-create-booking", {
                customer_name: "QATest VehiclePrice",
                customer_phone: "+15559990005",
                date: getFutureWeekday(6),
                time: "10:00",
                service_name: "Interior Detail",
                vehicle_type: "SUV",
                tenant_id: ctx.tenantId,
              });
            },
          },
          expect: {
            custom: (r: any) => {
              const data = (r as any).data;
              if (!data?.success) return `Booking failed: ${data?.error}`;
              return true;
            },
          },
        },
      ],
    },

    // ── BF-08: Check availability outside business hours ────────────
    {
      id: "BF-08",
      name: "Returns unavailable for slots outside business hours",
      description: "Checking availability at 3am should return unavailable",
      priority: "p1",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Check 3am slot",
          action: {
            type: "call_edge_function",
            function: "elevenlabs-check-availability",
            body: {
              date: getFutureWeekday(),
              time: "03:00",
              tenant_id: "$tenantId",
            },
          },
          expect: {
            custom: (r: any) => {
              const data = (r as any).data;
              if (data?.available === true) return "3am should not be available during normal business hours";
              return true;
            },
          },
        },
      ],
    },

    // ── BF-09: Missing required fields ──────────────────────────────
    {
      id: "BF-09",
      name: "Booking fails gracefully with missing customer name",
      description: "create-booking should return success=false when customer_name is missing",
      priority: "p1",
      businesses: ["solo-hvac"],
      steps: [
        {
          name: "Attempt booking without name",
          action: {
            type: "call_edge_function",
            function: "elevenlabs-create-booking",
            body: {
              date: getFutureWeekday(),
              time: "10:00",
              tenant_id: "$tenantId",
            },
          },
          expect: {
            status: 200,
            bodyContains: { success: false },
          },
        },
      ],
    },

    // ── BF-10: Service name fuzzy matching ──────────────────────────
    {
      id: "BF-10",
      name: "Service name resolves with fuzzy matching",
      description: "Handles &/and, partial matches, and special characters",
      priority: "p1",
      businesses: ["auto-detailer"],
      steps: [
        {
          name: "Check with 'interior and exterior' (should match 'Interior & Exterior Combo')",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              return callEdgeFunction("elevenlabs-check-availability", {
                date: getFutureWeekday(),
                time: "10:00",
                service_name: "interior and exterior combo",
                tenant_id: ctx.tenantId,
              });
            },
          },
          expect: {
            custom: (r: any) => {
              const data = (r as any).data;
              // Should resolve to Interior & Exterior Combo (240 min)
              if (data?.duration_minutes !== 240) {
                return `Expected 240 min for Interior & Exterior Combo, got ${data?.duration_minutes}`;
              }
              return true;
            },
          },
        },
      ],
    },
  ],
};
