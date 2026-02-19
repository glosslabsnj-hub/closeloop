/**
 * elevenlabs-create-food-order: ElevenLabs tool endpoint for creating
 * food orders during voice calls.
 *
 * Called by ElevenLabs agent when it has collected order details:
 * - Creates food_order record with items, totals, and order type
 * - Finds or creates customer record
 * - Triggers order handoff notifications
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  name: string;
  quantity: number;
  price_cents?: number;
  special_instructions?: string;
}

interface CreateFoodOrderRequest {
  tenant_id?: string;
  conversation_id?: string;
  customer_name: string;
  customer_phone?: string;
  order_type: "pickup" | "delivery";
  items: OrderItem[] | string;
  delivery_address?: string;
  special_instructions?: string;
  // Nested params from ElevenLabs
  params?: Record<string, unknown>;
}

function generateOrderNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "ORD-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateFoodOrderRequest = await req.json();
    console.log(`[create-food-order] Request:`, JSON.stringify(body));

    const p = body.params ?? {};
    const tenantId =
      body.tenant_id || (p.tenant_id as string) || "";
    const conversationId =
      body.conversation_id || (p.conversation_id as string) || "";
    const customerName =
      body.customer_name || (p.customer_name as string) || "";
    const customerPhone =
      body.customer_phone || (p.customer_phone as string) || "";
    const orderType =
      body.order_type || (p.order_type as string) || "pickup";
    const deliveryAddress =
      body.delivery_address || (p.delivery_address as string) || "";
    const specialInstructions =
      body.special_instructions ||
      (p.special_instructions as string) ||
      "";

    // Parse items — may come as JSON string or array
    let items: OrderItem[] = [];
    const rawItems = body.items || p.items;
    if (typeof rawItems === "string") {
      try {
        items = JSON.parse(rawItems);
      } catch {
        items = [{ name: rawItems, quantity: 1 }];
      }
    } else if (Array.isArray(rawItems)) {
      items = rawItems as OrderItem[];
    }

    if (!customerName) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "I need your name for the order. May I have your name?",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "I don't have any items for the order yet. What would you like to order?",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant
    let resolvedTenantId = tenantId;
    let sessionId: string | null = null;

    if (conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      resolvedTenantId = session?.tenant_id || resolvedTenantId;
      sessionId = session?.id || null;
    }

    if (!resolvedTenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unable to process the order right now.",
          error: "No tenant context",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Match items to menu_items for pricing
    const itemsJson: Array<{
      name: string;
      quantity: number;
      price_cents: number;
      special_instructions?: string;
    }> = [];
    let subtotalCents = 0;

    for (const item of items) {
      let priceCents = item.price_cents || 0;

      if (!priceCents) {
        // Look up in menu_items
        const { data: menuItem } = await supabase
          .from("menu_items")
          .select("price_cents, name")
          .eq("tenant_id", resolvedTenantId)
          .ilike("name", `%${item.name}%`)
          .limit(1)
          .maybeSingle();

        priceCents = menuItem?.price_cents || 0;
      }

      const lineTotal = priceCents * (item.quantity || 1);
      subtotalCents += lineTotal;

      itemsJson.push({
        name: item.name,
        quantity: item.quantity || 1,
        price_cents: priceCents,
        special_instructions: item.special_instructions,
      });
    }

    // Calculate tax (estimate ~8%)
    const taxCents = Math.round(subtotalCents * 0.08);
    const totalCents = subtotalCents + taxCents;

    // Find or create customer
    const phoneE164 = normalizePhoneE164(customerPhone);
    let customerId: string | null = null;

    if (phoneE164) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", resolvedTenantId)
        .eq("phone_e164", phoneE164)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newCust } = await supabase
          .from("customers")
          .insert({
            tenant_id: resolvedTenantId,
            full_name: customerName,
            phone_e164: phoneE164,
            phone_raw: customerPhone,
            source: "ai_call",
          })
          .select("id")
          .single();
        customerId = newCust?.id || null;
      }
    }

    const orderNumber = generateOrderNumber();

    // Create food order
    const { data: order, error: orderError } = await supabase
      .from("food_orders")
      .insert({
        tenant_id: resolvedTenantId,
        customer_id: customerId,
        order_number: orderNumber,
        order_type: orderType === "delivery" ? "delivery" : "pickup",
        items_json: itemsJson,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        status: "pending",
        session_id: sessionId,
        delivery_address:
          orderType === "delivery" ? deliveryAddress : null,
        special_instructions: specialInstructions || null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[create-food-order] Error:", orderError);
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "I wasn't able to place the order. Let me have someone call you to help.",
          error: orderError?.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update session
    if (sessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          outcome: "order",
          extracted_payload: {
            order_id: order.id,
            order_number: orderNumber,
            customer_name: customerName,
            order_type: orderType,
            items: itemsJson,
            total_cents: totalCents,
          },
        })
        .eq("id", sessionId);
    }

    // Trigger order handoff
    try {
      await fetch(`${supabaseUrl}/functions/v1/order-handoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-closeloop-secret":
            Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || serviceKey,
        },
        body: JSON.stringify({
          order_id: order.id,
          tenant_id: resolvedTenantId,
        }),
      });
    } catch (e) {
      console.error("[create-food-order] Handoff failed:", e);
    }

    const totalDisplay = `$${(totalCents / 100).toFixed(2)}`;
    const itemSummary = itemsJson
      .map((i) => `${i.quantity}x ${i.name}`)
      .join(", ");

    const message =
      orderType === "delivery"
        ? `Your order has been placed! That's ${itemSummary} for ${totalDisplay}. Your order number is ${orderNumber}. We'll deliver to ${deliveryAddress || "your address"}.`
        : `Your order has been placed! That's ${itemSummary} for ${totalDisplay}. Your order number is ${orderNumber}. It will be ready for pickup shortly.`;

    console.log(
      `[create-food-order] Created order ${order.id} (${orderNumber})`
    );

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: orderNumber,
        total: totalDisplay,
        message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[create-food-order] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          "I'm having trouble placing the order. Let me have someone call you back.",
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
