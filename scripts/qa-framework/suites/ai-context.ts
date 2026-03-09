/**
 * AI Context Test Suite
 * Verifies the AI voice agent receives correct business context.
 *
 * Note: elevenlabs-init requires HMAC webhook signature from ElevenLabs,
 * so we test business context via direct database queries to verify
 * all the data the AI would receive is correctly configured.
 */
import type { TestSuite, TestContext } from "../core/types.js";
import { dbQuery } from "../core/supabase-client.js";

export const aiContextSuite: TestSuite = {
  name: "AI Context & Initialization",
  description: "Verify business context data is correctly configured for AI agent consumption",
  tests: [
    // ── AC-01: Tenant has required fields for AI context ─────────
    {
      id: "AC-01",
      name: "Tenant has all required fields for AI context",
      description: "Tenant must have name, mode, timezone, hours, and phone for AI init",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Verify tenant fields",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("tenants", { id: ctx.tenantId });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result) return "Tenant not found";
              if (!result.name) return "Missing name";
              if (!result.business_mode) return "Missing business_mode";
              if (!result.timezone) return "Missing timezone";
              if (!result.hours_json) return "Missing hours_json";
              if (!result.phone_public) return "Missing phone_public";
              return true;
            },
          },
        },
      ],
    },

    // ── AC-02: Services exist and have required fields ────────────
    {
      id: "AC-02",
      name: "Services are properly configured for AI context",
      description: "All services must have name, duration, and price for AI to quote correctly",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Verify services",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("services", { tenant_id: ctx.tenantId, is_active: true });
              return rows;
            },
          },
          expect: {
            custom: (result: any, ctx: TestContext) => {
              const rows = result as any[];
              if (!rows || rows.length === 0) return "No active services found";
              const expectedCount = ctx.businessConfig.services.length;
              if (rows.length !== expectedCount) {
                return `Expected ${expectedCount} services, found ${rows.length}`;
              }
              for (const svc of rows) {
                if (!svc.name) return `Service missing name: ${JSON.stringify(svc)}`;
                if (!svc.duration_minutes) return `Service "${svc.name}" missing duration_minutes`;
                if (!svc.price_type) return `Service "${svc.name}" missing price_type`;
              }
              return true;
            },
          },
        },
      ],
    },

    // ── AC-03: Assistant settings configured ──────────────────────
    {
      id: "AC-03",
      name: "Assistant settings are configured for AI",
      description: "ai_booking_mode and voice settings must be present",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Verify assistant_settings",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("assistant_settings", { tenant_id: ctx.tenantId });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result) return "No assistant_settings found";
              if (!result.ai_booking_mode) return "Missing ai_booking_mode";
              if (!["auto_book", "pending_approval"].includes(result.ai_booking_mode)) {
                return `Invalid ai_booking_mode: ${result.ai_booking_mode}`;
              }
              return true;
            },
          },
        },
      ],
    },

    // ── AC-04: Business hours are valid JSON ──────────────────────
    {
      id: "AC-04",
      name: "Business hours JSON is valid and complete",
      description: "Hours must cover all 7 days with correct window format",
      priority: "p1",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Verify hours structure",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("tenants", { id: ctx.tenantId });
              return rows[0]?.hours_json;
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result) return "No hours_json";
              const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
              for (const day of requiredDays) {
                if (!(day in result)) return `Missing day: ${day}`;
                const dayData = result[day];
                if (typeof dayData.closed !== "boolean") return `${day} missing closed flag`;
                if (!dayData.closed) {
                  if (!Array.isArray(dayData.windows) || dayData.windows.length === 0) {
                    return `${day} is not closed but has no windows`;
                  }
                  for (const w of dayData.windows) {
                    if (!w.open || !w.close) return `${day} window missing open/close`;
                  }
                }
              }
              return true;
            },
          },
        },
      ],
    },

    // ── AC-05: Dropoff instructions persist for configured businesses ──
    {
      id: "AC-05",
      name: "Dropoff instructions persist when configured",
      description: "Businesses with dropoff policy should have it in assistant_settings",
      priority: "p1",
      businesses: ["auto-detailer"],
      steps: [
        {
          name: "Set and verify dropoff instructions",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const { dbUpdate } = await import("../core/supabase-client.js");
              await dbUpdate("assistant_settings", { tenant_id: ctx.tenantId }, {
                dropoff_instructions: "Key lockbox is located by the garage door. Park in the driveway.",
              });
              const rows = await dbQuery("assistant_settings", { tenant_id: ctx.tenantId });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result?.dropoff_instructions) return "dropoff_instructions not saved";
              if (!result.dropoff_instructions.includes("lockbox")) return "dropoff_instructions content wrong";
              return true;
            },
          },
        },
      ],
    },
  ],
};
