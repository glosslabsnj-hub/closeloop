import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { order_id, tenant_id, methods, test, method, webhook_url, webhook_secret, notify_email, notify_phone } = body;

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
      });
      return new Response(JSON.stringify(testResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ status: "skipped", reason: "handoff disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          await sendEmail(order as Order, settings.notify_email, businessName);
          results.email = { success: true };
          await logHandoffAttempt(supabase, tenant_id, order_id, "email", "success");
        } catch (e) {
          const error = e instanceof Error ? e.message : "Unknown error";
          results.email = { success: false, error };
          await logHandoffAttempt(supabase, tenant_id, order_id, "email", "failed", error);
        }
      }

      if (handoffMethod === "sms" && settings.notify_phone) {
        try {
          await sendSMS(order as Order, settings.notify_phone, businessName, supabaseUrl);
          results.sms = { success: true };
          await logHandoffAttempt(supabase, tenant_id, order_id, "sms", "success");
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

    return new Response(JSON.stringify({ status: "success", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Order handoff error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

async function sendEmail(order: Order, email: string, businessName: string) {
  // For now, log the email - in production would integrate with email service
  console.log(`Would send email to ${email}:`, {
    subject: `New Order #${order.order_number}`,
    business: businessName,
    order_type: order.order_type,
    customer: order.customer_name,
    items: order.items_json,
    special_instructions: order.special_instructions,
  });
  
  // Placeholder - integrate with email service (SendGrid, Resend, etc.)
  // For MVP, this just succeeds to demo the flow
}

async function sendSMS(order: Order, phone: string, businessName: string, supabaseUrl: string) {
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!twilioAccountSid || !twilioAuthToken) {
    console.log("Twilio not configured, skipping SMS");
    return;
  }

  // Build concise message
  const items = Array.isArray(order.items_json) 
    ? order.items_json.map(i => `${i.qty}x ${i.name}`).join(", ")
    : "items";
  
  let message = `🍽️ NEW ORDER #${order.order_number}\n`;
  message += `Type: ${order.order_type.toUpperCase()}\n`;
  message += `Customer: ${order.customer_name || "Unknown"}\n`;
  message += `Items: ${items.substring(0, 100)}${items.length > 100 ? "..." : ""}\n`;
  
  if (order.special_instructions) {
    const truncated = order.special_instructions.substring(0, 50);
    message += `⚠️ SPECIAL: ${truncated}${order.special_instructions.length > 50 ? "..." : ""}\n`;
  }

  // Get a from number - would need to be configured
  // For now just log
  console.log(`Would send SMS to ${phone}:`, message);
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
    order_id: orderId,
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
  }
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
      await sendEmail(testOrder, settings.notify_email, "Test Restaurant");
      return { success: true, method: "email" };
    }

    if (method === "sms" && settings.notify_phone) {
      await sendSMS(testOrder, settings.notify_phone, "Test Restaurant", "");
      return { success: true, method: "sms" };
    }

    return { success: false, error: `Invalid method or missing config: ${method}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
