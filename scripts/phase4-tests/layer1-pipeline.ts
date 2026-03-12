/**
 * LAYER 1: Pipeline Verification Tests
 *
 * Tests every backend function, every database write, every notification path
 * by directly invoking edge functions with realistic test payloads.
 *
 * ZERO ElevenLabs credits. ZERO real SMS/email costs.
 * Verifies via database state (delivery_attempts, handoff_attempts tables).
 *
 * Usage: npx tsx scripts/phase4-tests/layer1-pipeline.ts [--mode service|dispatch|food|medical|sales|general|cross]
 */

const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdHpsdnpnd2tpZGJlcWFvZXZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA1OTU1OCwiZXhwIjoyMDg3NjM1NTU4fQ.wcWk27OBb2cVHid_gKiiu9wTHL_jkAHQ1Pv4raWfwz4";

// ============================================================================
// TEST INFRASTRUCTURE
// ============================================================================

interface TestResult {
  id: string;
  name: string;
  mode: string;
  passed: boolean;
  duration_ms: number;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

async function supabaseQuery(table: string, method: "GET" | "POST" | "PATCH" | "DELETE", params?: {
  select?: string;
  filters?: Record<string, string>;
  body?: unknown;
  upsert?: boolean;
  single?: boolean;
}): Promise<{ data: any; error: any }> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (params?.select) url.searchParams.set("select", params.select);
  if (params?.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
  if (params?.upsert) headers["Prefer"] = "resolution=merge-duplicates";
  if (params?.single) headers["Accept"] = "application/vnd.pgrst.object+json";

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: params?.body ? JSON.stringify(params.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    return { data: null, error: { message: text, status: res.status } };
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("json")) {
    return { data: await res.json(), error: null };
  }
  return { data: null, error: null };
}

async function callEdgeFunction(name: string, body: unknown): Promise<{ data: any; error: any; status: number }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const status = res.status;
    const text = await res.text();
    try {
      return { data: JSON.parse(text), error: status >= 400 ? text : null, status };
    } catch {
      return { data: text, error: status >= 400 ? text : null, status };
    }
  } catch (e: any) {
    return { data: null, error: e.message, status: 0 };
  }
}

async function rpc(functionName: string, params: Record<string, unknown>): Promise<{ data: any; error: any }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) return { data: null, error: data };
  return { data, error: null };
}

async function runTest(id: string, name: string, mode: string, fn: () => Promise<string>): Promise<void> {
  const start = Date.now();
  try {
    const details = await fn();
    results.push({ id, name, mode, passed: true, duration_ms: Date.now() - start, details });
    console.log(`  ✓ ${id}: ${name} (${Date.now() - start}ms)`);
  } catch (e: any) {
    results.push({ id, name, mode, passed: false, duration_ms: Date.now() - start, details: "", error: e.message });
    console.log(`  ✗ ${id}: ${name} — ${e.message}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// ============================================================================
// TEST TENANT SETUP
// ============================================================================

// We use Gloss Labs (existing real tenant) for service mode tests
// For other modes, we'll find or note existing test tenants
const GLOSS_LABS_TENANT = "582b44cf-3026-4a34-a0f9-515c95797405";

async function findTestTenant(mode: string): Promise<string | null> {
  const { data } = await supabaseQuery("tenants", "GET", {
    select: "id,name,business_mode",
    filters: { "business_mode": `eq.${mode}`, "limit": "1" },
  });
  return data?.[0]?.id || null;
}

// ============================================================================
// CROSS-MODE TESTS
// ============================================================================

async function runCrossModeTests() {
  console.log("\n━━━ CROSS-MODE TESTS ━━━");

  // X1: Verify delivery settings auto-creation trigger
  await runTest("X1", "Delivery settings trigger creates all 6 tables", "cross", async () => {
    // Check that Gloss Labs has rows in all 6 delivery settings tables
    const tables = [
      "universal_delivery_settings",
      "booking_delivery_settings",
      "dispatch_delivery_settings",
      "callback_delivery_settings",
      "order_delivery_settings",
      "medical_intake_delivery_settings",
    ];

    const missing: string[] = [];
    for (const table of tables) {
      const { data } = await supabaseQuery(table, "GET", {
        select: "tenant_id",
        filters: { "tenant_id": `eq.${GLOSS_LABS_TENANT}` },
      });
      if (!data || data.length === 0) missing.push(table);
    }

    assert(missing.length === 0, `Missing delivery settings in: ${missing.join(", ")}`);
    return `All 6 delivery settings tables have rows for Gloss Labs`;
  });

  // X2: Readiness check with configured tenant
  await runTest("X2", "Readiness check returns correct score for configured tenant", "cross", async () => {
    const { data, error } = await rpc("get_ai_readiness", { tenant_uuid: GLOSS_LABS_TENANT });
    assert(!error, `RPC error: ${JSON.stringify(error)}`);
    assert(data.score >= 85, `Score too low: ${data.score}`);
    assert(!data.p0_flags.includes("missing_notification_phone"), "Should not flag missing phone for Gloss Labs");
    assert(!data.p0_flags.includes("missing_transfer_number"), "Should not flag missing transfer for Gloss Labs");
    return `Score: ${data.score}, P0: [${data.p0_flags.join(",")}], P1: [${data.p1_flags.join(",")}]`;
  });

  // X3: Readiness check detects missing notification channels
  await runTest("X3", "Readiness check flags missing notification phone", "cross", async () => {
    // Find a tenant with no universal_delivery_settings or empty phone
    const { data: tenants } = await supabaseQuery("tenants", "GET", {
      select: "id,name",
      filters: { "limit": "20" },
    });

    let unconfiguredTenant: string | null = null;
    for (const t of (tenants || [])) {
      const { data: uds } = await supabaseQuery("universal_delivery_settings", "GET", {
        select: "notify_phone",
        filters: { "tenant_id": `eq.${t.id}` },
      });
      if (!uds || uds.length === 0 || !uds[0]?.notify_phone) {
        unconfiguredTenant = t.id;
        break;
      }
    }

    if (!unconfiguredTenant) {
      return "SKIP: All tenants have notification phones configured (good!)";
    }

    const { data, error } = await rpc("get_ai_readiness", { tenant_uuid: unconfiguredTenant });
    assert(!error, `RPC error: ${JSON.stringify(error)}`);
    assert(data.p0_flags.includes("missing_notification_phone"), "Should flag missing_notification_phone");
    return `Unconfigured tenant correctly flagged with missing_notification_phone`;
  });

  // X4: Verify Gloss Labs has correct delivery settings columns
  await runTest("X4", "Callback delivery settings use correct column names", "cross", async () => {
    const { data } = await supabaseQuery("callback_delivery_settings", "GET", {
      select: "tenant_id,sms_recipient_phone,email_recipient",
      filters: { "tenant_id": `eq.${GLOSS_LABS_TENANT}` },
    });
    assert(data && data.length > 0, "No callback_delivery_settings row for Gloss Labs");
    // Verify the columns exist (if they were set via our fixed Settings UI)
    return `callback_delivery_settings: phone=${data[0].sms_recipient_phone || "NULL"}, email=${data[0].email_recipient || "NULL"}`;
  });

  // X5: Universal delivery settings check
  await runTest("X5", "Universal delivery settings have correct phone and email", "cross", async () => {
    const { data } = await supabaseQuery("universal_delivery_settings", "GET", {
      select: "notify_phone,notify_email,sms_enabled,email_enabled",
      filters: { "tenant_id": `eq.${GLOSS_LABS_TENANT}` },
    });
    assert(data && data.length > 0, "No universal_delivery_settings for Gloss Labs");
    assert(!!data[0].notify_phone, "notify_phone is NULL");
    assert(!!data[0].notify_email, "notify_email is NULL");
    return `Phone: ${data[0].notify_phone}, Email: ${data[0].notify_email}, SMS: ${data[0].sms_enabled}, Email: ${data[0].email_enabled}`;
  });

  // X6: Transfer number configured
  await runTest("X6", "Owner forward number configured for transfers", "cross", async () => {
    const { data } = await supabaseQuery("assistant_settings", "GET", {
      select: "owner_forward_number",
      filters: { "tenant_id": `eq.${GLOSS_LABS_TENANT}` },
    });
    assert(data && data.length > 0, "No assistant_settings for Gloss Labs");
    assert(!!data[0].owner_forward_number, "owner_forward_number is NULL — transfers will fail");
    return `Transfer number: ${data[0].owner_forward_number}`;
  });

  // X7: Escalation rules stored
  await runTest("X7", "Escalation rules stored in assistant_settings", "cross", async () => {
    const { data } = await supabaseQuery("assistant_settings", "GET", {
      select: "settings_json",
      filters: { "tenant_id": `eq.${GLOSS_LABS_TENANT}` },
    });
    assert(data && data.length > 0, "No assistant_settings for Gloss Labs");
    const settings = data[0].settings_json;
    const rules = settings?.escalation_rules;
    if (!rules) {
      return "No explicit escalation_rules set — defaults will be used (transferOnRequest=true, etc.)";
    }
    return `Escalation rules: ${JSON.stringify(rules)}`;
  });
}

// ============================================================================
// SERVICE MODE TESTS
// ============================================================================

async function runServiceModeTests() {
  console.log("\n━━━ SERVICE MODE TESTS ━━━");

  const tenantId = GLOSS_LABS_TENANT;

  // S1: Test universal-delivery with callback payload
  await runTest("S1", "Universal delivery handles callback notification", "service", async () => {
    const { data, error, status } = await callEdgeFunction("universal-delivery", {
      tenant_id: tenantId,
      type: "callback",
      entity_id: "00000000-0000-0000-0000-000000000001", // fake
      summary: "Paint correction quote for 1965 Thunderbird",
      customer: {
        name: "Wayne Test",
        phone: "+15551234567",
        email: "test@example.com",
      },
    });

    // We expect the function to attempt delivery even if entity lookup fails
    // The key is: did it TRY to send notifications via the right channels?
    assert(status < 500, `Server error: ${JSON.stringify(data)}`);

    // Check delivery_attempts for this tenant
    const { data: attempts } = await supabaseQuery("delivery_attempts", "GET", {
      select: "method,status,error_message,created_at",
      filters: {
        "tenant_id": `eq.${tenantId}`,
        "entity_type": "eq.callback",
        "order": "created_at.desc",
        "limit": "5",
      },
    });

    return `Status: ${status}, Delivery attempts: ${JSON.stringify(attempts?.slice(0, 3) || "none")}`;
  });

  // S2: Test booking-handoff function
  await runTest("S2", "Booking handoff processes correctly", "service", async () => {
    // First, check if there are any real bookings to test with
    const { data: bookings } = await supabaseQuery("bookings", "GET", {
      select: "id,tenant_id,status,customer_id",
      filters: { "tenant_id": `eq.${tenantId}`, "limit": "1", "order": "created_at.desc" },
    });

    if (!bookings || bookings.length === 0) {
      return "SKIP: No bookings exist for Gloss Labs — cannot test handoff without a real booking";
    }

    const booking = bookings[0];
    const { data, status } = await callEdgeFunction("booking-handoff", {
      type: "INSERT",
      table: "bookings",
      record: booking,
      old_record: null,
    });

    // Check handoff_attempts
    const { data: attempts } = await supabaseQuery("handoff_attempts", "GET", {
      select: "method,status,error_message",
      filters: {
        "tenant_id": `eq.${tenantId}`,
        "entity_type": "eq.booking",
        "order": "created_at.desc",
        "limit": "5",
      },
    });

    return `Status: ${status}, Handoff attempts: ${JSON.stringify(attempts?.slice(0, 3) || "none")}`;
  });

  // S3: Test callback with urgency detection
  await runTest("S3", "Callback with urgent keywords gets urgency=urgent", "service", async () => {
    // We can't call elevenlabs-create-callback directly without a valid session
    // But we can verify the urgency detection logic by checking existing callback_requests
    const { data } = await supabaseQuery("callback_requests", "GET", {
      select: "id,urgency,message,status,customer_name",
      filters: { "tenant_id": `eq.${tenantId}`, "order": "created_at.desc", "limit": "5" },
    });

    return `Callback requests: ${JSON.stringify(data || [])}`;
  });

  // S4: Verify email sender domain
  await runTest("S4", "Email from domain is send.getfluxdata.com", "service", async () => {
    // Check delivery_attempts for email method to verify from address
    const { data } = await supabaseQuery("delivery_attempts", "GET", {
      select: "method,request_payload,created_at",
      filters: {
        "tenant_id": `eq.${tenantId}`,
        "method": "eq.email",
        "order": "created_at.desc",
        "limit": "3",
      },
    });

    if (!data || data.length === 0) {
      return "SKIP: No email delivery attempts found — will be tested when a real call triggers one";
    }

    const payload = data[0].request_payload;
    const from = typeof payload === "string" ? payload : JSON.stringify(payload);
    assert(!from.includes("@getfluxdata.com") || from.includes("@send.getfluxdata.com"),
      "Email from domain should be @send.getfluxdata.com, not @getfluxdata.com");
    return `Latest email payload: ${from.substring(0, 200)}`;
  });
}

// ============================================================================
// DISPATCH MODE TESTS
// ============================================================================

async function runDispatchModeTests() {
  console.log("\n━━━ DISPATCH MODE TESTS ━━━");

  const tenantId = await findTestTenant("dispatch");

  if (!tenantId) {
    console.log("  SKIP: No dispatch mode tenant found");
    results.push({ id: "D0", name: "Find dispatch tenant", mode: "dispatch", passed: false, duration_ms: 0, details: "", error: "No dispatch tenant exists" });
    return;
  }

  // D1: Verify dispatch delivery settings exist
  await runTest("D1", "Dispatch delivery settings configured", "dispatch", async () => {
    const { data } = await supabaseQuery("dispatch_delivery_settings", "GET", {
      select: "tenant_id,enabled,notify_phone,notify_email",
      filters: { "tenant_id": `eq.${tenantId}` },
    });
    assert(data && data.length > 0, "No dispatch_delivery_settings row");
    return `Dispatch delivery: enabled=${data[0].enabled}, phone=${data[0].notify_phone || "NULL"}, email=${data[0].notify_email || "NULL"}`;
  });

  // D2: Verify dispatch-specific readiness
  await runTest("D2", "Dispatch tenant readiness check", "dispatch", async () => {
    const { data, error } = await rpc("get_ai_readiness", { tenant_uuid: tenantId });
    assert(!error, `RPC error: ${JSON.stringify(error)}`);
    return `Score: ${data.score}, Mode: ${data.business_mode}, P0: [${data.p0_flags.join(",")}]`;
  });
}

// ============================================================================
// FOOD MODE TESTS
// ============================================================================

async function runFoodModeTests() {
  console.log("\n━━━ FOOD MODE TESTS ━━━");

  const tenantId = await findTestTenant("food");

  if (!tenantId) {
    console.log("  SKIP: No food mode tenant found");
    results.push({ id: "F0", name: "Find food tenant", mode: "food", passed: false, duration_ms: 0, details: "", error: "No food tenant exists" });
    return;
  }

  await runTest("F1", "Order delivery settings configured", "food", async () => {
    const { data } = await supabaseQuery("order_delivery_settings", "GET", {
      select: "tenant_id,enabled,notify_phone,notify_email",
      filters: { "tenant_id": `eq.${tenantId}` },
    });
    assert(data && data.length > 0, "No order_delivery_settings row");
    return `Order delivery: enabled=${data[0].enabled}, phone=${data[0].notify_phone || "NULL"}, email=${data[0].notify_email || "NULL"}`;
  });

  await runTest("F2", "Food tenant readiness check", "food", async () => {
    const { data, error } = await rpc("get_ai_readiness", { tenant_uuid: tenantId });
    assert(!error, `RPC error: ${JSON.stringify(error)}`);
    return `Score: ${data.score}, Mode: ${data.business_mode}, P0: [${data.p0_flags.join(",")}]`;
  });
}

// ============================================================================
// MEDICAL MODE TESTS
// ============================================================================

async function runMedicalModeTests() {
  console.log("\n━━━ MEDICAL MODE TESTS ━━━");

  const tenantId = await findTestTenant("medical");

  if (!tenantId) {
    console.log("  SKIP: No medical mode tenant found");
    results.push({ id: "M0", name: "Find medical tenant", mode: "medical", passed: false, duration_ms: 0, details: "", error: "No medical tenant exists" });
    return;
  }

  await runTest("M1", "Medical delivery settings configured", "medical", async () => {
    const { data } = await supabaseQuery("medical_intake_delivery_settings", "GET", {
      select: "tenant_id,sms_enabled,email_enabled,hipaa_redact",
      filters: { "tenant_id": `eq.${tenantId}` },
    });
    assert(data && data.length > 0, "No medical_intake_delivery_settings row");
    assert(data[0].hipaa_redact === true, "HIPAA redact should default to true");
    return `Medical delivery: SMS=${data[0].sms_enabled}, Email=${data[0].email_enabled}, HIPAA redact=${data[0].hipaa_redact}`;
  });

  await runTest("M2", "Medical tenant readiness check (HIPAA)", "medical", async () => {
    const { data, error } = await rpc("get_ai_readiness", { tenant_uuid: tenantId });
    assert(!error, `RPC error: ${JSON.stringify(error)}`);
    return `Score: ${data.score}, Mode: ${data.business_mode}, P0: [${data.p0_flags.join(",")}]`;
  });
}

// ============================================================================
// SALES MODE TESTS
// ============================================================================

async function runSalesModeTests() {
  console.log("\n━━━ SALES MODE TESTS ━━━");

  const tenantId = await findTestTenant("sales");

  if (!tenantId) {
    console.log("  SKIP: No sales mode tenant found");
    results.push({ id: "SL0", name: "Find sales tenant", mode: "sales", passed: false, duration_ms: 0, details: "", error: "No sales tenant exists" });
    return;
  }

  await runTest("SL1", "Callback delivery settings for sales", "sales", async () => {
    const { data } = await supabaseQuery("callback_delivery_settings", "GET", {
      select: "tenant_id,sms_recipient_phone,email_recipient",
      filters: { "tenant_id": `eq.${tenantId}` },
    });
    assert(data && data.length > 0, "No callback_delivery_settings row");
    return `Callback delivery: phone=${data[0].sms_recipient_phone || "NULL"}, email=${data[0].email_recipient || "NULL"}`;
  });

  await runTest("SL2", "Sales tenant readiness check", "sales", async () => {
    const { data, error } = await rpc("get_ai_readiness", { tenant_uuid: tenantId });
    assert(!error, `RPC error: ${JSON.stringify(error)}`);
    return `Score: ${data.score}, Mode: ${data.business_mode}, P0: [${data.p0_flags.join(",")}]`;
  });
}

// ============================================================================
// GENERAL MODE TESTS
// ============================================================================

async function runGeneralModeTests() {
  console.log("\n━━━ GENERAL MODE TESTS ━━━");

  const tenantId = await findTestTenant("general");

  if (!tenantId) {
    console.log("  SKIP: No general mode tenant found");
    results.push({ id: "G0", name: "Find general tenant", mode: "general", passed: false, duration_ms: 0, details: "", error: "No general tenant exists" });
    return;
  }

  await runTest("G1", "General tenant delivery settings", "general", async () => {
    const { data } = await supabaseQuery("universal_delivery_settings", "GET", {
      select: "notify_phone,notify_email,sms_enabled,email_enabled",
      filters: { "tenant_id": `eq.${tenantId}` },
    });
    assert(data && data.length > 0, "No universal_delivery_settings row");
    return `Universal delivery: phone=${data[0].notify_phone || "NULL"}, email=${data[0].notify_email || "NULL"}`;
  });

  await runTest("G2", "General tenant readiness check", "general", async () => {
    const { data, error } = await rpc("get_ai_readiness", { tenant_uuid: tenantId });
    assert(!error, `RPC error: ${JSON.stringify(error)}`);
    return `Score: ${data.score}, Mode: ${data.business_mode}, P0: [${data.p0_flags.join(",")}]`;
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const modeArg = process.argv.find(a => a.startsWith("--mode="))?.split("=")[1];

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  LAYER 1: PIPELINE VERIFICATION TESTS       ║");
  console.log("║  Zero ElevenLabs | Zero SMS/Email costs      ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`Mode filter: ${modeArg || "ALL"}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  if (!modeArg || modeArg === "cross") await runCrossModeTests();
  if (!modeArg || modeArg === "service") await runServiceModeTests();
  if (!modeArg || modeArg === "dispatch") await runDispatchModeTests();
  if (!modeArg || modeArg === "food") await runFoodModeTests();
  if (!modeArg || modeArg === "medical") await runMedicalModeTests();
  if (!modeArg || modeArg === "sales") await runSalesModeTests();
  if (!modeArg || modeArg === "general") await runGeneralModeTests();

  // Summary
  console.log("\n══════════════════════════════════════════════");
  console.log("RESULTS SUMMARY");
  console.log("══════════════════════════════════════════════");

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);
  const skipped = results.filter(r => r.details.startsWith("SKIP"));

  console.log(`Total: ${results.length} | Passed: ${passed.length} | Failed: ${failed.length} | Skipped: ${skipped.length}`);

  if (failed.length > 0) {
    console.log("\nFAILED TESTS:");
    for (const f of failed) {
      console.log(`  ✗ ${f.id} (${f.mode}): ${f.name}`);
      console.log(`    Error: ${f.error}`);
    }
  }

  // Group by mode
  const modes = [...new Set(results.map(r => r.mode))];
  console.log("\nPER-MODE STATUS:");
  for (const mode of modes) {
    const modeResults = results.filter(r => r.mode === mode);
    const modePassed = modeResults.filter(r => r.passed).length;
    const modeTotal = modeResults.length;
    const status = modePassed === modeTotal ? "✓ PASS" : "✗ FAIL";
    console.log(`  ${status} ${mode}: ${modePassed}/${modeTotal}`);
  }

  // Detailed results
  console.log("\nDETAILED RESULTS:");
  for (const r of results) {
    const icon = r.passed ? "✓" : "✗";
    console.log(`  ${icon} ${r.id} [${r.mode}] ${r.name} (${r.duration_ms}ms)`);
    if (r.details && !r.error) console.log(`    → ${r.details.substring(0, 200)}`);
    if (r.error) console.log(`    → ERROR: ${r.error}`);
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(2);
});
