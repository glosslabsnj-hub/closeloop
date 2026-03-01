/**
 * Seed "Comfort Zone HVAC" — demo tenant for sales demos.
 *
 * Usage: node scripts/seed-demo-tenant.mjs
 *
 * Uses Supabase service role key to bypass RLS.
 * Follows the pattern from supabase/functions/seed-test-tenants/index.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env manually (no dotenv dependency)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
  if (match) envVars[match[1].trim()] = match[2];
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || 'https://yltzlvzgwkidbeqaoevp.supabase.co';
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Tenant Config ──

const TENANT = {
  name: 'Comfort Zone HVAC',
  slug: 'comfort-zone-hvac',
  address: '847 Route 33, Hamilton, NJ 08690',
  timezone: 'America/New_York',
  business_mode: 'service',
  industry: 'hvac',
  phone_public: '+16097318641',
  website_url: 'https://comfortzonehvac.demo',
  tagline: 'Your comfort is our business',
  hipaa_mode: false,
  enabled_modules: ['voice_ai', 'booking', 'analytics', 'business_brain'],
  capabilities_json: {
    scheduling: true,
    estimates: true,
    ai_voice: true,
    instant_text_back: true,
    emergency_dispatch: false,
    offersFinancing: true,
  },
  cancellation_policy: '24-hour cancellation required. $75 late cancellation fee. $50 deposit required for installations. Diagnostic fee ($89) credited toward repair if you proceed.',
  hours_json: {
    monday:    { closed: false, windows: [{ open: '07:00', close: '18:00' }] },
    tuesday:   { closed: false, windows: [{ open: '07:00', close: '18:00' }] },
    wednesday: { closed: false, windows: [{ open: '07:00', close: '18:00' }] },
    thursday:  { closed: false, windows: [{ open: '07:00', close: '18:00' }] },
    friday:    { closed: false, windows: [{ open: '07:00', close: '17:00' }] },
    saturday:  { closed: false, windows: [{ open: '08:00', close: '14:00' }] },
    sunday:    { closed: true,  windows: [] },
  },
  service_area_json: {
    type: 'radius',
    radius_miles: 30,
    center: { lat: 40.2171, lng: -74.7429 },
    zip_codes: ['08690', '08619', '08648', '08610', '08638', '08540', '08536', '08520', '08534', '08550'],
    description: 'Serving Hamilton, Trenton, Princeton, and surrounding areas within 30 miles',
  },
};

// ── Services ──

const SERVICES = [
  {
    name: 'AC Tune-Up',
    description: 'Complete air conditioning inspection and maintenance. Includes filter replacement, refrigerant check, coil cleaning, thermostat calibration, and full system performance test. Recommended annually before summer.',
    duration_minutes: 60,
    price_amount: 99,
    price_type: 'fixed',
    service_category: 'maintenance',
    display_order: 1,
  },
  {
    name: 'Furnace Inspection',
    description: 'Thorough furnace safety and performance inspection. Includes heat exchanger check, burner cleaning, ignition system test, carbon monoxide testing, and filter replacement. Recommended annually before winter.',
    duration_minutes: 60,
    price_amount: 89,
    price_type: 'fixed',
    service_category: 'maintenance',
    display_order: 2,
  },
  {
    name: 'Full System Service',
    description: 'Complete HVAC system tune-up covering both heating and cooling. Includes everything in our AC Tune-Up and Furnace Inspection plus ductwork visual inspection and airflow balancing.',
    duration_minutes: 120,
    price_amount: 199,
    price_type: 'fixed',
    service_category: 'maintenance',
    display_order: 3,
  },
  {
    name: 'Duct Cleaning',
    description: 'Professional air duct cleaning for improved air quality and system efficiency. Price varies based on home size and number of vents. Includes before-and-after photos.',
    duration_minutes: 180,
    price_amount: 399,
    price_type: 'starting_at',
    service_category: 'cleaning',
    display_order: 4,
  },
  {
    name: 'Thermostat Installation',
    description: 'Professional smart or programmable thermostat installation. Includes wiring, setup, Wi-Fi connection, and walkthrough of features. Price includes standard thermostat; premium models available.',
    duration_minutes: 60,
    price_amount: 149,
    price_type: 'starting_at',
    service_category: 'installation',
    display_order: 5,
  },
  {
    name: 'Emergency Repair',
    description: 'Same-day emergency HVAC repair service. Available 24/7 including nights, weekends, and holidays. $75 after-hours surcharge applies outside regular business hours. Diagnostic fee credited toward repair.',
    duration_minutes: 120,
    price_amount: 199,
    price_type: 'starting_at',
    service_category: 'repair',
    display_order: 6,
  },
  {
    name: 'New System Installation',
    description: 'Complete HVAC system installation including removal of old equipment, new unit installation, ductwork modifications if needed, permits, and full system testing. Free in-home estimate required.',
    duration_minutes: 480,
    price_amount: 0,
    price_type: 'quote_only',
    service_category: 'installation',
    display_order: 7,
  },
  {
    name: 'Indoor Air Quality Assessment',
    description: 'Comprehensive indoor air quality testing and recommendations. Includes particulate measurement, humidity levels, CO2 testing, and a written report with improvement recommendations.',
    duration_minutes: 90,
    price_amount: 149,
    price_type: 'fixed',
    service_category: 'assessment',
    display_order: 8,
  },
];

// ── FAQs ──

const FAQS = [
  { question: 'What areas do you serve?', answer: 'We serve Hamilton, Trenton, Princeton, and all surrounding areas within 30 miles of our office at 847 Route 33, Hamilton, NJ 08690. This covers most of Mercer County and parts of Middlesex, Somerset, and Burlington counties.', priority_weight: 0 },
  { question: 'Do you offer emergency service?', answer: 'Yes, we offer 24/7 emergency repair service. There is a $75 after-hours surcharge for calls outside our regular business hours. Call us anytime and our AI will help you schedule an emergency visit or connect you with a technician.', priority_weight: 1 },
  { question: 'How often should I service my HVAC system?', answer: 'We recommend servicing your system twice a year. Schedule an AC tune-up in spring before summer, and a furnace inspection in fall before winter. Regular maintenance prevents breakdowns, extends equipment life, and keeps your warranty valid.', priority_weight: 2 },
  { question: 'What brands do you service?', answer: 'We service all major HVAC brands including Carrier, Trane, Lennox, Rheem, Goodman, York, Bryant, American Standard, Daikin, and Mitsubishi. Our technicians are factory-trained and certified.', priority_weight: 3 },
  { question: 'Do you offer financing?', answer: 'Yes, we offer flexible financing options for new system installations and major repairs. We partner with GreenSky and Synchrony for 0% APR financing on qualifying purchases. Ask about our current promotions during your free estimate.', priority_weight: 4 },
  { question: 'How long does a new system installation take?', answer: 'A standard residential HVAC installation typically takes one full day, about 8 to 10 hours. More complex jobs involving ductwork modifications may take 2 days. We always clean up after ourselves and do a thorough walkthrough of your new system.', priority_weight: 5 },
  { question: 'What does an AC tune-up include?', answer: 'Our $99 AC tune-up includes filter replacement, refrigerant level check and top-off if needed, evaporator and condenser coil cleaning, thermostat calibration, electrical connection tightening, and a full system performance test with a written report.', priority_weight: 6 },
  { question: 'Do you offer free estimates?', answer: 'Yes, we offer free in-home estimates for new system installations. For repairs, there is an $89 diagnostic fee which gets credited toward the repair if you choose to proceed with us. No hidden fees.', priority_weight: 7 },
  { question: 'Are you licensed and insured?', answer: 'Absolutely. We are fully licensed by the State of New Jersey, bonded, and carry comprehensive general liability and workers compensation insurance. Our technicians are EPA certified and NATE certified.', priority_weight: 8 },
  { question: 'How quickly can you get here?', answer: 'For emergencies, we aim for same-day service and often arrive within 2 to 4 hours. For scheduled appointments, we typically have availability within 1 to 3 business days. During peak summer and winter seasons, booking a week ahead is recommended.', priority_weight: 9 },
  { question: 'Do you have a maintenance plan?', answer: 'Yes, our Comfort Club maintenance plan includes two tune-ups per year (one AC, one furnace), 15% off all repairs, priority scheduling, no after-hours fees, and extended parts warranty. It pays for itself with just the two tune-ups. Ask us for pricing details.', priority_weight: 10 },
  { question: 'My AC is running but not cooling. What should I do?', answer: 'First, check that your thermostat is set to cool and the temperature is set below room temperature. Then check your air filter, as a dirty filter can severely restrict airflow. If those are fine, your system may be low on refrigerant or have a compressor issue. Call us for a diagnostic and we will have it fixed quickly.', priority_weight: 11 },
];

// ── Objection Responses ──

const OBJECTIONS = [
  { objection: 'That seems expensive', response: 'I understand price is a concern. Our rates include everything: parts, labor, and a warranty on the work. Many customers find that investing in proper maintenance actually saves money long-term by preventing costly breakdowns. Would you like to hear about our maintenance plan that includes discounts on all repairs?', priority_weight: 0 },
  { objection: 'I need to think about it', response: 'Of course, take your time. I can send you a summary of what we discussed so you have all the details. Just keep in mind that HVAC issues can get worse over time, especially as the temperature changes. Would you like me to put a tentative appointment on the calendar that you can confirm or cancel later? No obligation.', priority_weight: 1 },
  { objection: 'I want to get another quote', response: 'That is completely reasonable. We are confident in our pricing because we are transparent about everything included. When comparing, make sure to ask about warranty coverage, whether the diagnostic fee is credited toward repairs, and if they are licensed and insured. We are happy to match or beat any written quote from a licensed contractor.', priority_weight: 2 },
  { objection: 'Can you do it cheaper?', response: 'Our prices reflect the quality of our work, certified technicians, and comprehensive warranty. That said, we do have a few options: our Comfort Club members get 15% off all repairs, and we offer financing on larger jobs. Would either of those help?', priority_weight: 3 },
  { objection: 'I will just do it myself', response: 'I appreciate the hands-on approach! For basic tasks like filter changes, that is great. For anything involving refrigerant, electrical work, or gas lines, we strongly recommend a licensed technician for safety and code compliance. DIY work can also void your equipment warranty. We are here when you need us.', priority_weight: 4 },
  { objection: 'I do not have time right now', response: 'No problem at all. We offer flexible scheduling including early morning, evening, and Saturday appointments. Our technicians are always on time and we call ahead so you know exactly when we are arriving. What day works best for your schedule?', priority_weight: 5 },
];

// ── Sample Customers ──

const SAMPLE_CUSTOMERS = [
  { full_name: 'Maria Santos', phone_e164: '+16095551001', email: 'maria.santos@example.com' },
  { full_name: 'James Wilson', phone_e164: '+16095551002', email: 'james.wilson@example.com' },
  { full_name: 'Priya Patel', phone_e164: '+16095551003', email: 'priya.patel@example.com' },
];

// ── AI Assistant Settings ──

const ASSISTANT_SETTINGS = {
  voice_ai_enabled: true,
  instant_text_enabled: true,
  missed_call_behavior: 'ai_callback',
};

// ── Main Seed Function ──

async function seed() {
  console.log('Seeding Comfort Zone HVAC demo tenant...\n');

  // Check if tenant already exists
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('name', TENANT.name)
    .maybeSingle();

  let tenantId;

  if (existing) {
    tenantId = existing.id;
    console.log(`Tenant already exists (${tenantId}). Clearing and re-seeding...`);

    // Clear existing data (FK order)
    for (const table of [
      'ai_call_sessions', 'bookings', 'services', 'business_faqs',
      'objection_responses', 'customers', 'availability_slots',
      'assistant_settings', 'subscriptions',
    ]) {
      await supabase.from(table).delete().eq('tenant_id', tenantId);
    }

    // Update tenant record
    const { error } = await supabase.from('tenants').update({
      address: TENANT.address,
      timezone: TENANT.timezone,
      business_mode: TENANT.business_mode,
      industry: TENANT.industry,
      phone_public: TENANT.phone_public,
      website_url: TENANT.website_url,
      tagline: TENANT.tagline,
      hipaa_mode: TENANT.hipaa_mode,
      enabled_modules: TENANT.enabled_modules,
      capabilities_json: TENANT.capabilities_json,
      cancellation_policy: TENANT.cancellation_policy,
      hours_json: TENANT.hours_json,
      service_area_json: TENANT.service_area_json,
      onboarding_completed_at: new Date().toISOString(),
    }).eq('id', tenantId);

    if (error) throw new Error(`Tenant update failed: ${error.message}`);
  } else {
    // Create new tenant
    const { data, error } = await supabase.from('tenants').insert({
      name: TENANT.name,
      address: TENANT.address,
      timezone: TENANT.timezone,
      business_mode: TENANT.business_mode,
      industry: TENANT.industry,
      phone_public: TENANT.phone_public,
      website_url: TENANT.website_url,
      tagline: TENANT.tagline,
      hipaa_mode: TENANT.hipaa_mode,
      enabled_modules: TENANT.enabled_modules,
      capabilities_json: TENANT.capabilities_json,
      cancellation_policy: TENANT.cancellation_policy,
      hours_json: TENANT.hours_json,
      service_area_json: TENANT.service_area_json,
      onboarding_completed_at: new Date().toISOString(),
    }).select('id').single();

    if (error || !data) throw new Error(`Tenant insert failed: ${error?.message}`);
    tenantId = data.id;
    console.log(`Created tenant: ${tenantId}`);
  }

  // ── Subscription ──
  const { error: subErr } = await supabase.from('subscriptions').insert({
    tenant_id: tenantId,
    plan_code: 'base-200',
    status: 'active',
    current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (subErr) console.warn('Subscription insert:', subErr.message);
  else console.log('  + Subscription (base-200, active, 1 year)');

  // ── Assistant Settings ──
  const { error: aiErr } = await supabase.from('assistant_settings').insert({
    tenant_id: tenantId,
    ...ASSISTANT_SETTINGS,
  });
  if (aiErr) console.warn('Assistant settings insert:', aiErr.message);
  else console.log('  + Assistant settings (professional tone, auto-book)');

  // ── Services ──
  const serviceRows = SERVICES.map(s => ({ tenant_id: tenantId, is_active: true, ...s }));
  const { error: svcErr } = await supabase.from('services').insert(serviceRows);
  if (svcErr) console.warn('Services insert:', svcErr.message);
  else console.log(`  + ${SERVICES.length} services`);

  // ── FAQs ──
  const faqRows = FAQS.map(f => ({ tenant_id: tenantId, ...f }));
  const { error: faqErr } = await supabase.from('business_faqs').insert(faqRows);
  if (faqErr) console.warn('FAQs insert:', faqErr.message);
  else console.log(`  + ${FAQS.length} FAQs`);

  // ── Objection Responses ──
  const objRows = OBJECTIONS.map(o => ({ tenant_id: tenantId, ...o }));
  const { error: objErr } = await supabase.from('objection_responses').insert(objRows);
  if (objErr) console.warn('Objections insert:', objErr.message);
  else console.log(`  + ${OBJECTIONS.length} objection responses`);

  // ── Customers ──
  const custRows = SAMPLE_CUSTOMERS.map(c => ({ tenant_id: tenantId, ...c }));
  const { data: customers, error: custErr } = await supabase.from('customers').insert(custRows).select('id');
  if (custErr) console.warn('Customers insert:', custErr.message);
  else console.log(`  + ${SAMPLE_CUSTOMERS.length} sample customers`);

  // ── Availability Slots (matching business hours) ──
  const daySlots = [
    { day_of_week: 1, start_time: '07:00', end_time: '18:00' }, // Monday
    { day_of_week: 2, start_time: '07:00', end_time: '18:00' }, // Tuesday
    { day_of_week: 3, start_time: '07:00', end_time: '18:00' }, // Wednesday
    { day_of_week: 4, start_time: '07:00', end_time: '18:00' }, // Thursday
    { day_of_week: 5, start_time: '07:00', end_time: '17:00' }, // Friday
    { day_of_week: 6, start_time: '08:00', end_time: '14:00' }, // Saturday
  ];
  const slotRows = daySlots.map(s => ({ tenant_id: tenantId, ...s }));
  const { error: slotErr } = await supabase.from('availability_slots').insert(slotRows);
  if (slotErr) console.warn('Availability slots insert:', slotErr.message);
  else console.log(`  + ${daySlots.length} availability slots`);

  // ── Sample Call Sessions (5 calls to make dashboard look lived-in) ──
  const callStatuses = ['completed', 'completed', 'completed', 'missed', 'voicemail'];
  const callReasons = [
    'AC tune-up scheduling',
    'Emergency repair inquiry',
    'New system installation quote',
    null, // missed
    'Furnace not heating',
  ];
  const callDurations = [185, 240, 310, 12, 45];

  const calls = callStatuses.map((status, i) => {
    const hoursAgo = (i + 1) * 4 + Math.floor(Math.random() * 3);
    const startedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return {
      tenant_id: tenantId,
      started_at: startedAt.toISOString(),
      ended_at: new Date(startedAt.getTime() + callDurations[i] * 1000).toISOString(),
      status,
      caller_phone: `+1609555${1100 + i}`,
      // duration is derived from started_at/ended_at
      summary: callReasons[i],
      customer_id: customers?.[i % 3]?.id || null,
    };
  });
  const { error: callErr } = await supabase.from('ai_call_sessions').insert(calls);
  if (callErr) console.warn('Call sessions insert:', callErr.message);
  else console.log(`  + ${calls.length} sample call sessions`);

  // ── Sample Bookings (3 upcoming appointments) ──
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  // Bookings require lead_id (NOT NULL). Skip sample bookings for now.
  // The AI will create real bookings during demo calls.
  console.log('  (Bookings skipped - lead_id is required, AI will create during demo calls)');

  // ── Phone Number Routing ──
  // Set admin_active_tenant_id so the admin test line routes to this tenant
  // admin_settings uses: id, user_id, admin_active_tenant_id
  // We update all existing rows or insert if none exist
  const { data: adminRows } = await supabase
    .from('admin_settings')
    .select('id')
    .limit(1);

  if (adminRows?.length) {
    const { error: adminErr } = await supabase
      .from('admin_settings')
      .update({ admin_active_tenant_id: tenantId })
      .eq('id', adminRows[0].id);
    if (adminErr) console.warn('Admin setting update:', adminErr.message);
    else console.log('  + Admin active tenant updated');
  } else {
    console.log('  (No admin_settings rows found - set admin_active_tenant_id manually in the dashboard)');
  }

  // Assign a phone number from Twilio inventory
  const { data: phoneNumbers } = await supabase
    .from('phone_numbers')
    .select('id, phone_number')
    .is('tenant_id', null)
    .limit(1);

  if (phoneNumbers?.length) {
    const { error: assignErr } = await supabase
      .from('phone_numbers')
      .update({ tenant_id: tenantId })
      .eq('id', phoneNumbers[0].id);
    if (!assignErr) console.log(`  + Assigned phone number: ${phoneNumbers[0].phone_number}`);
  }

  console.log(`\nDone! Tenant ID: ${tenantId}`);
  console.log('\nNext steps:');
  console.log('1. Call +18553297357 to test (admin line routes to this tenant)');
  console.log('2. Try: "I need my AC serviced" -> should offer $99 tune-up');
  console.log('3. Try: "Do you have emergency service?" -> should explain 24/7 + $75 fee');
  console.log('4. Build Business Brain: POST to /functions/v1/build-business-brain');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
