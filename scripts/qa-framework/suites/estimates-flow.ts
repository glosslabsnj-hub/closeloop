/**
 * Estimates Flow Test Suite
 * Tests estimate creation, field persistence, and status transitions.
 * Targets businesses with estimate/consultation booking types.
 */
import type { TestSuite, TestContext } from "../core/types.js";
import { dbQuery, dbInsert, dbUpdate } from "../core/supabase-client.js";

export const estimatesFlowSuite: TestSuite = {
  name: "Estimates Flow",
  description: "Estimate creation, field persistence, status tracking, and line items",
  tests: [
    // ── ES-01: Create estimate with all fields ────────────────────────
    {
      id: "ES-01",
      name: "Estimate creation persists all fields",
      description: "Create an estimate and verify all fields save correctly",
      priority: "p0",
      businesses: ["general-contractor", "solo-hvac"],
      steps: [
        {
          name: "Create customer for estimate",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const customer = await dbInsert("customers", {
                tenant_id: ctx.tenantId,
                full_name: "QATest EstimateCustomer",
                phone_e164: "+15559990060",
                email: "qa-estimate@test.com",
              });
              ctx.createdRecords.push({ table: "customers", id: (customer as any).id });
              ctx.variables.customerId = (customer as any).id;
              return customer;
            },
          },
          expect: {},
        },
        {
          name: "Create estimate",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const estimate = await dbInsert("estimates", {
                tenant_id: ctx.tenantId,
                customer_id: ctx.variables.customerId as string,
                estimate_number: `QA-EST-${Date.now()}`,
                title: "QATest Kitchen Remodel Estimate",
                line_items: JSON.stringify([
                  { description: "Demolition", qty: 1, unit_price_cents: 500000 },
                  { description: "Cabinets", qty: 1, unit_price_cents: 1200000 },
                  { description: "Countertops", qty: 1, unit_price_cents: 800000 },
                ]),
                subtotal_cents: 2500000,
                total_cents: 2500000,
                status: "draft",
                valid_until: "2026-06-01",
                internal_notes: "Includes demolition and disposal. Does not include appliances.",
              });
              ctx.createdRecords.push({ table: "estimates", id: (estimate as any).id });
              ctx.variables.estimateId = (estimate as any).id;
              return estimate;
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result?.id) return "Estimate creation failed";
              if (result.status !== "draft") return `Expected draft status, got ${result.status}`;
              if (result.total_cents !== 2500000) return `Total: expected 2500000, got ${result.total_cents}`;
              return true;
            },
          },
        },
        {
          name: "Verify estimate in database",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("estimates", { id: ctx.variables.estimateId as string });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result) return "Estimate not found in database";
              if (result.title !== "QATest Kitchen Remodel Estimate") return "Title mismatch";
              if (result.total_cents !== 2500000) return "Total mismatch";
              return true;
            },
          },
        },
      ],
    },

    // ── ES-02: Estimate status transitions ────────────────────────────
    {
      id: "ES-02",
      name: "Estimate status transitions work correctly",
      description: "Estimate should move through draft → sent → accepted/declined",
      priority: "p0",
      businesses: ["general-contractor"],
      steps: [
        {
          name: "Create draft estimate",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const customer = await dbInsert("customers", {
                tenant_id: ctx.tenantId,
                full_name: "QATest StatusTransition",
                phone_e164: "+15559990061",
              });
              ctx.createdRecords.push({ table: "customers", id: (customer as any).id });

              const estimate = await dbInsert("estimates", {
                tenant_id: ctx.tenantId,
                customer_id: (customer as any).id,
                estimate_number: `QA-ST-${Date.now()}`,
                title: "QATest Status Test",
                total_cents: 500000,
                status: "draft",
              });
              ctx.createdRecords.push({ table: "estimates", id: (estimate as any).id });
              ctx.variables.estimateId = (estimate as any).id;
              return estimate;
            },
          },
          expect: {
            custom: (r: any) => r?.status === "draft" ? true : `Expected draft, got ${r?.status}`,
          },
        },
        {
          name: "Transition to sent",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const updated = await dbUpdate("estimates",
                { id: ctx.variables.estimateId as string },
                { status: "sent", sent_at: new Date().toISOString() },
              );
              return (updated as any[])[0];
            },
          },
          expect: {
            custom: (r: any) => r?.status === "sent" ? true : `Expected sent, got ${r?.status}`,
          },
        },
        {
          name: "Transition to accepted",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const updated = await dbUpdate("estimates",
                { id: ctx.variables.estimateId as string },
                { status: "accepted" },
              );
              return (updated as any[])[0];
            },
          },
          expect: {
            custom: (r: any) => r?.status === "accepted" ? true : `Expected accepted, got ${r?.status}`,
          },
        },
      ],
    },

    // ── ES-03: Estimate-type services configured ──────────────────────
    {
      id: "ES-03",
      name: "Estimate/consultation services configured properly",
      description: "Services with booking_type estimate_first or consultation should exist",
      priority: "p1",
      businesses: ["general-contractor"],
      steps: [
        {
          name: "Verify estimate-type services exist",
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
              const estimateServices = services.filter((s: any) =>
                s.booking_type === "estimate_first" || s.booking_type === "consultation"
              );
              if (estimateServices.length === 0) return "No estimate/consultation services found";
              return true;
            },
          },
        },
      ],
    },
  ],
};
