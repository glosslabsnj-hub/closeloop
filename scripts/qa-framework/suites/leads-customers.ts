/**
 * Leads & Customers Test Suite
 * Tests lead creation, customer management, and pipeline operations.
 * Runs against all business types.
 */
import type { TestSuite, TestContext } from "../core/types.js";
import { dbQuery, dbInsert, dbUpdate, dbDelete } from "../core/supabase-client.js";

export const leadsCustomersSuite: TestSuite = {
  name: "Leads & Customers",
  description: "Lead creation, customer management, pipeline operations, and data integrity",
  tests: [
    // ── LC-01: Create customer with all fields ────────────────────────
    {
      id: "LC-01",
      name: "Customer creation persists all fields",
      description: "Create a customer with name, phone, email and verify persistence",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Create customer",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const customer = await dbInsert("customers", {
                tenant_id: ctx.tenantId,
                full_name: "QATest John Smith",
                phone_e164: "+15559990030",
                email: "qa-john@test.com",
                source: "manual",
                notes: "QA test customer",
              });
              ctx.createdRecords.push({ table: "customers", id: (customer as any).id });
              return customer;
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result?.id) return "Customer creation failed";
              if (result.full_name !== "QATest John Smith") return `Name: expected 'QATest John Smith', got '${result.full_name}'`;
              if (result.phone_e164 !== "+15559990030") return `Phone: expected '+15559990030', got '${result.phone_e164}'`;
              if (result.email !== "qa-john@test.com") return `Email mismatch`;
              return true;
            },
          },
        },
      ],
    },

    // ── LC-02: Phone uniqueness per tenant ────────────────────────────
    {
      id: "LC-02",
      name: "Customer phone is unique per tenant",
      description: "Inserting duplicate phone for same tenant should fail",
      priority: "p0",
      businesses: ["solo-hvac"],
      steps: [
        {
          name: "Create first customer",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const c = await dbInsert("customers", {
                tenant_id: ctx.tenantId,
                full_name: "QATest UniquePhone1",
                phone_e164: "+15559990031",
              });
              ctx.createdRecords.push({ table: "customers", id: (c as any).id });
              return c;
            },
          },
          expect: {},
        },
        {
          name: "Attempt duplicate phone",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              try {
                await dbInsert("customers", {
                  tenant_id: ctx.tenantId,
                  full_name: "QATest UniquePhone2",
                  phone_e164: "+15559990031",
                });
                return { duplicate_allowed: true };
              } catch (e: any) {
                return { duplicate_allowed: false, error: e.message };
              }
            },
          },
          expect: {
            custom: (result: any) => {
              if (result?.duplicate_allowed === true) return "CRITICAL: Duplicate phone was allowed (unique constraint missing!)";
              return true;
            },
          },
        },
      ],
    },

    // ── LC-03: Create lead with required fields ───────────────────────
    {
      id: "LC-03",
      name: "Lead creation with all statuses",
      description: "Create leads and verify status field accepts valid values",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Create new lead",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const lead = await dbInsert("leads", {
                tenant_id: ctx.tenantId,
                full_name: "QATest LeadCreation",
                phone: "+15559990032",
                source: "missed_call",
                status: "new",
              });
              ctx.createdRecords.push({ table: "leads", id: (lead as any).id });
              ctx.variables.leadId = (lead as any).id;
              return lead;
            },
          },
          expect: {
            custom: (result: any) => {
              if (!result?.id) return "Lead creation failed";
              if (result.status !== "new") return `Expected status 'new', got '${result.status}'`;
              return true;
            },
          },
        },
        {
          name: "Update lead to contacted",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const updated = await dbUpdate("leads", { id: ctx.variables.leadId as string }, { status: "contacted" });
              return (updated as any[])[0];
            },
          },
          expect: {
            custom: (result: any) => {
              if (result?.status !== "contacted") return `Expected 'contacted', got '${result?.status}'`;
              return true;
            },
          },
        },
      ],
    },

    // ── LC-04: Lead sources ───────────────────────────────────────────
    {
      id: "LC-04",
      name: "Lead sources persist correctly",
      description: "All lead source types should be accepted",
      priority: "p1",
      businesses: ["solo-hvac"],
      steps: [
        {
          name: "Create leads with different sources",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const sources = ["missed_call", "manual", "ai_call"];
              const results: any[] = [];
              for (const source of sources) {
                const lead = await dbInsert("leads", {
                  tenant_id: ctx.tenantId,
                  full_name: `QATest Source_${source}`,
                  phone: `+1555999${String(40 + sources.indexOf(source)).padStart(4, "0")}`,
                  source,
                  status: "new",
                });
                ctx.createdRecords.push({ table: "leads", id: (lead as any).id });
                results.push(lead);
              }
              return results;
            },
          },
          expect: {
            custom: (result: any) => {
              const leads = result as any[];
              if (leads.length !== 3) return `Expected 3 leads, got ${leads.length}`;
              const sources = leads.map(l => l.source);
              if (!sources.includes("missed_call")) return "Missing missed_call source";
              if (!sources.includes("manual")) return "Missing manual source";
              if (!sources.includes("ai_call")) return "Missing ai_call source";
              return true;
            },
          },
        },
      ],
    },

    // ── LC-05: Customer-lead relationship ─────────────────────────────
    {
      id: "LC-05",
      name: "Customer and lead can be linked",
      description: "A lead should be linkable to a customer record",
      priority: "p1",
      businesses: ["solo-hvac"],
      steps: [
        {
          name: "Create customer then lead with customer_id",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const customer = await dbInsert("customers", {
                tenant_id: ctx.tenantId,
                full_name: "QATest LinkedCustomer",
                phone_e164: "+15559990050",
              });
              ctx.createdRecords.push({ table: "customers", id: (customer as any).id });

              const lead = await dbInsert("leads", {
                tenant_id: ctx.tenantId,
                full_name: "QATest LinkedLead",
                phone: "+15559990050",
                source: "ai_call",
                status: "new",
                customer_id: (customer as any).id,
              });
              ctx.createdRecords.push({ table: "leads", id: (lead as any).id });

              return { customer, lead };
            },
          },
          expect: {
            custom: (result: any) => {
              const { customer, lead } = result;
              if (!customer?.id || !lead?.id) return "Failed to create customer or lead";
              if (lead.customer_id !== customer.id) return "Lead not linked to customer";
              return true;
            },
          },
        },
      ],
    },
  ],
};
