import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthedContext = {
  userId: string;
  allowedTenantIds: string[];
  tenantId: string;
};

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function requireAuthedTenant(req: Request, requestedTenantId?: string | null): Promise<AuthedContext> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const token = getBearerToken(req);
  if (!token) throw new Error("Missing Authorization bearer token");

  // Verify user identity using ANON client + JWT
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await anon.auth.getUser();
  if (userErr || !userRes?.user?.id) throw new Error("Unauthorized");

  const userId = userRes.user.id;

  // Fetch allowed tenants using SERVICE client, filtered by user_id
  const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: memberships, error: memErr } = await svc
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", userId);

  if (memErr) throw new Error("Failed to read tenant membership");
  const allowedTenantIds = (memberships ?? []).map((m: any) => m.tenant_id).filter(Boolean);

  if (allowedTenantIds.length === 0) throw new Error("User has no tenant membership");

  // Resolve tenant_id
  const tenantId =
    requestedTenantId && requestedTenantId.trim().length > 0
      ? requestedTenantId
      : (allowedTenantIds.length === 1 ? allowedTenantIds[0] : "");

  if (!tenantId) throw new Error("Missing tenant_id");
  if (!allowedTenantIds.includes(tenantId)) throw new Error("Forbidden tenant");

  return { userId, allowedTenantIds, tenantId };
}

export function serviceClient() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

/**
 * Validate internal webhook requests using x-closeloop-secret header.
 * Use for endpoints triggered by internal services (no user JWT).
 * Throws if secret is missing or invalid.
 */
export function requireInternalSecret(req: Request): void {
  const CLOSELOOP_INTERNAL_SECRET = Deno.env.get("CLOSELOOP_INTERNAL_SECRET");
  if (!CLOSELOOP_INTERNAL_SECRET) {
    throw new Error("CLOSELOOP_INTERNAL_SECRET not configured");
  }
  const provided = req.headers.get("x-closeloop-secret");
  if (!provided || provided !== CLOSELOOP_INTERNAL_SECRET) {
    throw new Error("Forbidden: invalid internal secret");
  }
}

/**
 * Validate admin requests using x-admin-secret header.
 * Use for sensitive operations like cleanup-test-users.
 * Throws if secret is missing or invalid.
 */
export function requireAdminSecret(req: Request): void {
  const ADMIN_CLEANUP_SECRET = Deno.env.get("ADMIN_CLEANUP_SECRET");
  if (!ADMIN_CLEANUP_SECRET) {
    throw new Error("ADMIN_CLEANUP_SECRET not configured");
  }
  const provided = req.headers.get("x-admin-secret");
  if (!provided || provided !== ADMIN_CLEANUP_SECRET) {
    throw new Error("Forbidden: invalid admin secret");
  }
}

/**
 * Check if running in production environment.
 * Returns true if ENVIRONMENT or DENO_ENV contains 'prod'.
 */
export function isProduction(): boolean {
  const env = Deno.env.get("ENVIRONMENT") || Deno.env.get("DENO_ENV") || "";
  return env.toLowerCase().includes("prod");
}
