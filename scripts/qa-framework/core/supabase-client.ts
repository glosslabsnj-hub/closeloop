/**
 * Supabase REST client for QA tests.
 * Direct HTTP calls — no SDK dependency.
 */
import { SUPABASE_URL, SERVICE_ROLE_KEY, EDGE_FUNCTION_TIMEOUT, PROTECTED_TENANT_IDS } from "./config.js";

const headers = {
  "Content-Type": "application/json",
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

// Safety guard: prevent any write operation targeting a protected (production) tenant
function guardProtectedTenant(data: Record<string, unknown>, filters?: Record<string, unknown>): void {
  const tenantId = (data?.tenant_id || filters?.tenant_id || data?.id || filters?.id) as string;
  if (tenantId && PROTECTED_TENANT_IDS.includes(tenantId)) {
    throw new Error(`SAFETY BLOCK: Attempted to modify protected tenant ${tenantId}. QA must never touch production data.`);
  }
}

// ── Edge Function Calls ─────────────────────────────────────────────

export async function callEdgeFunction(
  name: string,
  body: Record<string, unknown>,
): Promise<{ status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT);

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// ── REST API (PostgREST) ────────────────────────────────────────────

export async function dbQuery(
  table: string,
  filters: Record<string, unknown>,
  select = "*",
): Promise<unknown[]> {
  const params = new URLSearchParams();
  params.set("select", select);
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "string" && (value.startsWith("eq.") || value.startsWith("neq.") || value.startsWith("gt.") || value.startsWith("lt.") || value.startsWith("gte.") || value.startsWith("lte.") || value.startsWith("like.") || value.startsWith("ilike.") || value.startsWith("is."))) {
      params.set(key, value);
    } else {
      params.set(key, `eq.${value}`);
    }
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { ...headers, Prefer: "return=representation" },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB query ${table} failed (${res.status}): ${err}`);
  }
  return res.json();
}

export async function dbInsert(
  table: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  guardProtectedTenant(data);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB insert ${table} failed (${res.status}): ${err}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function dbUpdate(
  table: string,
  filters: Record<string, unknown>,
  data: Record<string, unknown>,
): Promise<unknown[]> {
  guardProtectedTenant(data, filters);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, typeof value === "string" && value.includes(".") ? value : `eq.${value}`);
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB update ${table} failed (${res.status}): ${err}`);
  }
  return res.json();
}

export async function dbDelete(
  table: string,
  filters: Record<string, unknown>,
): Promise<void> {
  guardProtectedTenant({}, filters);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, typeof value === "string" && value.includes(".") ? value : `eq.${value}`);
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB delete ${table} failed (${res.status}): ${err}`);
  }
}

export async function dbRpc(
  fn: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`RPC ${fn} failed (${res.status}): ${err}`);
  }
  return res.json();
}

// ── Polling Helper ──────────────────────────────────────────────────

export async function dbPollForRow(
  table: string,
  filters: Record<string, unknown>,
  timeoutMs = 15_000,
  intervalMs = 2_000,
): Promise<Record<string, unknown> | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await dbQuery(table, filters);
    if (rows.length > 0) return rows[0] as Record<string, unknown>;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return null;
}
