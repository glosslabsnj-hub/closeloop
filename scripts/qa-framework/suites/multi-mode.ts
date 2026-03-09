/**
 * Multi-Mode Test Suite
 * Tests that non-service business modes (food, medical, sales) are properly configured.
 * Validates mode-specific settings and data structures.
 */
import type { TestSuite, TestContext } from "../core/types.js";
import { dbQuery, dbInsert } from "../core/supabase-client.js";

export const multiModeSuite: TestSuite = {
  name: "Multi-Mode Configuration",
  description: "Verify food, medical, sales, and dispatch modes are correctly configured",
  tests: [
    // ── MM-01: Food mode tenant setup ─────────────────────────────────
    {
      id: "MM-01",
      name: "Food mode tenant has correct configuration",
      description: "Food businesses should have mode=food, same-day enabled, and valid hours",
      priority: "p0",
      businesses: ["pizza-shop"],
      steps: [
        {
          name: "Verify food mode tenant",
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
              if (result.business_mode !== "food") return `Expected mode 'food', got '${result.business_mode}'`;
              if (!result.hours_json) return "Missing hours_json";
              return true;
            },
          },
        },
        {
          name: "Verify food mode settings",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("assistant_settings", { tenant_id: ctx.tenantId });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result) return "No assistant_settings for food tenant";
              if (result.same_day_enabled !== true) return "Food mode should have same_day_enabled=true";
              return true;
            },
          },
        },
      ],
    },

    // ── MM-02: Medical mode tenant setup ──────────────────────────────
    {
      id: "MM-02",
      name: "Medical mode tenant has correct configuration",
      description: "Medical businesses should have mode=medical with pending approval mode",
      priority: "p0",
      businesses: ["medical-office"],
      steps: [
        {
          name: "Verify medical mode tenant",
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
              if (result.business_mode !== "medical") return `Expected mode 'medical', got '${result.business_mode}'`;
              return true;
            },
          },
        },
        {
          name: "Verify medical mode uses pending approval",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("assistant_settings", { tenant_id: ctx.tenantId });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result) return "No assistant_settings";
              if (result.ai_booking_mode !== "pending_approval") {
                return `Medical should use pending_approval, got ${result.ai_booking_mode}`;
              }
              return true;
            },
          },
        },
        {
          name: "Verify medical services exist",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const services = await dbQuery("services", { tenant_id: ctx.tenantId, is_active: true });
              return services;
            },
          },
          expect: {
            custom: (result: any, ctx: TestContext) => {
              const services = result as any[];
              if (services.length !== ctx.businessConfig.services.length) {
                return `Expected ${ctx.businessConfig.services.length} services, got ${services.length}`;
              }
              return true;
            },
          },
        },
      ],
    },

    // ── MM-03: Sales mode tenant setup ────────────────────────────────
    {
      id: "MM-03",
      name: "Sales mode tenant has correct configuration",
      description: "Sales businesses should have mode=sales with pending approval",
      priority: "p0",
      businesses: ["car-dealership"],
      steps: [
        {
          name: "Verify sales mode tenant",
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
              if (result.business_mode !== "sales") return `Expected mode 'sales', got '${result.business_mode}'`;
              return true;
            },
          },
        },
        {
          name: "Verify sales services (quote-only types)",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const services = await dbQuery("services", { tenant_id: ctx.tenantId, is_active: true });
              return services;
            },
          },
          expect: {
            custom: (result: any) => {
              const services = result as any[];
              if (services.length === 0) return "No services configured";
              const quoteServices = services.filter((s: any) => s.price_type === "quote_only");
              if (quoteServices.length === 0) return "Sales mode should have quote_only services";
              return true;
            },
          },
        },
      ],
    },

    // ── MM-04: Dispatch mode tenant setup ─────────────────────────────
    {
      id: "MM-04",
      name: "Dispatch mode tenant has correct configuration",
      description: "Dispatch businesses should be 24/7 with zero buffer",
      priority: "p0",
      businesses: ["towing-company"],
      steps: [
        {
          name: "Verify dispatch mode and 24/7 hours",
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
              if (result.business_mode !== "dispatch") return `Expected mode 'dispatch', got '${result.business_mode}'`;
              // Verify 24/7 hours
              const hours = result.hours_json;
              if (!hours) return "Missing hours_json";
              const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
              for (const day of days) {
                if (!hours[day]) return `Missing ${day} hours`;
                if (hours[day].closed === true) return `${day} should not be closed for 24/7 dispatch`;
              }
              return true;
            },
          },
        },
        {
          name: "Verify dispatch buffer is minimal",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("tenants", { id: ctx.tenantId });
              const tenant = rows[0] as any;
              return tenant;
            },
          },
          expect: {
            custom: (result: any) => {
              if (result?.appointment_buffer_minutes > 0) {
                return `Dispatch should have 0 buffer, got ${result.appointment_buffer_minutes}`;
              }
              return true;
            },
          },
        },
      ],
    },

    // ── MM-05: All modes have valid hours format ──────────────────────
    {
      id: "MM-05",
      name: "All business modes have valid hours JSON",
      description: "Every configured business should have properly formatted hours",
      priority: "p0",
      businesses: ["*"],
      steps: [
        {
          name: "Verify hours structure",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("tenants", { id: ctx.tenantId });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result?.hours_json) return "No hours_json";
              const hours = result.hours_json;
              const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
              for (const day of days) {
                if (!(day in hours)) return `Missing ${day}`;
                const d = hours[day];
                if (typeof d.closed !== "boolean") return `${day}: missing closed flag`;
                if (!d.closed && (!Array.isArray(d.windows) || d.windows.length === 0)) {
                  return `${day}: not closed but has no windows`;
                }
              }
              return true;
            },
          },
        },
      ],
    },
  ],
};
