/**
 * seed-stripe-prices
 *
 * Admin-only edge function that idempotently creates the CloseLoop
 * Stripe Product + 4 recurring Price objects with plan_code metadata.
 *
 * Auth: x-admin-secret header (requireAdminSecret)
 * Method: POST
 * Returns: { results: { sku, status: "created"|"exists", price_id }[] }
 */

import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAdminSecret } from "../_shared/tenant.ts";

const corsHeadersWithAdmin: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

const PRODUCT_KEY = "closeloop_ai_receptionist";
const PRODUCT_NAME = "CloseLoop AI Voice Receptionist";

interface PriceDef {
  sku: string;
  unit_amount: number;
  nickname: string;
  included_minutes: string;
  overage_rate_cents: string;
}

const PRICES: PriceDef[] = [
  {
    sku: "base-200",
    unit_amount: 24900,
    nickname: "Platform Base - 200 minutes",
    included_minutes: "200",
    overage_rate_cents: "55",
  },
  {
    sku: "growth-2000",
    unit_amount: 79900,
    nickname: "Growth Minutes - 2,000 minutes",
    included_minutes: "2000",
    overage_rate_cents: "45",
  },
  {
    sku: "scale-5000",
    unit_amount: 169900,
    nickname: "Scale Minutes - 5,000 minutes",
    included_minutes: "5000",
    overage_rate_cents: "35",
  },
  {
    sku: "power-10000",
    unit_amount: 299900,
    nickname: "Power Minutes - 10,000 minutes",
    included_minutes: "10000",
    overage_rate_cents: "29",
  },
];

async function stripeGet(path: string, key: string): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
}

async function stripePost(
  path: string,
  key: string,
  body: URLSearchParams,
): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersWithAdmin });
  }

  try {
    requireAdminSecret(req);

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return errorResponse("STRIPE_SECRET_KEY not configured", 500);
    }

    // Step 1: Find or create product
    const productSearchRes = await stripeGet(
      `/products/search?query=metadata['product_key']:'${PRODUCT_KEY}'`,
      STRIPE_SECRET_KEY,
    );

    let productId: string;

    if (productSearchRes.ok) {
      const productData = await productSearchRes.json();
      if (productData.data?.length > 0) {
        productId = productData.data[0].id;
        console.log(`Product already exists: ${productId}`);
      } else {
        // Create product
        const createRes = await stripePost(
          "/products",
          STRIPE_SECRET_KEY,
          new URLSearchParams({
            name: PRODUCT_NAME,
            "metadata[product_key]": PRODUCT_KEY,
          }),
        );
        if (!createRes.ok) {
          const err = await createRes.text();
          console.error("Product creation failed:", err);
          return errorResponse(`Failed to create Stripe product: ${err}`, 500);
        }
        const product = await createRes.json();
        productId = product.id;
        console.log(`Product created: ${productId}`);
      }
    } else {
      const err = await productSearchRes.text();
      console.error("Product search failed:", err);
      return errorResponse(`Stripe product search failed: ${err}`, 500);
    }

    // Step 2: For each SKU, find or create price
    const results: { sku: string; status: string; price_id: string }[] = [];

    for (const priceDef of PRICES) {
      // Search for existing price with this plan_code
      const searchRes = await stripeGet(
        `/prices/search?query=metadata['plan_code']:'${priceDef.sku}' AND active:'true'`,
        STRIPE_SECRET_KEY,
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data?.length > 0) {
          results.push({
            sku: priceDef.sku,
            status: "exists",
            price_id: searchData.data[0].id,
          });
          console.log(`Price already exists for ${priceDef.sku}: ${searchData.data[0].id}`);
          continue;
        }
      }

      // Create price
      const createRes = await stripePost(
        "/prices",
        STRIPE_SECRET_KEY,
        new URLSearchParams({
          product: productId,
          unit_amount: String(priceDef.unit_amount),
          currency: "usd",
          "recurring[interval]": "month",
          nickname: priceDef.nickname,
          "metadata[plan_code]": priceDef.sku,
          "metadata[included_minutes]": priceDef.included_minutes,
          "metadata[overage_rate_cents]": priceDef.overage_rate_cents,
          "metadata[product_key]": PRODUCT_KEY,
        }),
      );

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error(`Price creation failed for ${priceDef.sku}:`, err);
        results.push({
          sku: priceDef.sku,
          status: `error: ${err}`,
          price_id: "",
        });
        continue;
      }

      const price = await createRes.json();
      results.push({
        sku: priceDef.sku,
        status: "created",
        price_id: price.id,
      });
      console.log(`Price created for ${priceDef.sku}: ${price.id}`);
    }

    return jsonResponse({
      product_id: productId,
      results,
    });
  } catch (err) {
    console.error("seed-stripe-prices error:", err);
    if (err instanceof Error && err.message.includes("Forbidden")) {
      return errorResponse(err.message, 403);
    }
    return errorResponse("Internal error", 500);
  }
});
