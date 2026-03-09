/**
 * Messaging Test Suite
 * Tests conversation creation, message persistence, and delivery settings.
 * Does NOT send real SMS — tests data integrity and configuration only.
 */
import type { TestSuite, TestContext } from "../core/types.js";
import { dbQuery, dbInsert, dbUpdate } from "../core/supabase-client.js";

export const messagingSuite: TestSuite = {
  name: "Messaging & Conversations",
  description: "Conversation creation, message persistence, and delivery configuration",
  tests: [
    // ── MSG-01: Create conversation with messages ─────────────────────
    {
      id: "MSG-01",
      name: "Conversation and messages persist correctly",
      description: "Create a conversation with inbound and outbound messages",
      priority: "p0",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Create lead for conversation",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const lead = await dbInsert("leads", {
                tenant_id: ctx.tenantId,
                full_name: "QATest MsgLead",
                phone: "+15559990070",
                source: "missed_call",
                status: "new",
              });
              ctx.createdRecords.push({ table: "leads", id: (lead as any).id });
              ctx.variables.leadId = (lead as any).id;
              return lead;
            },
          },
          expect: {},
        },
        {
          name: "Create conversation",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const convo = await dbInsert("conversations", {
                tenant_id: ctx.tenantId,
                lead_id: ctx.variables.leadId as string,
                channel: "sms",
              });
              ctx.createdRecords.push({ table: "conversations", id: (convo as any).id });
              ctx.variables.convoId = (convo as any).id;
              return convo;
            },
          },
          expect: {
            custom: (r: any) => {
              if (!r?.id) return "Conversation creation failed";
              return true;
            },
          },
        },
        {
          name: "Add inbound message",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const msg = await dbInsert("messages", {
                tenant_id: ctx.tenantId,
                conversation_id: ctx.variables.convoId as string,
                direction: "inbound",
                body: "Hi, I need an appointment for next week",
                status: "delivered",
              });
              ctx.createdRecords.push({ table: "messages", id: (msg as any).id });
              return msg;
            },
          },
          expect: {
            custom: (r: any) => {
              if (!r?.id) return "Message creation failed";
              if (r.direction !== "inbound") return `Expected direction 'inbound'`;
              return true;
            },
          },
        },
        {
          name: "Add outbound message",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const msg = await dbInsert("messages", {
                tenant_id: ctx.tenantId,
                conversation_id: ctx.variables.convoId as string,
                direction: "outbound",
                body: "Hi! We have openings next Tuesday and Wednesday. What works best?",
                status: "sent",
              });
              ctx.createdRecords.push({ table: "messages", id: (msg as any).id });
              return msg;
            },
          },
          expect: {
            custom: (r: any) => {
              if (!r?.id) return "Outbound message creation failed";
              if (r.direction !== "outbound") return `Expected direction 'outbound'`;
              return true;
            },
          },
        },
        {
          name: "Verify conversation has both messages",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const msgs = await dbQuery("messages", { conversation_id: ctx.variables.convoId as string });
              return msgs;
            },
          },
          expect: {
            custom: (result: any) => {
              const msgs = result as any[];
              if (msgs.length !== 2) return `Expected 2 messages, got ${msgs.length}`;
              const dirs = msgs.map((m: any) => m.direction);
              if (!dirs.includes("inbound")) return "Missing inbound message";
              if (!dirs.includes("outbound")) return "Missing outbound message";
              return true;
            },
          },
        },
      ],
    },

    // ── MSG-02: Missed call textback settings ─────────────────────────
    {
      id: "MSG-02",
      name: "Missed call textback is configurable",
      description: "Assistant settings should support textback enable/disable",
      priority: "p1",
      businesses: ["*"],
      modes: ["service"],
      steps: [
        {
          name: "Check textback settings exist",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const rows = await dbQuery("assistant_settings", { tenant_id: ctx.tenantId });
              return rows[0];
            },
          },
          expect: {
            custom: (r: any) => {
              if (!r) return "No assistant_settings found";
              if (typeof r.missed_call_textback_enabled !== "boolean") {
                return "missed_call_textback_enabled field missing or not boolean";
              }
              return true;
            },
          },
        },
      ],
    },

    // ── MSG-03: Message status tracking ───────────────────────────────
    {
      id: "MSG-03",
      name: "Message status updates correctly",
      description: "Message status should transition from queued to sent to delivered",
      priority: "p1",
      businesses: ["solo-hvac"],
      steps: [
        {
          name: "Create message and update status",
          action: {
            type: "custom",
            fn: async (ctx: TestContext) => {
              const lead = await dbInsert("leads", {
                tenant_id: ctx.tenantId,
                full_name: "QATest MsgStatus",
                phone: "+15559990071",
                source: "manual",
                status: "new",
              });
              ctx.createdRecords.push({ table: "leads", id: (lead as any).id });

              const convo = await dbInsert("conversations", {
                tenant_id: ctx.tenantId,
                lead_id: (lead as any).id,
                channel: "sms",
              });
              ctx.createdRecords.push({ table: "conversations", id: (convo as any).id });

              const msg = await dbInsert("messages", {
                tenant_id: ctx.tenantId,
                conversation_id: (convo as any).id,
                direction: "outbound",
                body: "QA status test",
                status: "queued",
              });
              ctx.createdRecords.push({ table: "messages", id: (msg as any).id });

              // Transition: queued → sent
              await dbUpdate("messages", { id: (msg as any).id }, { status: "sent" });
              // Transition: sent → delivered
              const delivered = await dbUpdate("messages", { id: (msg as any).id }, { status: "delivered" });

              return (delivered as any[])[0];
            },
          },
          expect: {
            custom: (r: any) => {
              if (r?.status !== "delivered") return `Expected delivered, got ${r?.status}`;
              return true;
            },
          },
        },
      ],
    },
  ],
};
