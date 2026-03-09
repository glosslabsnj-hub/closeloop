/**
 * Dispatch Flow Test Suite
 * Tests dispatch job creation, status tracking, and driver assignment.
 * Runs against dispatch-mode businesses (towing).
 *
 * Note: No dedicated edge function for dispatch job creation exists yet.
 * Tests verify DB schema and data operations directly.
 */
import type { TestSuite, TestContext } from "../core/types.js";
import { dbQuery, dbInsert, dbUpdate, dbDelete } from "../core/supabase-client.js";

export const dispatchFlowSuite: TestSuite = {
  name: "Dispatch Flow",
  description: "Dispatch job lifecycle: creation, status tracking, and configuration",
  tests: [
    // ── DF-01: Create dispatch job in database ────────────────────────
    {
      id: "DF-01",
      name: "Dispatch job creation persists all fields",
      description: "Create a dispatch job and verify all fields save correctly",
      priority: "p0",
      businesses: ["*"],
      modes: ["dispatch"],
      steps: [
        {
          name: "Create dispatch job",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const job = await dbInsert("dispatch_jobs", {
                tenant_id: ctx.tenantId,
                job_number: `QA-DJ-${Date.now()}`,
                status: "pending",
                priority: "normal",
                customer_name: "QATest DispatchJob",
                customer_phone: "+15559990020",
                pickup_address: "123 Main St, Trenton, NJ 08608",
                dropoff_address: "555 Highway Blvd, Trenton, NJ 08608",
                job_type: "standard_tow",
                description: "2020 Honda Civic, Blue - flat tire",
                notes: "Keys in ignition",
              });
              ctx.createdRecords.push({ table: "dispatch_jobs", id: (job as any).id });
              ctx.variables.jobId = (job as any).id;
              return job;
            },
          },
          expect: {
            custom: (r: any) => {
              if (!r?.id) return "Dispatch job creation failed";
              if (r.status !== "pending") return `Expected pending, got ${r.status}`;
              if (r.customer_name !== "QATest DispatchJob") return "Customer name mismatch";
              if (!r.pickup_address) return "Missing pickup address";
              return true;
            },
          },
        },
      ],
    },

    // ── DF-02: Dispatch job status transitions ────────────────────────
    {
      id: "DF-02",
      name: "Dispatch job status transitions correctly",
      description: "Job should move through pending → assigned → en_route → completed",
      priority: "p0",
      businesses: ["*"],
      modes: ["dispatch"],
      steps: [
        {
          name: "Create pending job",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const job = await dbInsert("dispatch_jobs", {
                tenant_id: ctx.tenantId,
                job_number: `QA-ST-${Date.now()}`,
                status: "pending",
                priority: "high",
                customer_name: "QATest StatusTransit",
                customer_phone: "+15559990021",
                pickup_address: "456 Oak St, Trenton, NJ",
              });
              ctx.createdRecords.push({ table: "dispatch_jobs", id: (job as any).id });
              ctx.variables.jobId = (job as any).id;
              return job;
            },
          },
          expect: {
            custom: (r: any) => r?.status === "pending" ? true : `Expected pending, got ${r?.status}`,
          },
        },
        {
          name: "Assign driver",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const updated = await dbUpdate("dispatch_jobs",
                { id: ctx.variables.jobId as string },
                { status: "assigned", assigned_crew: "Dave Wilson", dispatched_at: new Date().toISOString() },
              );
              return (updated as any[])[0];
            },
          },
          expect: {
            custom: (r: any) => {
              if (r?.status !== "assigned") return `Expected assigned, got ${r?.status}`;
              if (!r?.assigned_crew) return "No crew assigned";
              return true;
            },
          },
        },
        {
          name: "Mark en route",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const updated = await dbUpdate("dispatch_jobs",
                { id: ctx.variables.jobId as string },
                { status: "en_route" },
              );
              return (updated as any[])[0];
            },
          },
          expect: {
            custom: (r: any) => r?.status === "en_route" ? true : `Expected en_route, got ${r?.status}`,
          },
        },
        {
          name: "Complete job",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const updated = await dbUpdate("dispatch_jobs",
                { id: ctx.variables.jobId as string },
                { status: "completed", completed_at: new Date().toISOString() },
              );
              return (updated as any[])[0];
            },
          },
          expect: {
            custom: (r: any) => {
              if (r?.status !== "completed") return `Expected completed, got ${r?.status}`;
              if (!r?.completed_at) return "Missing completed_at timestamp";
              return true;
            },
          },
        },
      ],
    },

    // ── DF-03: 24/7 hours for dispatch ────────────────────────────────
    {
      id: "DF-03",
      name: "Dispatch businesses have 24/7 hours",
      description: "All 7 days should be open for dispatch mode",
      priority: "p0",
      businesses: ["*"],
      modes: ["dispatch"],
      steps: [
        {
          name: "Verify 24/7 hours",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("tenants", { id: ctx.tenantId });
              return rows[0];
            },
          },
          expect: {
            custom: (result: any) => {
              const hours = result?.hours_json;
              if (!hours) return "Missing hours_json";
              const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
              for (const day of days) {
                if (hours[day]?.closed === true) return `${day} is closed — dispatch should be 24/7`;
              }
              return true;
            },
          },
        },
      ],
    },

    // ── DF-04: Dispatch priority levels ───────────────────────────────
    {
      id: "DF-04",
      name: "All priority levels accepted",
      description: "Jobs should accept low, normal, high, and urgent priorities",
      priority: "p1",
      businesses: ["towing-company"],
      steps: [
        {
          name: "Create jobs with different priorities",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const priorities = ["low", "normal", "high", "urgent"];
              const results: any[] = [];
              for (const p of priorities) {
                const job = await dbInsert("dispatch_jobs", {
                  tenant_id: ctx.tenantId,
                  job_number: `QA-PRI-${p}-${Date.now()}`,
                  status: "pending",
                  priority: p,
                  customer_name: `QATest Priority_${p}`,
                  customer_phone: "+15559990022",
                  pickup_address: "789 Test St",
                });
                ctx.createdRecords.push({ table: "dispatch_jobs", id: (job as any).id });
                results.push(job);
              }
              return results;
            },
          },
          expect: {
            custom: (result: any) => {
              const jobs = result as any[];
              if (jobs.length !== 4) return `Expected 4 jobs, got ${jobs.length}`;
              const priorities = jobs.map((j: any) => j.priority);
              for (const p of ["low", "normal", "high", "urgent"]) {
                if (!priorities.includes(p)) return `Missing priority: ${p}`;
              }
              return true;
            },
          },
        },
      ],
    },
  ],
};
