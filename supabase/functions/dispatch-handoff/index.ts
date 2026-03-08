import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuthedTenant, requireInternalSecret, serviceClient } from "../_shared/tenant.ts";
import { captureException } from "../_shared/sentry.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

interface DispatchHandoffRequest {
  dispatch_id?: string;
  tenant_id?: string;
  tenantId?: string;
  test?: boolean;
  method?: string;
  webhook_url?: string;
  webhook_secret?: string;
  notify_email?: string;
  notify_phone?: string;
  urgent_sms_phone?: string;
}

/**
 * Validate access - supports both user JWT and internal secret
 */
async function validateAccess(
  req: Request,
  requestedTenantId: string | null
): Promise<{ tenantId: string; isInternalCall: boolean }> {
  const hasAuthHeader = req.headers.get("authorization")?.startsWith("Bearer ");
  const hasInternalSecret = req.headers.get("x-closeloop-secret");

  // Try user JWT first
  if (hasAuthHeader) {
    const { tenantId } = await requireAuthedTenant(req, requestedTenantId);
    return { tenantId, isInternalCall: false };
  }

  // Fall back to internal secret for system triggers
  if (hasInternalSecret) {
    requireInternalSecret(req);
    if (!requestedTenantId) {
      throw new Error("tenant_id required for internal calls");
    }
    return { tenantId: requestedTenantId, isInternalCall: true };
  }

  throw new Error("Missing Authorization header or x-closeloop-secret");
}

async function createHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hashHex}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const body: DispatchHandoffRequest = await req.json();
    const { dispatch_id, test, method, webhook_url, webhook_secret, notify_email, notify_phone, urgent_sms_phone } = body;
    const requestedTenantId = body.tenant_id ?? body.tenantId ?? null;

    // SECURITY: Validate access (user JWT or internal secret)
    const { tenantId: tenant_id, isInternalCall } = await validateAccess(req, requestedTenantId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = serviceClient();

    // Handle test requests
    if (test) {
      const testPayload = {
        type: "dispatch",
        event: "test",
        tenant_id,
        dispatch_id: "test-dispatch-123",
        job_number: "TST-001",
        customer: {
          name: "Test Customer",
          phone: "+15551234567",
        },
        location: {
          pickup_address: "123 Test St, City, ST 12345",
          dropoff_address: "456 Sample Ave, City, ST 12345",
        },
        job_type: "Test Job",
        priority: "normal",
        urgency: "normal",
        description: "This is a test dispatch job",
        status: "pending",
        created_at: new Date().toISOString(),
      };

      if (method === "webhook" && webhook_url) {
        const payloadString = JSON.stringify(testPayload);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        
        if (webhook_secret) {
          headers["X-CloseLoop-Signature"] = await createHmacSignature(payloadString, webhook_secret);
        }

        const response = await fetch(webhook_url, {
          method: "POST",
          headers,
          body: payloadString,
        });

        if (!response.ok) {
          throw new Error(`Webhook returned ${response.status}: ${await response.text()}`);
        }

        return jsonResponse({ success: true, method: "webhook" });
      }

      if (method === "email" && notify_email) {
        await sendEmail({
          to: notify_email,
          subject: "[TEST] Flux Receptionist Dispatch Notification",
          html: `<h2>Test Dispatch Alert</h2><p>This is a test dispatch notification from Flux Receptionist.</p><pre style="background:#f5f5f5;padding:12px;border-radius:4px;">${JSON.stringify(testPayload, null, 2)}</pre>`,
        });
        return jsonResponse({ success: true, method: "email" });
      }

      if (method === "sms" && notify_phone) {
        const smsResult = await sendTenantSms({
          tenantId: tenant_id,
          to: notify_phone,
          body: `[TEST] New dispatch: Test Job at 123 Test St. This is a test.`,
        });
        if (!smsResult.success && !smsResult.skipped) {
          throw new Error(`SMS failed: ${smsResult.error}`);
        }

        return jsonResponse({ success: true, method: "sms" });
      }

      return jsonResponse({ success: true, message: "Test completed" });
    }

    // Real dispatch handoff
    if (!dispatch_id) {
      throw new Error("dispatch_id is required for non-test requests");
    }

    // SECURITY: Fetch dispatch job AND verify it belongs to the validated tenant
    const { data: dispatch, error: dispatchError } = await supabase
      .from("dispatch_jobs")
      .select(`
        *,
        customer:customers(*)
      `)
      .eq("id", dispatch_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (dispatchError || !dispatch) {
      throw new Error(`Dispatch not found or access denied`);
    }

    // Fetch delivery settings
    const { data: settings } = await supabase
      .from("dispatch_delivery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    // Fetch tenant info + assistant settings (timezone) for customer SMS
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    const { data: assistSettingsRow } = await supabase
      .from("assistant_settings")
      .select("settings_json")
      .eq("tenant_id", tenant_id)
      .maybeSingle();
    const tenantTimezone = (assistSettingsRow?.settings_json as any)?.timezone || "America/New_York";

    // Owner notification methods are gated by delivery settings;
    // critical post-dispatch actions (audit, workflow, customer SMS) always run
    const ownerMethods = settings?.enabled && Array.isArray(settings.handoff_methods)
      ? settings.handoff_methods.filter((m: string) => m !== "internal")
      : [];
    const results: Record<string, { success: boolean; error?: string }> = {};

    // Build payload
    const payload = {
      type: "dispatch",
      event: "dispatch.created",
      tenant_id,
      tenant_name: tenantData?.name,
      dispatch_id: dispatch.id,
      job_number: dispatch.job_number,
      customer: {
        name: dispatch.customer?.full_name || dispatch.customer_name || "Unknown",
        phone: dispatch.customer?.phone_e164 || dispatch.customer_phone || null,
      },
      location: {
        pickup_address: dispatch.pickup_address,
        pickup_lat: dispatch.pickup_lat,
        pickup_lng: dispatch.pickup_lng,
        dropoff_address: dispatch.dropoff_address,
        dropoff_lat: dispatch.dropoff_lat,
        dropoff_lng: dispatch.dropoff_lng,
      },
      job_type: dispatch.job_type,
      priority: dispatch.priority,
      urgency: dispatch.priority,
      description: dispatch.description,
      notes: dispatch.notes,
      status: dispatch.status,
      scheduled_at: dispatch.scheduled_at,
      requested_at: dispatch.requested_at,
      price_cents: dispatch.price_cents,
      estimated_duration_minutes: dispatch.estimated_duration_minutes,
      created_at: dispatch.created_at,
    };

    const isUrgent = dispatch.priority === "high" || dispatch.priority === "urgent" || dispatch.priority === "emergency";

    // ── CRITICAL ACTIONS (always run, regardless of delivery settings) ──

    // Record audit event for dispatch created
    try {
      await fetch(`${supabaseUrl}/functions/v1/record-audit-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseServiceKey,
        },
        body: JSON.stringify({
          tenant_id,
          event_type: dispatch.status === "confirmed" ? "dispatch.confirmed" : "dispatch.created",
          entity_type: "dispatch",
          entity_id: dispatch_id,
          actor_type: "system",
          payload: {
            job_number: dispatch.job_number,
            job_type: dispatch.job_type,
            priority: dispatch.priority,
            pickup_address: dispatch.pickup_address,
          },
          confirmation_summary: dispatch.status === "confirmed"
            ? `Dispatch #${dispatch.job_number}: ${dispatch.job_type || "Job"} at ${dispatch.pickup_address || "location pending"}`
            : undefined,
          confirmed_by: "staff",
        }),
      });
    } catch (e) {
      console.error("Failed to record dispatch audit event:", e);
    }

    // Record observation for dispatch pattern
    if (dispatch.job_type) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/record-observation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseServiceKey,
          },
          body: JSON.stringify({
            tenantId: tenant_id,
            observationType: "service_pattern",
            subjectKey: `dispatch_${dispatch.job_type.toLowerCase().replace(/\s+/g, "_").substring(0, 30)}`,
            observation: `${dispatch.job_type} dispatch created with ${dispatch.priority} priority`,
          }),
        });
      } catch (e) {
        console.error("Failed to record dispatch observation:", e);
      }
    }

    // Customer confirmation SMS (always send if we have a customer phone)
    const customerPhone = dispatch.customer?.phone_e164 || dispatch.customer_phone;
    if (customerPhone) {
      try {
        const businessName = tenantData?.name || "us";
        const jobType = dispatch.job_type || "your service request";
        const smsBody = `Thank you for calling ${businessName}! Your ${jobType} request has been received. We're assigning a driver now and will update you when they're on the way.`;

        const customerSmsResult = await sendTenantSms({
          tenantId: tenant_id,
          to: customerPhone,
          body: smsBody,
        });

        if (customerSmsResult.success) {
          results.customer_sms = { success: true };
        } else if (!customerSmsResult.skipped) {
          console.error(`[dispatch-handoff] Customer SMS failed: ${customerSmsResult.error}`);
          results.customer_sms = { success: false, error: customerSmsResult.error };
        }
      } catch (e) {
        console.error("[dispatch-handoff] Customer SMS error:", e);
        results.customer_sms = { success: false, error: e instanceof Error ? e.message : "Unknown" };
      }
    }

    // ── OWNER NOTIFICATIONS (gated by delivery settings) ──

    // Execute each enabled method
    for (const handoffMethod of ownerMethods) {
      if (handoffMethod === "internal") continue;

      try {
        if (handoffMethod === "webhook" && settings?.webhook_url) {
          const payloadString = JSON.stringify(payload);
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };

          if (settings?.webhook_secret) {
            headers["X-CloseLoop-Signature"] = await createHmacSignature(payloadString, settings.webhook_secret);
          }

          const response = await fetch(settings.webhook_url, {
            method: "POST",
            headers,
            body: payloadString,
          });

          if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}`);
          }

          results.webhook = { success: true };

          await supabase.from("handoff_attempts").insert({
            tenant_id,
            entity_type: "dispatch",
            entity_id: dispatch_id,
            method: "webhook",
            status: "success",
          });
        }

        if (handoffMethod === "email" && settings?.notify_email) {
          const customerName = payload.customer.name;
          const jobType = payload.job_type || "Job";
          const pickupAddress = payload.location.pickup_address || "Location TBD";
          const businessName = payload.tenant_name || "Your Business";

          const emailResult = await sendEmail({
            to: settings.notify_email,
            subject: `New Dispatch: ${jobType} — ${customerName}`,
            businessName,
            html: `
              <h2>New Dispatch Job</h2>
              <p><strong>Job Number:</strong> ${payload.job_number || "N/A"}</p>
              <p><strong>Customer:</strong> ${customerName}</p>
              ${payload.customer.phone ? `<p><strong>Phone:</strong> ${payload.customer.phone}</p>` : ""}
              <p><strong>Job Type:</strong> ${jobType}</p>
              <p><strong>Priority:</strong> ${payload.priority || "normal"}</p>
              <p><strong>Pickup:</strong> ${pickupAddress}</p>
              ${payload.location.dropoff_address ? `<p><strong>Dropoff:</strong> ${payload.location.dropoff_address}</p>` : ""}
              ${payload.description ? `<p><strong>Description:</strong> ${payload.description}</p>` : ""}
              ${payload.notes ? `<p><strong>Notes:</strong> ${payload.notes}</p>` : ""}
            `.trim(),
          });

          results.email = { success: emailResult.success, error: emailResult.error };

          await supabase.from("handoff_attempts").insert({
            tenant_id,
            entity_type: "dispatch",
            entity_id: dispatch_id,
            method: "email",
            status: emailResult.success ? "success" : "failed",
            error_message: emailResult.error || null,
          });
        }

        if (handoffMethod === "sms" && settings?.notify_phone) {
          const customerName = dispatch.customer?.full_name || dispatch.customer_name || "Customer";
          const jobType = dispatch.job_type || "Job";
          const location = dispatch.pickup_address || "Location TBD";

          const smsBody = `New dispatch: ${jobType} - ${customerName} at ${location}. Priority: ${dispatch.priority}`;

          const smsResult = await sendTenantSms({
            tenantId: tenant_id,
            to: settings.notify_phone,
            body: smsBody,
          });

          if (smsResult.success) {
            results.sms = { success: true };

            await supabase.from("handoff_attempts").insert({
              tenant_id,
              entity_type: "dispatch",
              entity_id: dispatch_id,
              method: "sms",
              status: "success",
            });
          } else if (smsResult.skipped) {
            console.log(`[dispatch-handoff] No verified SMS channel for tenant ${tenant_id}`);
          } else {
            throw new Error(`SMS failed: ${smsResult.error}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results[handoffMethod] = { success: false, error: errorMessage };

        await supabase.from("handoff_attempts").insert({
          tenant_id,
          entity_type: "dispatch",
          entity_id: dispatch_id,
          method: handoffMethod,
          status: "failed",
          error_message: errorMessage,
        });
      }
    }

    // Handle urgent SMS separately (gated by settings)
    if (isUrgent && settings?.urgent_sms_phone) {
      try {
        const customerName = dispatch.customer?.full_name || dispatch.customer_name || "Customer";
        const jobType = dispatch.job_type || "Job";
        const location = dispatch.pickup_address || "Location TBD";

        const urgentSmsBody = `🚨 URGENT: ${jobType} - ${customerName} at ${location}. Immediate attention required!`;

        const smsResult = await sendTenantSms({
          tenantId: tenant_id,
          to: settings.urgent_sms_phone,
          body: urgentSmsBody,
        });

        if (smsResult.success) {
          results.urgent_sms = { success: true };

          await supabase.from("handoff_attempts").insert({
            tenant_id,
            entity_type: "dispatch",
            entity_id: dispatch_id,
            method: "urgent_sms",
            status: "success",
          });
        } else if (!smsResult.skipped) {
          throw new Error(`Urgent SMS failed: ${smsResult.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.urgent_sms = { success: false, error: errorMessage };

        await supabase.from("handoff_attempts").insert({
          tenant_id,
          entity_type: "dispatch",
          entity_id: dispatch_id,
          method: "urgent_sms",
          status: "failed",
          error_message: errorMessage,
        });
      }
    }

    // Trigger workflow if any active workflow matches this event
    const eventType = dispatch.status === "confirmed" ? "dispatch.confirmed" : "dispatch.created";
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseServiceKey,
        },
        body: JSON.stringify({
          tenant_id,
          trigger: eventType,
          entity_type: "dispatch",
          entity_id: dispatch_id,
        }),
      });
      console.log(`Triggered workflow for ${eventType}:`, dispatch_id);
    } catch (e) {
      console.error("Failed to trigger workflow:", e);
    }

    return jsonResponse({ success: true, results });

  } catch (error) {
    console.error("Dispatch handoff error:", error);

    // Capture to Sentry for monitoring
    await captureException(error, {
      tags: { function: "dispatch-handoff" },
    });

    return errorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});
