/**
 * elevenlabs-lookup-order-status: ElevenLabs tool endpoint for checking
 * food order status during voice calls.
 *
 * "Where's my food?" — finds the most recent order for the caller
 * and returns its current status.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Your order has been received and is waiting to be confirmed.",
  confirmed: "Your order has been confirmed and will be prepared shortly.",
  preparing: "Your order is being prepared right now!",
  ready: "Your order is ready for pickup!",
  out_for_delivery: "Your order is on its way!",
  completed: "Your order has been completed.",
  cancelled: "That order was cancelled.",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log(`[lookup-order-status] Request:`, JSON.stringify(body));

    const p = body.params ?? {};
    const tenantId = body.tenant_id || p.tenant_id || "";
    const conversationId = body.conversation_id || p.conversation_id || "";
    const customerName = body.customer_name || p.customer_name || "";
    const customerPhone = body.customer_phone || p.customer_phone || "";
    const orderNumber = body.order_number || p.order_number || "";
    const orderId = body.order_id || p.order_id || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant
    let resolvedTenantId = tenantId;
    if (conversationId && !resolvedTenantId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      resolvedTenantId = session?.tenant_id || "";
    }

    if (!resolvedTenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unable to check order status right now.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find the order
    let order: {
      id: string;
      order_number: string;
      status: string;
      order_type: string;
      items_json: Array<{ name: string; quantity: number }>;
      total_cents: number;
      created_at: string;
    } | null = null;

    if (orderId) {
      const { data } = await supabase
        .from("food_orders")
        .select(
          "id, order_number, status, order_type, items_json, total_cents, created_at"
        )
        .eq("id", orderId)
        .eq("tenant_id", resolvedTenantId)
        .maybeSingle();
      order = data;
    } else if (orderNumber) {
      const { data } = await supabase
        .from("food_orders")
        .select(
          "id, order_number, status, order_type, items_json, total_cents, created_at"
        )
        .eq("order_number", orderNumber)
        .eq("tenant_id", resolvedTenantId)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      // Find by customer phone (most recent active order)
      const phoneE164 = normalizePhoneE164(customerPhone);
      if (phoneE164) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("tenant_id", resolvedTenantId)
          .eq("phone_e164", phoneE164)
          .maybeSingle();

        if (customer) {
          const { data } = await supabase
            .from("food_orders")
            .select(
              "id, order_number, status, order_type, items_json, total_cents, created_at"
            )
            .eq("tenant_id", resolvedTenantId)
            .eq("customer_id", customer.id)
            .not("status", "in", '("completed","cancelled")')
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          order = data;

          // If no active order, check the most recent one
          if (!order) {
            const { data: recent } = await supabase
              .from("food_orders")
              .select(
                "id, order_number, status, order_type, items_json, total_cents, created_at"
              )
              .eq("tenant_id", resolvedTenantId)
              .eq("customer_id", customer.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            order = recent;
          }
        }
      }
    }

    if (!order) {
      return new Response(
        JSON.stringify({
          success: false,
          found: false,
          message: `I don't see any recent orders for ${customerName || "your number"}. Would you like to place an order?`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const statusMessage =
      STATUS_MESSAGES[order.status] || `Your order status is: ${order.status}`;
    const totalDisplay = `$${(order.total_cents / 100).toFixed(2)}`;
    const items = Array.isArray(order.items_json) ? order.items_json : [];
    const itemSummary =
      items.map((i) => `${i.quantity}x ${i.name}`).join(", ") ||
      "your order";

    console.log(
      `[lookup-order-status] Found order ${order.id} (${order.order_number}) - ${order.status}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        order_type: order.order_type,
        total: totalDisplay,
        items: itemSummary,
        message: `Order ${order.order_number} — ${itemSummary} for ${totalDisplay}. ${statusMessage}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[lookup-order-status] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          "I'm having trouble checking the order. Let me have someone call you with an update.",
        error:
          error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
