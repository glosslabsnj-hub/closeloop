/**
 * Agreements Test Suite
 * Tests service agreement creation, field persistence, and visit tracking.
 * Validates the schema fix (7 missing columns added).
 */
import type { TestSuite, TestContext } from "../core/types.js";
import { dbInsert, dbQuery, dbUpdate } from "../core/supabase-client.js";

export const agreementsSuite: TestSuite = {
  name: "Service Agreements",
  description: "Agreement creation, field persistence, visits tracking, and schema integrity",
  tests: [
    // ── AG-01: Create agreement with all fields ─────────────────────
    {
      id: "AG-01",
      name: "All agreement fields persist correctly",
      description: "Create agreement with all 7 previously-missing columns and verify they save",
      priority: "p0",
      businesses: ["solo-hvac", "team-plumbing"],
      steps: [
        {
          name: "Create customer for agreement",
          action: {
            type: "insert_db",
            table: "customers",
            data: {
              tenant_id: "$tenantId",
              full_name: "QATest AgreementCustomer",
              phone_e164: "+15559990010",
              email: "qa-agreement@test.com",
            },
          },
          expect: {},
        },
        {
          name: "Create agreement with all fields",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const customer = ctx.variables["step_Create customer for agreement"] as any;
              const agreement = await dbInsert("service_agreements", {
                tenant_id: ctx.tenantId,
                customer_id: customer.id,
                agreement_number: `QA-${Date.now()}`,
                plan_name: "QATest Annual Maintenance Plan",
                plan_type: "standard",
                description: "Two visits per year: spring AC tune-up + fall furnace inspection",
                price_cents: 19900,
                billing_frequency: "annual",
                start_date: "2026-01-01",
                end_date: "2026-12-31",
                auto_renew: true,
                status: "active",
                // Previously missing columns (now fixed):
                visits_per_year: 2,
                visits_used: 0,
                priority_service: true,
                internal_notes: "VIP customer - always prioritize",
                customer_notes: "Prefers morning appointments, has two dogs",
                terms: "Service includes full system inspection, filter replacement, and performance report.",
                next_service_date: "2026-04-15",
                priority_scheduling: true,
                discount_percent: 10,
              });
              ctx.createdRecords.push({ table: "service_agreements", id: agreement.id });
              ctx.variables.agreementId = agreement.id;
              return agreement;
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result?.id) return "Agreement creation failed";
              return true;
            },
          },
        },
        {
          name: "Verify all fields persisted",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("service_agreements", { id: ctx.variables.agreementId as string });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result) return "Agreement not found in database";
              const checks = [
                ["visits_per_year", 2],
                ["visits_used", 0],
                ["priority_service", true],
                ["internal_notes", "VIP customer - always prioritize"],
                ["customer_notes", "Prefers morning appointments, has two dogs"],
                ["terms", "Service includes full system inspection, filter replacement, and performance report."],
                ["next_service_date", "2026-04-15"],
                ["discount_percent", 10],
              ];
              for (const [field, expected] of checks) {
                if (result[field as string] !== expected) {
                  return `${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(result[field as string])}`;
                }
              }
              return true;
            },
          },
        },
      ],
    },

    // ── AG-02: Visit tracking ───────────────────────────────────────
    {
      id: "AG-02",
      name: "Visit tracking increments correctly",
      description: "Updating visits_used should persist and reflect correct count",
      priority: "p1",
      businesses: ["solo-hvac"],
      steps: [
        {
          name: "Create agreement with 4 visits",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const customer = await dbInsert("customers", {
                tenant_id: ctx.tenantId,
                full_name: "QATest VisitTracker",
                phone_e164: "+15559990011",
              });
              ctx.createdRecords.push({ table: "customers", id: customer.id });

              const agreement = await dbInsert("service_agreements", {
                tenant_id: ctx.tenantId,
                customer_id: customer.id,
                agreement_number: `QA-V-${Date.now()}`,
                plan_name: "QATest Quarterly Plan",
                price_cents: 39900,
                billing_frequency: "annual",
                start_date: "2026-01-01",
                end_date: "2026-12-31",
                status: "active",
                visits_per_year: 4,
                visits_used: 0,
              });
              ctx.createdRecords.push({ table: "service_agreements", id: agreement.id });
              ctx.variables.agreementId = agreement.id;
              return agreement;
            },
          },
          expect: {},
        },
        {
          name: "Record first visit",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              return dbUpdate(
                "service_agreements",
                { id: ctx.variables.agreementId as string },
                { visits_used: 1, next_service_date: "2026-07-15" },
              );
            },
          },
          expect: {},
        },
        {
          name: "Verify visit count updated",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("service_agreements", { id: ctx.variables.agreementId as string });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (result?.visits_used !== 1) return `visits_used: expected 1, got ${result?.visits_used}`;
              if (result?.next_service_date !== "2026-07-15") return `next_service_date: expected 2026-07-15, got ${result?.next_service_date}`;
              return true;
            },
          },
        },
      ],
    },
  ],
};
