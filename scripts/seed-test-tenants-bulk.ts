/**
 * Bulk seed test tenants from testTenantMatrix using service role key.
 *
 * Usage:
 *   npx tsx scripts/seed-test-tenants-bulk.ts          # seed all missing
 *   npx tsx scripts/seed-test-tenants-bulk.ts test-hvac-emergency test-salon-basic  # seed specific slugs
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS (no JWT/auth needed).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
const envContent = readFileSync(envPath, "utf8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
  if (match) envVars[match[1]!.trim()] = match[2]!;
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || "https://yltzlvzgwkidbeqaoevp.supabase.co";
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Import test tenant matrix (tsx resolves @/ alias via tsconfig)
// We need to use a relative import since tsx doesn't always resolve aliases in scripts
import { TEST_TENANT_MATRIX, type TestTenantConfig } from "../src/data/testTenantMatrix";

async function seedTenant(config: TestTenantConfig): Promise<string> {
  // Check if tenant already exists by name
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("name", config.name)
    .maybeSingle();

  if (existing) {
    console.log(`  ⏭ "${config.name}" already exists (${existing.id}). Skipping.`);
    return existing.id;
  }

  // Default hours
  const defaultHours = {
    monday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
    tuesday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
    wednesday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
    thursday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
    friday: { closed: false, windows: [{ open: "09:00", close: "17:00" }] },
    saturday: { closed: false, windows: [{ open: "10:00", close: "15:00" }] },
    sunday: { closed: true, windows: [] },
  };

  // Create tenant
  const tenantInsert: Record<string, unknown> = {
    name: config.name,
    address: config.address,
    timezone: config.timezone,
    business_mode: config.business_mode,
    industry: config.industry,
    enabled_modules: config.enabled_modules,
    capabilities_json: config.capabilities_json,
    hipaa_mode: config.hipaa_mode,
    hours_json: config.hours_json ?? defaultHours,
    onboarding_completed_at: new Date().toISOString(),
  };

  if (config.phone_public) tenantInsert.phone_public = config.phone_public;
  if (config.website_url) tenantInsert.website_url = config.website_url;
  if (config.tagline) tenantInsert.tagline = config.tagline;
  if (config.cancellation_policy) tenantInsert.cancellation_policy = config.cancellation_policy;
  if (config.service_area_json) tenantInsert.service_area_json = config.service_area_json;

  const { data: newTenant, error: tenantError } = await supabase
    .from("tenants")
    .insert(tenantInsert)
    .select("id")
    .single();

  if (tenantError || !newTenant) {
    throw new Error(`Tenant creation failed for "${config.name}": ${tenantError?.message}`);
  }

  const tenantId = newTenant.id;
  console.log(`  ✓ Created tenant "${config.name}" (${tenantId})`);

  // Create subscription (trialing on base plan)
  const { error: subErr } = await supabase.from("subscriptions").insert({
    tenant_id: tenantId,
    plan_code: "base-200",
    status: "trialing",
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (subErr) console.warn(`    ⚠ Subscription: ${subErr.message}`);

  // Create assistant settings
  const { error: aiErr } = await supabase.from("assistant_settings").insert({
    tenant_id: tenantId,
    voice_ai_enabled: true,
    instant_text_enabled: true,
    ai_booking_mode: config.communicationPrefs.aiBookingMode,
    missed_call_behavior: config.communicationPrefs.missedCallBehavior,
    unknown_question_behavior: config.communicationPrefs.unknownQuestionBehavior,
  });
  if (aiErr) console.warn(`    ⚠ Assistant settings: ${aiErr.message}`);

  // Create booking_delivery_settings for booking modes
  if (["service", "medical", "sales", "general"].includes(config.business_mode)) {
    await supabase.from("booking_delivery_settings").insert({
      tenant_id: tenantId,
      enabled: true,
      handoff_methods: { email: true, sms: true, push: false, calendar_sync: false },
    });
  }

  // Create food order settings for food mode
  if (config.business_mode === "food") {
    await supabase.from("food_order_settings").insert({
      tenant_id: tenantId,
      accepts_pickup: true,
      accepts_delivery: config.capabilities_json.offersDelivery ?? false,
      accepts_dine_in: true,
      accepts_catering: config.capabilities_json.offersCatering ?? false,
      order_confirmation_mode: "auto_confirm",
    });
  }

  // Seed services
  const { seedData } = config;
  if (seedData.customServices && seedData.customServices.length > 0) {
    const services = seedData.customServices.map((s) => ({
      tenant_id: tenantId,
      name: s.name,
      description: s.description ?? "",
      duration_minutes: s.duration_minutes,
      price_amount: s.price_amount,
      price_type: s.price_type ?? "fixed",
      service_category: s.service_category ?? null,
      display_order: s.display_order ?? 0,
      is_active: true,
    }));
    const { error: svcErr } = await supabase.from("services").insert(services);
    if (svcErr) console.warn(`    ⚠ Services: ${svcErr.message}`);
    else console.log(`    + ${services.length} services`);
  }

  // Seed FAQs
  if (seedData.customFaqs && seedData.customFaqs.length > 0) {
    const faqs = seedData.customFaqs.map((f, i) => ({
      tenant_id: tenantId,
      question: f.question,
      answer: f.answer,
      priority_weight: f.priority_weight ?? i,
    }));
    const { error: faqErr } = await supabase.from("business_faqs").insert(faqs);
    if (faqErr) console.warn(`    ⚠ FAQs: ${faqErr.message}`);
    else console.log(`    + ${faqs.length} FAQs`);
  }

  // Seed objection responses
  if (seedData.customObjections && seedData.customObjections.length > 0) {
    const objections = seedData.customObjections.map((o, i) => ({
      tenant_id: tenantId,
      objection: o.objection,
      response: o.response,
      priority_weight: o.priority_weight ?? i,
    }));
    const { error: objErr } = await supabase.from("objection_responses").insert(objections);
    if (objErr) console.warn(`    ⚠ Objections: ${objErr.message}`);
    else console.log(`    + ${objections.length} objection responses`);
  }

  // Seed sample call sessions
  const outcomes = ["booked", "booked", "lost", "followup", "message"] as const;
  const calls = Array.from({ length: seedData.callCount }, (_, i) => {
    const hoursAgo = i * 2 + 1;
    const startedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return {
      tenant_id: tenantId,
      call_direction: "inbound" as const,
      started_at: startedAt.toISOString(),
      ended_at: new Date(startedAt.getTime() + (60 + i * 30) * 1000).toISOString(),
      outcome: outcomes[i % outcomes.length],
      caller_phone: `+1555000${String(i).padStart(4, "0")}`,
      summary: `Sample ${outcomes[i % outcomes.length]} call from test data`,
    };
  });
  if (calls.length > 0) {
    const { error: callErr } = await supabase.from("ai_call_sessions").insert(calls);
    if (callErr) console.warn(`    ⚠ Call sessions: ${callErr.message}`);
    else console.log(`    + ${calls.length} sample call sessions`);
  }

  // Save scenario flags
  await supabase
    .from("tenants")
    .update({ context_fields_json: { capabilities: config.capabilities_json } })
    .eq("id", tenantId);

  return tenantId;
}

async function main() {
  const args = process.argv.slice(2);
  const slugFilter = args.length > 0 ? args : null;

  const tenants = slugFilter
    ? TEST_TENANT_MATRIX.filter((t) => slugFilter.includes(t.slug))
    : TEST_TENANT_MATRIX;

  if (tenants.length === 0) {
    console.error("No matching tenants found. Available slugs:");
    TEST_TENANT_MATRIX.forEach((t) => console.error(`  - ${t.slug} (${t.name})`));
    process.exit(1);
  }

  console.log(`\nSeeding ${tenants.length} test tenants...\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const config of tenants) {
    try {
      const result = await seedTenant(config);
      if (result) {
        // Check if it was newly created or already existed
        const { data } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", result)
          .single();
        if (data) created++;
      }
    } catch (err) {
      console.error(`  ✗ FAILED: ${config.name} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone! Created: ${created - skipped}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
