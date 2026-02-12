import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

const TEKMETRIC_BASE_URL = "https://shop.tekmetric.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { tenantId } = await requireAuthedTenant(req);
    const body = await req.json();
    const { action } = body;

    const svc = serviceClient();

    if (action === "exchange-token") {
      // Step 1: Exchange client credentials for access token
      const { client_id, client_secret } = body;
      if (!client_id || !client_secret) {
        return errorResponse("client_id and client_secret are required");
      }

      const tokenRes = await fetch(`${TEKMETRIC_BASE_URL}/api/v1/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id,
          client_secret,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("[tekmetric-auth] Token exchange failed:", tokenRes.status, errText);
        return errorResponse("Failed to authenticate with Tekmetric. Check your Client ID and Secret.", 401);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        return errorResponse("No access token received from Tekmetric");
      }

      // Fetch available shops
      const shopsRes = await fetch(`${TEKMETRIC_BASE_URL}/api/v1/shops`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!shopsRes.ok) {
        return errorResponse("Authenticated but failed to fetch shops");
      }

      const shopsData = await shopsRes.json();
      const shops = (shopsData.content || shopsData.data || shopsData || []).map(
        (s: Record<string, unknown>) => ({
          id: s.id,
          name: s.name || s.shopName || `Shop ${s.id}`,
          phone: s.phone || "",
          address: s.address || "",
        })
      );

      // Store credentials temporarily (user still needs to pick a shop)
      await svc.from("tenant_integrations").upsert(
        {
          tenant_id: tenantId,
          provider: "tekmetric",
          credentials_json: { access_token: accessToken, client_id },
          config_json: { shops, selected_shop_id: null },
          is_active: false,
        },
        { onConflict: "tenant_id,provider" }
      );

      return jsonResponse({ shops });
    }

    if (action === "select-shop") {
      // Step 2: User picked a shop — activate sync
      const { shop_id } = body;
      if (!shop_id) return errorResponse("shop_id is required");

      const { data: existing, error: fetchErr } = await svc
        .from("tenant_integrations")
        .select("config_json")
        .eq("tenant_id", tenantId)
        .eq("provider", "tekmetric")
        .single();

      if (fetchErr || !existing) {
        return errorResponse("No Tekmetric credentials found. Authenticate first.");
      }

      const config = existing.config_json as Record<string, unknown>;
      const shops = (config.shops || []) as Array<Record<string, unknown>>;
      const selectedShop = shops.find((s) => String(s.id) === String(shop_id));

      const { error: updateErr } = await svc
        .from("tenant_integrations")
        .update({
          config_json: {
            ...config,
            selected_shop_id: shop_id,
            selected_shop_name: selectedShop?.name || `Shop ${shop_id}`,
          },
          is_active: true,
        })
        .eq("tenant_id", tenantId)
        .eq("provider", "tekmetric");

      if (updateErr) {
        console.error("[tekmetric-auth] Failed to activate:", updateErr);
        return errorResponse("Failed to save shop selection");
      }

      return jsonResponse({ success: true, shop_name: selectedShop?.name });
    }

    if (action === "disconnect") {
      await svc
        .from("tenant_integrations")
        .update({ is_active: false })
        .eq("tenant_id", tenantId)
        .eq("provider", "tekmetric");

      return jsonResponse({ success: true });
    }

    if (action === "toggle") {
      const { is_active } = body;
      await svc
        .from("tenant_integrations")
        .update({ is_active: !!is_active })
        .eq("tenant_id", tenantId)
        .eq("provider", "tekmetric");

      return jsonResponse({ success: true });
    }

    return errorResponse("Unknown action");
  } catch (err) {
    console.error("[tekmetric-auth] Error:", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});
