/**
 * generate-invoice-payment: Create a payment link for a business owner's invoice.
 *
 * Platform-agnostic: tries Stripe Connect first, then Square, then returns
 * a manual payment URL (dashboard link where owner can mark paid).
 *
 * Called by post-service-automation after invoice creation.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidAccessToken } from "../_shared/oauthHelpers.ts";
import { corsHeaders, jsonResponse, errorResponse, corsResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface PaymentRequest {
  tenant_id: string;
  invoice_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { tenant_id, invoice_id }: PaymentRequest = await req.json();

    if (!tenant_id || !invoice_id) {
      return errorResponse("Missing tenant_id or invoice_id");
    }

    // Fetch the invoice
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (invErr || !invoice) {
      return errorResponse("Invoice not found", 404);
    }

    if (invoice.balance_due_cents <= 0) {
      return jsonResponse({ skipped: true, message: "No balance due" });
    }

    // Fetch tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    // Check which payment integrations are connected
    const { data: integrations } = await supabase
      .from("integrations")
      .select("provider, status, config_json")
      .eq("tenant_id", tenant_id)
      .eq("status", "connected")
      .in("provider", ["stripe_connect", "square_pos"]);

    const connectedProviders = (integrations || []).map(i => i.provider);
    let paymentUrl: string | null = null;
    let paymentMethod: string | null = null;

    // ─── TRY STRIPE CONNECT ──────────────────────────────────────
    if (connectedProviders.includes("stripe_connect")) {
      try {
        const merchantToken = await getValidAccessToken("stripe_connect", tenant_id);
        const stripeIntegration = integrations!.find(i => i.provider === "stripe_connect");
        const stripeAccountId = (stripeIntegration?.config_json as any)?.stripe_user_id;

        if (merchantToken && stripeAccountId) {
          // Create a Stripe Payment Link on the merchant's connected account
          const lineItems = (invoice.line_items as any[]) || [];
          const description = lineItems.map((l: any) => l.description).join(", ") || "Invoice payment";

          // Create a one-time price on the connected account
          const priceParams = new URLSearchParams({
            "unit_amount": String(invoice.balance_due_cents),
            "currency": "usd",
            "product_data[name]": `Invoice #${invoice.invoice_number} - ${description}`,
          });

          const priceRes = await fetch("https://api.stripe.com/v1/prices", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${merchantToken}`,
              "Content-Type": "application/x-www-form-urlencoded",
              "Stripe-Account": stripeAccountId,
            },
            body: priceParams.toString(),
          });

          if (priceRes.ok) {
            const price = await priceRes.json();

            // Create payment link
            const linkParams = new URLSearchParams({
              "line_items[0][price]": price.id,
              "line_items[0][quantity]": "1",
              "metadata[invoice_id]": invoice_id,
              "metadata[tenant_id]": tenant_id,
              "after_completion[type]": "redirect",
              "after_completion[redirect][url]": `${SUPABASE_URL}/functions/v1/invoice-payment-complete?invoice_id=${invoice_id}`,
            });

            const linkRes = await fetch("https://api.stripe.com/v1/payment_links", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${merchantToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "Stripe-Account": stripeAccountId,
              },
              body: linkParams.toString(),
            });

            if (linkRes.ok) {
              const link = await linkRes.json();
              paymentUrl = link.url;
              paymentMethod = "stripe_connect";
            } else {
              const errBody = await linkRes.text();
              console.error("[generate-invoice-payment] Stripe link creation failed:", errBody);
            }
          } else {
            const errBody = await priceRes.text();
            console.error("[generate-invoice-payment] Stripe price creation failed:", errBody);
          }
        }
      } catch (e) {
        console.error("[generate-invoice-payment] Stripe Connect error:", e);
      }
    }

    // ─── TRY SQUARE CHECKOUT LINK (if Stripe didn't work) ────────
    if (!paymentUrl && connectedProviders.includes("square_pos")) {
      try {
        const squareToken = await getValidAccessToken("square_pos", tenant_id);
        const squareIntegration = integrations!.find(i => i.provider === "square_pos");
        const locationId = (squareIntegration?.config_json as any)?.location_id;

        if (squareToken && locationId) {
          const lineItems = (invoice.line_items as any[]) || [];
          const description = lineItems.map((l: any) => l.description).join(", ") || "Service";

          // Step 1: Create a Square Order (required for checkout links)
          const orderBody = {
            idempotency_key: `order-inv-${invoice_id}`,
            order: {
              location_id: locationId,
              line_items: [{
                name: `Invoice #${invoice.invoice_number} - ${description}`,
                quantity: "1",
                base_price_money: {
                  amount: invoice.balance_due_cents,
                  currency: "USD",
                },
              }],
            },
          };

          const orderRes = await fetch("https://connect.squareup.com/v2/orders", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${squareToken}`,
              "Content-Type": "application/json",
              "Square-Version": "2024-12-18",
            },
            body: JSON.stringify(orderBody),
          });

          if (orderRes.ok) {
            const orderData = await orderRes.json();
            const orderId = orderData.order?.id;

            if (orderId) {
              // Step 2: Create a Payment Link from the order
              const linkBody = {
                idempotency_key: `link-inv-${invoice_id}`,
                order_id: orderId,
                checkout_options: {
                  allow_tipping: false,
                  redirect_url: `${SUPABASE_URL}/functions/v1/invoice-payment-complete?invoice_id=${invoice_id}`,
                },
              };

              const linkRes = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${squareToken}`,
                  "Content-Type": "application/json",
                  "Square-Version": "2024-12-18",
                },
                body: JSON.stringify(linkBody),
              });

              if (linkRes.ok) {
                const linkData = await linkRes.json();
                paymentUrl = linkData.payment_link?.long_url || linkData.payment_link?.url || null;
                paymentMethod = "square";

                // Store the Square invoice/order reference
                if (paymentUrl) {
                  await supabase
                    .from("invoices")
                    .update({ square_invoice_id: orderId })
                    .eq("id", invoice_id);
                }
                console.log(`[generate-invoice-payment] Square payment link created: ${paymentUrl}`);
              } else {
                const errBody = await linkRes.text();
                console.error("[generate-invoice-payment] Square link creation failed:", errBody);
              }
            }
          } else {
            const errBody = await orderRes.text();
            console.error("[generate-invoice-payment] Square order creation failed:", errBody);
          }
        }
      } catch (e) {
        console.error("[generate-invoice-payment] Square error:", e);
      }
    }

    // ─── FALLBACK: MANUAL/DASHBOARD LINK ─────────────────────────
    if (!paymentUrl) {
      // No payment processor connected or payment link creation failed
      // The business owner will need to collect payment manually
      paymentMethod = paymentMethod || "external";
    }

    // Update invoice with payment info
    if (paymentUrl) {
      await supabase
        .from("invoices")
        .update({
          payment_url: paymentUrl,
          payment_method: paymentMethod,
        })
        .eq("id", invoice_id);
    }

    return jsonResponse({
      payment_url: paymentUrl,
      payment_method: paymentMethod || "external",
      invoice_id,
    });

  } catch (err) {
    console.error("[generate-invoice-payment] Error:", err);
    return errorResponse("Internal server error", 500);
  }
});
