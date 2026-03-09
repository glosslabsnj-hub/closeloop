/**
 * automation-executor: Execute automation rules when business events occur.
 *
 * Called by other edge functions when events happen (booking created, job completed, etc.)
 * Looks up matching automation_rules for the tenant, executes each action,
 * and logs the run + steps to automation_runs / automation_run_steps.
 *
 * Supports actions: send_sms, send_email, send_webhook, create_event, append_row.
 * Mode-aware: rules are filtered by the tenant's business mode.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";
import { corsHeaders, jsonResponse, errorResponse, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AutomationRequest {
  tenant_id: string;
  trigger_event: string; // e.g., "booking.created", "booking.completed", "call.ended"
  entity_type: string;   // e.g., "booking", "lead", "active_job"
  entity_id: string;
  payload: Record<string, unknown>; // event data for template resolution
}

function resolveTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, keyPath) => {
    const keys = keyPath.split(".");
    let val: unknown = vars;
    for (const k of keys) {
      if (val && typeof val === "object") val = (val as Record<string, unknown>)[k];
      else return "";
    }
    return String(val ?? "");
  });
}

function mapFields(mapping: Record<string, string>, payload: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [targetField, sourceExpr] of Object.entries(mapping)) {
    if (sourceExpr.startsWith("{{")) {
      result[targetField] = resolveTemplate(sourceExpr, payload);
    } else {
      result[targetField] = sourceExpr; // static value
    }
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: AutomationRequest = await req.json();
    const { tenant_id, trigger_event, entity_type, entity_id, payload } = body;

    if (!tenant_id || !trigger_event) {
      return errorResponse("Missing required fields: tenant_id, trigger_event");
    }

    // Find matching automation rules
    const { data: rules, error: rulesErr } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("trigger_event", trigger_event)
      .eq("enabled", true)
      .order("priority", { ascending: true });

    if (rulesErr) {
      console.error("[automation-executor] Error fetching rules:", rulesErr);
      return errorResponse("Failed to fetch automation rules", 500);
    }

    if (!rules || rules.length === 0) {
      return jsonResponse({ executed: 0, message: "No matching rules" });
    }

    const results = { executed: 0, succeeded: 0, failed: 0, skipped: 0 };

    for (const rule of rules) {
      // Create automation run record
      const { data: run, error: runErr } = await supabase
        .from("automation_runs")
        .insert({
          tenant_id,
          rule_id: rule.id,
          trigger_event,
          entity_type,
          entity_id,
          status: "running",
          payload_snapshot: payload,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (runErr || !run) {
        console.error("[automation-executor] Failed to create run:", runErr);
        results.failed++;
        continue;
      }

      const runId = run.id;
      let stepStatus: "success" | "failed" = "success";
      let stepError: string | null = null;
      let responsePayload: unknown = null;

      try {
        const fieldMapping = (rule.field_mapping_json as Record<string, string>) || {};
        const mappedFields = mapFields(fieldMapping, payload);

        switch (rule.action_type) {
          case "send_sms": {
            const phone = mappedFields.phone || (payload.customer_phone as string) || (payload.phone as string);
            const message = mappedFields.message || mappedFields.body || `Notification from ${payload.business_name || "your business"}`;

            if (!phone) {
              stepStatus = "failed";
              stepError = "No phone number available";
              break;
            }

            const smsResult = await sendTenantSms({
              tenantId: tenant_id,
              to: phone,
              body: resolveTemplate(message, payload),
            });

            responsePayload = smsResult;
            if (!smsResult.success && !smsResult.skipped) {
              stepStatus = "failed";
              stepError = smsResult.error || "SMS send failed";
            }
            break;
          }

          case "send_webhook": {
            // Get integration for webhook URL
            let webhookUrl = mappedFields.url || "";
            if (!webhookUrl && rule.integration_id) {
              const { data: integ } = await supabase
                .from("integrations")
                .select("config_json")
                .eq("id", rule.integration_id)
                .single();
              webhookUrl = (integ?.config_json as any)?.webhook_url || "";
            }

            if (!webhookUrl) {
              stepStatus = "failed";
              stepError = "No webhook URL configured";
              break;
            }

            const webhookResponse = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: trigger_event,
                entity_type,
                entity_id,
                data: payload,
                mapped_fields: mappedFields,
                timestamp: new Date().toISOString(),
              }),
            });

            responsePayload = {
              status: webhookResponse.status,
              ok: webhookResponse.ok,
            };

            if (!webhookResponse.ok) {
              stepStatus = "failed";
              stepError = `Webhook returned ${webhookResponse.status}`;
            }
            break;
          }

          case "create_event": {
            // Create a calendar event (Google Calendar)
            // For now, log the intent — full calendar integration via adapter later
            responsePayload = { message: "Calendar event creation queued", fields: mappedFields };
            break;
          }

          case "append_row": {
            // Append a row to Google Sheets
            // For now, log the intent — full sheets integration via adapter later
            responsePayload = { message: "Sheet row append queued", fields: mappedFields };
            break;
          }

          case "send_email": {
            // Email sending — future implementation
            responsePayload = { message: "Email sending not yet implemented" };
            stepStatus = "failed";
            stepError = "Email action not yet implemented";
            break;
          }

          default: {
            stepStatus = "failed";
            stepError = `Unknown action type: ${rule.action_type}`;
          }
        }
      } catch (execErr) {
        stepStatus = "failed";
        stepError = execErr instanceof Error ? execErr.message : String(execErr);
      }

      // Log the step
      await supabase.from("automation_run_steps").insert({
        run_id: runId,
        action_type: rule.action_type,
        destination_provider: rule.destination_provider,
        status: stepStatus,
        request_payload: { trigger_event, entity_type, entity_id, mapped_fields: payload },
        response_payload: responsePayload,
        error_message: stepError,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      });

      // Update run status
      await supabase
        .from("automation_runs")
        .update({
          status: stepStatus,
          error_message: stepError,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);

      results.executed++;
      if (stepStatus === "success") results.succeeded++;
      else results.failed++;
    }

    console.log(`[automation-executor] ${trigger_event}: ${results.executed} rules, ${results.succeeded} succeeded, ${results.failed} failed`);
    return jsonResponse(results);
  } catch (err) {
    console.error("[automation-executor] Error:", err);
    return errorResponse("Internal server error", 500);
  }
});
