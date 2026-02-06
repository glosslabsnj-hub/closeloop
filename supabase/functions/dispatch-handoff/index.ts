import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { captureException } from "../_shared/sentry.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";

interface DispatchHandoffRequest {
  dispatch_id?: string;
  tenant_id: string;
  test?: boolean;
  method?: string;
  webhook_url?: string;
  webhook_secret?: string;
  notify_email?: string;
  notify_phone?: string;
  urgent_sms_phone?: string;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: DispatchHandoffRequest = await req.json();
    const { dispatch_id, tenant_id, test, method, webhook_url, webhook_secret, notify_email, notify_phone, urgent_sms_phone } = body;

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
        console.log(`[TEST] Would send email to ${notify_email}:`, testPayload);
        return jsonResponse({ success: true, method: "email", message: "Email test logged" });
      }

      if (method === "sms" && notify_phone) {
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
        
        if (twilioSid && twilioAuth) {
          const { data: phoneNumber } = await supabase
            .from("phone_numbers")
            .select("phone_e164")
            .eq("tenant_id", tenant_id)
            .eq("purpose", "forwarding")
            .single();

          const fromNumber = phoneNumber?.phone_e164 || Deno.env.get("DEFAULT_TWILIO_NUMBER");
          
          if (fromNumber) {
            const smsBody = `[TEST] New dispatch: Test Job at 123 Test St. This is a test.`;
            
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const smsResponse = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: notify_phone,
                From: fromNumber,
                Body: smsBody,
              }),
            });

            if (!smsResponse.ok) {
              throw new Error(`SMS failed: ${await smsResponse.text()}`);
            }
          }
        }
        
        return jsonResponse({ success: true, method: "sms" });
      }

      return jsonResponse({ success: true, message: "Test completed" });
    }

    // Real dispatch handoff
    if (!dispatch_id) {
      throw new Error("dispatch_id is required for non-test requests");
    }

    // Fetch dispatch job with related data
    const { data: dispatch, error: dispatchError } = await supabase
      .from("dispatch_jobs")
      .select(`
        *,
        customer:customers(*)
      `)
      .eq("id", dispatch_id)
      .single();

    if (dispatchError || !dispatch) {
      throw new Error(`Dispatch not found: ${dispatchError?.message}`);
    }

    // Fetch delivery settings
    const { data: settings } = await supabase
      .from("dispatch_delivery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (!settings?.enabled) {
      return jsonResponse({ success: true, message: "Handoff disabled" });
    }

    // Fetch tenant info
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    const methods = Array.isArray(settings.handoff_methods) ? settings.handoff_methods : ["internal"];
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

    const isUrgent = dispatch.priority === "high" || dispatch.priority === "urgent";

    // Record audit event for dispatch created
    try {
      await fetch(`${supabaseUrl}/functions/v1/record-audit-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
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
            "Authorization": `Bearer ${supabaseServiceKey}`,
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

    // Execute each enabled method
    for (const handoffMethod of methods) {
      if (handoffMethod === "internal") continue;

      try {
        if (handoffMethod === "webhook" && settings.webhook_url) {
          const payloadString = JSON.stringify(payload);
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          
          if (settings.webhook_secret) {
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

        if (handoffMethod === "email" && settings.notify_email) {
          console.log(`Sending dispatch email to ${settings.notify_email}`);
          results.email = { success: true };

          await supabase.from("handoff_attempts").insert({
            tenant_id,
            entity_type: "dispatch",
            entity_id: dispatch_id,
            method: "email",
            status: "success",
          });
        }

        if (handoffMethod === "sms" && settings.notify_phone) {
          const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
          const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
          
          if (twilioSid && twilioAuth) {
            const { data: phoneNumber } = await supabase
              .from("phone_numbers")
              .select("phone_e164")
              .eq("tenant_id", tenant_id)
              .eq("purpose", "forwarding")
              .single();

            const fromNumber = phoneNumber?.phone_e164;
            
            if (fromNumber) {
              const customerName = dispatch.customer?.full_name || dispatch.customer_name || "Customer";
              const jobType = dispatch.job_type || "Job";
              const location = dispatch.pickup_address || "Location TBD";
              
              const smsBody = `New dispatch: ${jobType} - ${customerName} at ${location}. Priority: ${dispatch.priority}`;
              
              const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
              const smsResponse = await fetch(twilioUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  To: settings.notify_phone,
                  From: fromNumber,
                  Body: smsBody,
                }),
              });

              if (!smsResponse.ok) {
                throw new Error(`SMS failed: ${await smsResponse.text()}`);
              }

              results.sms = { success: true };

              await supabase.from("handoff_attempts").insert({
                tenant_id,
                entity_type: "dispatch",
                entity_id: dispatch_id,
                method: "sms",
                status: "success",
              });
            }
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

    // Handle urgent SMS separately
    if (isUrgent && settings.urgent_sms_phone) {
      try {
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
        
        if (twilioSid && twilioAuth) {
          const { data: phoneNumber } = await supabase
            .from("phone_numbers")
            .select("phone_e164")
            .eq("tenant_id", tenant_id)
            .eq("purpose", "forwarding")
            .single();

          const fromNumber = phoneNumber?.phone_e164;
          
          if (fromNumber) {
            const customerName = dispatch.customer?.full_name || dispatch.customer_name || "Customer";
            const jobType = dispatch.job_type || "Job";
            const location = dispatch.pickup_address || "Location TBD";
            
            const urgentSmsBody = `🚨 URGENT: ${jobType} - ${customerName} at ${location}. Immediate attention required!`;
            
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const smsResponse = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: settings.urgent_sms_phone,
                From: fromNumber,
                Body: urgentSmsBody,
              }),
            });

            if (smsResponse.ok) {
              results.urgent_sms = { success: true };

              await supabase.from("handoff_attempts").insert({
                tenant_id,
                entity_type: "dispatch",
                entity_id: dispatch_id,
                method: "urgent_sms",
                status: "success",
              });
            }
          }
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
          "Authorization": `Bearer ${supabaseServiceKey}`,
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
