import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuthedTenant, requireInternalSecret } from "../_shared/tenant.ts";
import { captureException } from "../_shared/sentry.ts";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

interface OrderItem {
  name: string;
  qty: number;
  base_price?: number;
  modifiers?: string[];
  item_notes?: string;
}

interface Order {
  id: string;
  tenant_id: string;
  order_number: string;
  order_type: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  address_json: unknown;
  items_json: OrderItem[];
  special_instructions: string | null;
  requested_time: string | null;
  total_cents: number | null;
  created_at: string;
}

interface DeliverySettings {
  enabled: boolean;
  handoff_methods: string[];
  webhook_url: string | null;
  webhook_secret: string | null;
  notify_email: string | null;
  notify_phone: string | null;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const body = await req.json();
    const { order_id, methods, test, method, webhook_url, webhook_secret, notify_email, notify_phone } = body;
    const requestedTenantId = body.tenant_id ?? body.tenantId ?? null;

    // SECURITY: Validate access (user JWT or internal secret)
    const { tenantId: tenant_id } = await validateAccess(req, requestedTenantId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle test mode
    if (test && method) {
      const testResult = await runTestHandoff(method, {
        webhook_url,
        webhook_secret,
        notify_email,
        notify_phone,
        tenant_id,
      }, supabase);
      return jsonResponse(testResult);
    }

    if (!order_id || !tenant_id) {
      throw new Error("order_id and tenant_id are required");
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("food_orders")
      .select("*")
      .eq("id", order_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // Fetch delivery settings
    const { data: settings } = await supabase
      .from("order_delivery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (!settings?.enabled) {
      console.log("Order handoff disabled for tenant");
      return jsonResponse({ status: "skipped", reason: "handoff disabled" });
    }

    // Determine which methods to run
    const methodsToRun = methods || settings.handoff_methods || ["internal"];
    const results: Record<string, { success: boolean; error?: string }> = {};

    // Fetch tenant name for display
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    const businessName = tenant?.name || "Restaurant";

    // Record observation for order pattern
    try {
      const orderHour = new Date(order.created_at).getHours();
      await fetch(`${supabaseUrl}/functions/v1/record-observation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenantId: tenant_id,
          observationType: "time_pattern",
          subjectKey: `order_hour_${orderHour}`,
          observation: `${order.order_type} order placed at ${orderHour}:00`,
        }),
      });
    } catch (e) {
      console.error("Failed to record order time observation:", e);
    }

    // Run each enabled method
    for (const handoffMethod of methodsToRun) {
      if (handoffMethod === "internal") {
        // Internal queue is just the database - always succeeds
        results.internal = { success: true };
        await logHandoffAttempt(supabase, tenant_id, order_id, "internal", "success");
        continue;
      }

      if (handoffMethod === "webhook" && settings.webhook_url) {
        try {
          await sendWebhook(order as Order, settings, businessName);
          results.webhook = { success: true };
          await logHandoffAttempt(supabase, tenant_id, order_id, "webhook", "success");
        } catch (e) {
          const error = e instanceof Error ? e.message : "Unknown error";
          results.webhook = { success: false, error };
          await logHandoffAttempt(supabase, tenant_id, order_id, "webhook", "failed", error);
        }
      }

      if (handoffMethod === "email" && settings.notify_email) {
        try {
          const items = Array.isArray(order.items_json)
            ? order.items_json.map((i: OrderItem) => `${i.qty}x ${i.name}`).join(", ")
            : "items";
          const totalStr = order.total_cents ? `$${(order.total_cents / 100).toFixed(2)}` : "N/A";

          const emailResult = await sendEmail({
            to: settings.notify_email,
            subject: `New Order #${order.order_number} — ${order.order_type.toUpperCase()}`,
            businessName,
            html: `
              <h2>New Order #${order.order_number}</h2>
              <p><strong>Type:</strong> ${order.order_type.toUpperCase()}</p>
              <p><strong>Customer:</strong> ${order.customer_name || "Unknown"}</p>
              ${order.customer_phone ? `<p><strong>Phone:</strong> ${order.customer_phone}</p>` : ""}
              <p><strong>Items:</strong> ${items}</p>
              <p><strong>Total:</strong> ${totalStr}</p>
              ${order.special_instructions ? `<p><strong>Special Instructions:</strong> ${order.special_instructions}</p>` : ""}
              ${order.delivery_address ? `<p><strong>Delivery Address:</strong> ${order.delivery_address}</p>` : ""}
              ${order.requested_time ? `<p><strong>Requested Time:</strong> ${order.requested_time}</p>` : ""}
            `.trim(),
          });

          results.email = { success: emailResult.success, error: emailResult.error };
          await logHandoffAttempt(supabase, tenant_id, order_id, "email", emailResult.success ? "success" : "failed", emailResult.error);
        } catch (e) {
          const error = e instanceof Error ? e.message : "Unknown error";
          results.email = { success: false, error };
          await logHandoffAttempt(supabase, tenant_id, order_id, "email", "failed", error);
        }
      }

      if (handoffMethod === "sms" && settings.notify_phone) {
        try {
          const items = Array.isArray(order.items_json)
            ? (order.items_json as OrderItem[]).map((i) => `${i.qty}x ${i.name}`).join(", ")
            : "items";

          let message = `NEW ORDER #${order.order_number}\n`;
          message += `Type: ${order.order_type.toUpperCase()}\n`;
          message += `Customer: ${order.customer_name || "Unknown"}\n`;
          message += `Items: ${items.substring(0, 100)}${items.length > 100 ? "..." : ""}\n`;
          if (order.total_cents) {
            message += `Total: $${(order.total_cents / 100).toFixed(2)}\n`;
          }
          if (order.special_instructions) {
            const truncated = order.special_instructions.substring(0, 50);
            message += `NOTE: ${truncated}${order.special_instructions.length > 50 ? "..." : ""}\n`;
          }

          const smsResult = await sendTenantSms({
            tenantId: tenant_id,
            to: settings.notify_phone,
            body: message,
          });

          if (smsResult.success) {
            results.sms = { success: true };
            await logHandoffAttempt(supabase, tenant_id, order_id, "sms", "success");
          } else if (smsResult.skipped) {
            console.log(`[order-handoff] No verified SMS channel for tenant ${tenant_id}`);
            results.sms = { success: false, error: "No verified SMS channel" };
            await logHandoffAttempt(supabase, tenant_id, order_id, "sms", "skipped", "No verified SMS channel");
          } else {
            throw new Error(`SMS failed: ${smsResult.error}`);
          }
        } catch (e) {
          const error = e instanceof Error ? e.message : "Unknown error";
          results.sms = { success: false, error };
          await logHandoffAttempt(supabase, tenant_id, order_id, "sms", "failed", error);
        }
      }

      if (handoffMethod === "print") {
        // Print is handled client-side - just mark as pending
        results.print = { success: true };
        await logHandoffAttempt(supabase, tenant_id, order_id, "print", "pending");
      }
    }

    // Update order handoff_state
    await supabase
      .from("food_orders")
      .update({
        handoff_state: {
          last_run: new Date().toISOString(),
          results,
        },
      })
      .eq("id", order_id);

    // Trigger workflow if any active workflow matches this event
    const eventType = order.status === "confirmed" ? "order.confirmed" : "order.created";
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenant_id,
          trigger: eventType,
          entity_type: "order",
          entity_id: order_id,
        }),
      });
      console.log(`Triggered workflow for ${eventType}:`, order_id);
    } catch (e) {
      console.error("Failed to trigger workflow:", e);
    }

    return jsonResponse({ status: "success", results });
  } catch (error) {
    console.error("Order handoff error:", error);

    // Capture to Sentry for monitoring
    await captureException(error, {
      tags: { function: "order-handoff" },
    });

    return errorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});

async function sendWebhook(order: Order, settings: DeliverySettings, businessName: string) {
  if (!settings.webhook_url) throw new Error("No webhook URL configured");

  const payload = JSON.stringify({
    event: "order.created",
    order_id: order.id,
    order_number: order.order_number,
    order_type: order.order_type,
    status: order.status,
    customer: {
      name: order.customer_name,
      phone: order.customer_phone,
    },
    items: order.items_json,
    special_instructions: order.special_instructions,
    requested_time: order.requested_time,
    total_cents: order.total_cents,
    created_at: order.created_at,
    business_name: businessName,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add HMAC signature if secret is configured
  if (settings.webhook_secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(settings.webhook_secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    headers["X-CloseLoop-Signature"] = `sha256=${signatureHex}`;
  }

  const response = await fetch(settings.webhook_url, {
    method: "POST",
    headers,
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
}

async function sendOrderEmail(order: Order, email: string, bName: string) {
  const items = Array.isArray(order.items_json)
    ? order.items_json.map((i: OrderItem) => `${i.qty}x ${i.name}`).join(", ")
    : "items";
  const totalStr = order.total_cents ? `$${(order.total_cents / 100).toFixed(2)}` : "N/A";

  const result = await sendEmail({
    to: email,
    subject: `New Order #${order.order_number} — ${order.order_type.toUpperCase()}`,
    businessName: bName,
    html: `
      <h2>New Order #${order.order_number}</h2>
      <p><strong>Type:</strong> ${order.order_type.toUpperCase()}</p>
      <p><strong>Customer:</strong> ${order.customer_name || "Unknown"}</p>
      <p><strong>Items:</strong> ${items}</p>
      <p><strong>Total:</strong> ${totalStr}</p>
    `.trim(),
  });

  if (!result.success) {
    throw new Error(result.error || "Email send failed");
  }
}

// deno-lint-ignore no-explicit-any
async function logHandoffAttempt(
  supabase: any,
  tenantId: string,
  orderId: string,
  method: string,
  status: string,
  errorMessage?: string
) {
  await supabase.from("handoff_attempts").insert({
    tenant_id: tenantId,
    entity_type: "order",
    entity_id: orderId,
    method,
    status,
    error_message: errorMessage || null,
  });
}

async function runTestHandoff(
  method: string,
  settings: {
    webhook_url?: string;
    webhook_secret?: string;
    notify_email?: string;
    notify_phone?: string;
    tenant_id?: string;
  },
  // deno-lint-ignore no-explicit-any
  supabase: any
) {
  const testOrder: Order = {
    id: "test-order-id",
    tenant_id: settings.tenant_id || "test-tenant",
    order_number: "TEST-001",
    order_type: "pickup",
    status: "confirmed",
    customer_name: "Test Customer",
    customer_phone: "+15551234567",
    delivery_address: null,
    address_json: null,
    items_json: [
      { name: "Test Item", qty: 2, base_price: 1299, modifiers: ["extra cheese"] },
    ],
    special_instructions: "THIS IS A TEST ORDER - Please ignore",
    requested_time: null,
    total_cents: 2598,
    created_at: new Date().toISOString(),
  };

  try {
    if (method === "webhook" && settings.webhook_url) {
      await sendWebhook(testOrder, {
        enabled: true,
        handoff_methods: ["webhook"],
        webhook_url: settings.webhook_url,
        webhook_secret: settings.webhook_secret || null,
        notify_email: null,
        notify_phone: null,
      }, "Test Restaurant");
      return { success: true, method: "webhook" };
    }

    if (method === "email" && settings.notify_email) {
      await sendOrderEmail(testOrder, settings.notify_email, "Test Restaurant");
      return { success: true, method: "email" };
    }

    if (method === "sms" && settings.notify_phone) {
      const smsResult = await sendTenantSms({
        tenantId: settings.tenant_id || "test-tenant",
        to: settings.notify_phone,
        body: `[TEST] NEW ORDER #TEST-001\nType: PICKUP\nCustomer: Test Customer\nItems: 2x Test Item\nTotal: $25.98\nNOTE: THIS IS A TEST ORDER - Please ignore`,
      });
      if (!smsResult.success && !smsResult.skipped) {
        return { success: false, error: `SMS failed: ${smsResult.error}` };
      }
      return { success: true, method: "sms" };
    }

    return { success: false, error: `Invalid method or missing config: ${method}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
