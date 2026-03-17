/**
 * seed-stripe-prices
 *
 * Admin-only edge function that idempotently creates the Flux Receptionist
 * Stripe Product + 4 recurring Price objects with plan_code metadata.
 *
 * Auth: JWT (super_admin role) OR x-admin-secret header
 * Method: POST
 * Returns: { results: { sku, status: "created"|"exists", price_id }[] }
 */

import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAdminSecret, serviceClient } from "../_shared/tenant.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRODUCT_KEY = "flux_ai_receptionist";
const PRODUCT_NAME = "Flux AI Voice Receptionist";

interface PriceDef {
  sku: string;
  unit_amount: number;
  nickname: string;
  included_minutes: string;
  overage_rate_cents: string;
}

const PRICES: PriceDef[] = [
  {
    sku: "starter-50",
    unit_amount: 4900,
    nickname: "Starter - 50 minutes",
    included_minutes: "50",
    overage_rate_cents: "65",
  },
  {
    sku: "growth-150",
    unit_amount: 9900,
    nickname: "Growth - 150 minutes",
    included_minutes: "150",
    overage_rate_cents: "55",
  },
  {
    sku: "pro-400",
    unit_amount: 19900,
    nickname: "Pro - 400 minutes",
    included_minutes: "400",
    overage_rate_cents: "45",
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
    return corsResponse();
  }

  try {
    // Auth: accept either x-admin-secret header OR JWT from a super_admin user
    const adminSecret = req.headers.get("x-admin-secret");
    if (adminSecret) {
      requireAdminSecret(req);
    } else {
      // JWT auth — verify user is super_admin
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
      const auth = req.headers.get("authorization") || "";
      const token = auth.replace(/^Bearer\s+/i, "");
      if (!token) throw new Error("Forbidden: no credentials provided");

      const anon = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data: userData, error: userErr } = await anon.auth.getUser();
      if (userErr || !userData?.user?.id) throw new Error("Forbidden: invalid token");

      const svc = serviceClient();
      const { data: roleData } = await svc
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (!roleData) throw new Error("Forbidden: super_admin role required");
    }

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
