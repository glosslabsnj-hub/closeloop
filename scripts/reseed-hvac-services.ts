/**
 * Reseed HVAC test tenant services and FAQs with expanded catalog.
 * Usage: npx tsx scripts/reseed-hvac-services.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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
if (!SERVICE_ROLE_KEY) { console.error("Missing SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const HVAC_TENANT_NAME = "Cool Comfort HVAC";

const NEW_SERVICES = [
  { name: "AC Repair", description: "Diagnose and repair AC issues — refrigerant leaks, compressor failure, fan motors, capacitors, and frozen coils", duration_minutes: 90, price_amount: 149, price_type: "quote_only", service_category: "repair", display_order: 1 },
  { name: "Furnace Repair", description: "Diagnose and repair furnace problems — ignitor, blower motor, heat exchanger, gas valve, and pilot light issues", duration_minutes: 90, price_amount: 149, price_type: "quote_only", service_category: "repair", display_order: 2 },
  { name: "AC Tune-Up", description: "Complete AC system inspection, filter replacement, refrigerant check, and performance tune-up", duration_minutes: 60, price_amount: 99, price_type: "fixed", service_category: "maintenance", display_order: 3 },
  { name: "Furnace Inspection", description: "Full furnace safety inspection, filter change, and efficiency check", duration_minutes: 60, price_amount: 89, price_type: "fixed", service_category: "maintenance", display_order: 4 },
  { name: "Full System Service", description: "Complete HVAC system service — AC and heating inspection, cleaning, and calibration", duration_minutes: 120, price_amount: 199, price_type: "fixed", service_category: "maintenance", display_order: 5 },
  { name: "AC Installation", description: "Full central air conditioning system installation — includes removal of old unit, new condenser and evaporator coil, refrigerant lines, and thermostat setup", duration_minutes: 480, price_amount: 3500, price_type: "quote_only", service_category: "installation", display_order: 6 },
  { name: "Furnace Installation", description: "Complete furnace replacement or new installation — gas or electric, includes ductwork connection, venting, and safety testing", duration_minutes: 480, price_amount: 3000, price_type: "quote_only", service_category: "installation", display_order: 7 },
  { name: "Mini-Split Installation", description: "Ductless mini-split heat pump installation — single or multi-zone, wall-mounted indoor units with outdoor condenser", duration_minutes: 360, price_amount: 2500, price_type: "quote_only", service_category: "installation", display_order: 8 },
  { name: "Heat Pump Service", description: "Heat pump inspection, cleaning, and performance check — covers both heating and cooling modes", duration_minutes: 90, price_amount: 129, price_type: "fixed", service_category: "maintenance", display_order: 9 },
  { name: "Duct Cleaning", description: "Professional air duct cleaning to improve air quality and system efficiency", duration_minutes: 180, price_amount: 399, price_type: "quote_only", service_category: "cleaning", display_order: 10 },
  { name: "Thermostat Installation", description: "Installation of smart or standard thermostat with full system calibration", duration_minutes: 60, price_amount: 149, price_type: "fixed", service_category: "installation", display_order: 11 },
  { name: "Emergency Repair", description: "Same-day emergency HVAC repair for AC or heating failures — available 7 days a week", duration_minutes: 120, price_amount: 199, price_type: "quote_only", service_category: "repair", display_order: 12 },
  { name: "Comfort Club Membership", description: "Annual maintenance membership: two tune-ups per year (AC in spring, furnace in fall), priority scheduling, 15% off all repairs, no overtime charges. $14.99/month billed annually.", duration_minutes: 0, price_amount: 14.99, price_type: "fixed", service_category: "maintenance", display_order: 13 },
];

const NEW_FAQS = [
  { question: "What areas do you service?", answer: "We serve a 30-mile radius from Dallas, covering Fort Worth, Arlington, Plano, Irving, Garland, Frisco, and McKinney.", priority_weight: 10 },
  { question: "Do you offer emergency service?", answer: "Yes! We offer same-day emergency repair for AC and heating failures. Call us anytime and we'll dispatch a technician as soon as possible.", priority_weight: 9 },
  { question: "How much does an AC tune-up cost?", answer: "Our standard AC tune-up is $99 and includes a complete system inspection, filter replacement, and refrigerant check.", priority_weight: 8 },
  { question: "Are you licensed and insured?", answer: "Yes, Cool Comfort HVAC is fully licensed, bonded, and insured in the state of Texas.", priority_weight: 7 },
  { question: "Do you offer financing for major jobs?", answer: "Yes, we offer flexible financing through GreenSky and Wells Fargo for system replacements and major repairs. Options include 0% interest for 12 months or low monthly payments up to 72 months. Ask for details when scheduling your free estimate.", priority_weight: 6 },
  { question: "Do you offer a maintenance plan?", answer: "Yes! Our Comfort Club plan is $14.99/month and includes two annual tune-ups (AC in spring, furnace in fall), priority scheduling, 15% off repairs, and no overtime charges. Members catch problems early and save an average of $300/year.", priority_weight: 5 },
  { question: "How often should I service my HVAC system?", answer: "We recommend twice a year — an AC tune-up in spring and a furnace inspection in fall. This prevents breakdowns and keeps your system running efficiently.", priority_weight: 4 },
  { question: "What brands do you work on?", answer: "We service all major brands including Carrier, Trane, Lennox, Rheem, Goodman, and more. Our technicians are factory-trained.", priority_weight: 3 },
];

async function main() {
  // Find HVAC tenant
  const { data: tenant, error: findErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("name", HVAC_TENANT_NAME)
    .maybeSingle();

  if (findErr || !tenant) {
    console.error(`Tenant "${HVAC_TENANT_NAME}" not found: ${findErr?.message}`);
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`Found HVAC tenant: ${tenantId}\n`);

  // Delete old services
  const { error: delSvcErr, count: delSvcCount } = await supabase
    .from("services")
    .delete({ count: "exact" })
    .eq("tenant_id", tenantId);
  console.log(`Deleted ${delSvcCount ?? 0} old services${delSvcErr ? ` (error: ${delSvcErr.message})` : ""}`);

  // Insert new services
  const serviceRows = NEW_SERVICES.map((s) => ({ tenant_id: tenantId, is_active: true, ...s }));
  const { error: insSvcErr } = await supabase.from("services").insert(serviceRows);
  if (insSvcErr) console.error(`Service insert error: ${insSvcErr.message}`);
  else console.log(`Inserted ${serviceRows.length} new services`);

  // Delete old FAQs
  const { error: delFaqErr, count: delFaqCount } = await supabase
    .from("business_faqs")
    .delete({ count: "exact" })
    .eq("tenant_id", tenantId);
  console.log(`Deleted ${delFaqCount ?? 0} old FAQs${delFaqErr ? ` (error: ${delFaqErr.message})` : ""}`);

  // Insert new FAQs
  const faqRows = NEW_FAQS.map((f) => ({ tenant_id: tenantId, ...f }));
  const { error: insFaqErr } = await supabase.from("business_faqs").insert(faqRows);
  if (insFaqErr) console.error(`FAQ insert error: ${insFaqErr.message}`);
  else console.log(`Inserted ${faqRows.length} new FAQs`);

  console.log("\nDone! HVAC tenant reseeded with expanded service catalog.");
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
