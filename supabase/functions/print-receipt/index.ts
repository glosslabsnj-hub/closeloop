import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrintReceiptRequest {
  tenant_id: string;
  order_id?: string;
  content?: string;
  title?: string;
  copies?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PrintReceiptRequest = await req.json();
    const { tenant_id, order_id, content, title, copies = 1 } = body;

    if (!tenant_id) {
      throw new Error("tenant_id is required");
    }

    // Get printer integration config
    const { data: integration } = await supabase
      .from("integrations")
      .select("config_json")
      .eq("tenant_id", tenant_id)
      .eq("provider", "printer")
      .eq("status", "connected")
      .single();

    const config = integration?.config_json as {
      printer_type?: string;
      printnode_api_key?: string;
      printer_id?: number;
    } | null;

    // If PrintNode configured, send to cloud printing
    if (config?.printnode_api_key && config?.printer_id) {
      const printnodeApiKey = config.printnode_api_key;
      const printerId = config.printer_id;

      // Build content from order if provided
      let printContent = content || "";
      
      if (order_id && !content) {
        const { data: order } = await supabase
          .from("food_orders")
          .select("*, customer:customers(*)")
          .eq("id", order_id)
          .single();

        if (order) {
          printContent = buildReceiptContent(order);
        }
      }

      // Send to PrintNode
      const printJobResponse = await fetch("https://api.printnode.com/printjobs", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(printnodeApiKey + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          printerId: printerId,
          title: title || `Order Receipt`,
          contentType: "raw_base64",
          content: btoa(printContent),
          source: "CloseLoop",
          qty: copies,
        }),
      });

      if (!printJobResponse.ok) {
        const errorText = await printJobResponse.text();
        console.error("PrintNode error:", errorText);
        throw new Error(`PrintNode API error: ${printJobResponse.status}`);
      }

      const printJobId = await printJobResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          method: "printnode",
          job_id: printJobId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: Mark order for browser-based printing
    if (order_id) {
      await supabase
        .from("food_orders")
        .update({
          handoff_state: {
            print_requested: true,
            print_format: "thermal",
            print_copies: copies,
            print_requested_at: new Date().toISOString(),
          },
        })
        .eq("id", order_id);

      return new Response(
        JSON.stringify({
          success: true,
          method: "browser",
          message: "Order marked for browser printing",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "No PrintNode configured and no order_id provided",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Print receipt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildReceiptContent(order: any): string {
  const lines: string[] = [];
  
  lines.push("================================");
  lines.push(`ORDER #${order.order_number || "N/A"}`);
  lines.push("================================");
  lines.push("");
  
  // Customer info
  const customerName = order.customer?.full_name || order.customer_name || "Guest";
  lines.push(`Customer: ${customerName}`);
  
  if (order.order_type) {
    lines.push(`Type: ${order.order_type.toUpperCase()}`);
  }
  
  lines.push("");
  lines.push("--------------------------------");
  lines.push("ITEMS");
  lines.push("--------------------------------");
  
  // Parse items
  const items = order.items_json || [];
  for (const item of items) {
    const qty = item.quantity || 1;
    const name = item.name || item.item_name || "Item";
    const price = item.price_cents ? (item.price_cents / 100).toFixed(2) : "";
    lines.push(`${qty}x ${name}${price ? ` - $${price}` : ""}`);
    
    if (item.modifiers?.length) {
      for (const mod of item.modifiers) {
        lines.push(`   + ${mod.name || mod}`);
      }
    }
    if (item.notes) {
      lines.push(`   NOTE: ${item.notes}`);
    }
  }
  
  lines.push("");
  lines.push("--------------------------------");
  
  // Total
  if (order.total_cents) {
    lines.push(`TOTAL: $${(order.total_cents / 100).toFixed(2)}`);
  }
  
  // Special instructions
  if (order.special_instructions) {
    lines.push("");
    lines.push("SPECIAL INSTRUCTIONS:");
    lines.push(order.special_instructions);
  }
  
  // Delivery address
  if (order.delivery_address && order.order_type === "delivery") {
    lines.push("");
    lines.push("DELIVER TO:");
    lines.push(order.delivery_address);
  }
  
  // Requested time
  if (order.requested_time) {
    lines.push("");
    lines.push(`REQUESTED TIME: ${order.requested_time}`);
  }
  
  lines.push("");
  lines.push("================================");
  lines.push(`Printed: ${new Date().toLocaleString()}`);
  lines.push("================================");
  
  return lines.join("\n");
}
