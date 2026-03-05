/**
 * Seed "Rapid Response Towing" — dispatch mode demo tenant.
 *
 * Usage: node scripts/seed-dispatch-demo.mjs
 *
 * Uses Supabase service role key to bypass RLS.
 * Seeds: tenant, dispatch_workflow_config, dispatch_coverage_zones,
 *        dispatch_policies, dispatch_delivery_settings, FAQs, customers,
 *        sample dispatch jobs, and call sessions.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
  name: 'Rapid Response Towing',
  slug: 'rapid-response-towing',
  address: '2100 US Route 1, North Brunswick, NJ 08902',
  timezone: 'America/New_York',
  business_mode: 'dispatch',
  industry: 'towing',
  phone_public: '+18553297357',
  website_url: 'https://rapidresponsetowing.demo',
  tagline: '24/7 Towing & Roadside Assistance',
  hipaa_mode: false,
  enabled_modules: ['voice_ai', 'dispatch', 'analytics', 'business_brain'],
  capabilities_json: {
    scheduling: false,
    estimates: false,
    ai_voice: true,
    instant_text_back: true,
    emergency_dispatch: true,
    dispatch_tracking: true,
  },
  cancellation_policy: 'Free cancellation before truck is dispatched. $50 fee after dispatch. $75 fee if driver is en route. Full charge if driver is on scene.',
  hours_json: {
    monday:    { closed: false, windows: [{ open: '00:00', close: '23:59' }] },
    tuesday:   { closed: false, windows: [{ open: '00:00', close: '23:59' }] },
    wednesday: { closed: false, windows: [{ open: '00:00', close: '23:59' }] },
    thursday:  { closed: false, windows: [{ open: '00:00', close: '23:59' }] },
    friday:    { closed: false, windows: [{ open: '00:00', close: '23:59' }] },
    saturday:  { closed: false, windows: [{ open: '00:00', close: '23:59' }] },
    sunday:    { closed: false, windows: [{ open: '00:00', close: '23:59' }] },
  },
  service_area_json: {
    type: 'radius',
    radius_miles: 40,
    center: { lat: 40.4495, lng: -74.4816 },
    zip_codes: ['08902', '08901', '08903', '08816', '08852', '08540', '08536', '08810', '08812', '08824', '08850', '08854', '08857', '08859', '08873', '08875', '08876', '08880', '08882', '08884'],
    description: 'Central New Jersey. North Brunswick, New Brunswick, Edison, Princeton, Somerset, and surrounding areas within 40 miles.',
  },
};

// ── Dispatch Workflow Config ──

const WORKFLOW_CONFIG = {
  vehicle_info_timing: 'before_pricing',
  vehicle_affects_pricing: true,
  required_vehicle_fields: ['year', 'make', 'model'],
  luxury_flatbed_recommendation: true,
  luxury_brands: ['Tesla', 'BMW', 'Mercedes', 'Audi', 'Porsche', 'Lexus', 'Jaguar', 'Land Rover', 'Maserati', 'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini'],
  awd_detection_enabled: true,
  motorcycle_special_handling: true,
  ask_payment_method: true,
  payment_timing: 'on_arrival',
  require_payment_confirmation: false,
  accepted_methods: ['cash', 'credit_card', 'debit_card'],
  payment_due_message: 'Payment is due when the driver arrives. We accept cash, credit, and debit cards.',
  confirm_geocoded_address: true,
  require_zip_code: true,
  address_confirmation_script: 'Let me confirm your location. You said {{address}} in {{city}}, correct?',
  driver_callback_script: 'Your driver will call you from their personal number about 5 minutes before arrival. Please keep your phone on.',
  include_direct_contact_info: false,
  escalation_number: '+16097318641',
  service_dropoff_rules: {
    default_dropoff: 'customer_choice',
    allow_specific_shop: true,
    impound_requires_authorization: true,
  },
};

// ── Dispatch Coverage Zones ──

const COVERAGE_ZONES = [
  {
    zone_name: 'Local Zone',
    zone_type: 'standard',
    definition_type: 'radius',
    min_miles: 0,
    max_miles: 10,
    zip_codes: ['08902', '08901', '08903', '08816', '08852'],
    base_rate_cents: 7500,
    per_mile_rate_cents: 0,
    minimum_charge_cents: 7500,
    eta_base_minutes: 15,
    eta_per_mile_minutes: 1.5,
    is_active: true,
    available_24_7: true,
    priority_order: 1,
  },
  {
    zone_name: 'Standard Zone',
    zone_type: 'standard',
    definition_type: 'radius',
    min_miles: 10,
    max_miles: 25,
    zip_codes: ['08540', '08536', '08810', '08812', '08824', '08850', '08854', '08857'],
    base_rate_cents: 9500,
    per_mile_rate_cents: 350,
    minimum_charge_cents: 9500,
    eta_base_minutes: 25,
    eta_per_mile_minutes: 2,
    is_active: true,
    available_24_7: true,
    priority_order: 2,
  },
  {
    zone_name: 'Extended Zone',
    zone_type: 'remote',
    definition_type: 'radius',
    min_miles: 25,
    max_miles: 40,
    zip_codes: ['08859', '08873', '08875', '08876', '08880', '08882', '08884'],
    base_rate_cents: 12500,
    per_mile_rate_cents: 450,
    minimum_charge_cents: 12500,
    eta_base_minutes: 35,
    eta_per_mile_minutes: 2.5,
    is_active: true,
    available_24_7: false,
    available_hours: {
      monday: { start: '06:00', end: '22:00' },
      tuesday: { start: '06:00', end: '22:00' },
      wednesday: { start: '06:00', end: '22:00' },
      thursday: { start: '06:00', end: '22:00' },
      friday: { start: '06:00', end: '23:00' },
      saturday: { start: '06:00', end: '23:00' },
      sunday: { start: '07:00', end: '21:00' },
    },
    priority_order: 3,
  },
  {
    zone_name: 'NJ Turnpike',
    zone_type: 'highway',
    definition_type: 'highway',
    highway_numbers: ['NJ Turnpike', 'I-95', 'Garden State Parkway'],
    base_rate_cents: 15000,
    per_mile_rate_cents: 500,
    minimum_charge_cents: 15000,
    eta_base_minutes: 30,
    eta_per_mile_minutes: 2,
    is_active: true,
    available_24_7: true,
    priority_order: 4,
  },
];

// ── Dispatch Policies ──

const POLICIES = {
  payment_due_at_service: true,
  accepted_payment_methods: ['cash', 'credit_card', 'debit_card'],
  cash_only_after_hours: false,
  prepayment_required: false,
  cancel_after_dispatch_fee_cents: 5000,
  cancel_en_route_fee_cents: 7500,
  cancel_on_scene_fee_cents: null,  // full charge
  storage_daily_rate_cents: 4500,
  storage_max_days: 30,
  storage_grace_period_hours: 24,
  storage_lien_sale_days: 90,
  release_requires_id: true,
  release_requires_registration: true,
  release_requires_title: false,
  release_requires_insurance: true,
  release_authorized_agent_allowed: true,
  release_police_hold_policy: 'Vehicles on police hold cannot be released without a written police release form.',
  damage_waiver_text: 'We are not responsible for pre-existing damage. All vehicles are inspected and photographed before towing.',
  pre_existing_damage_policy: 'Driver photographs vehicle from 4 angles before hook-up.',
  liability_limit_cents: 50000000,
  insurance_requirement_text: 'Fully insured. $500,000 garage keepers liability.',
  lockout_attempt_limit: 3,
  lockout_disclaimer: 'If we cannot unlock your vehicle after 3 attempts, a locksmith referral will be provided at no additional charge.',
  spare_key_policy: 'We do not cut keys. Lockout service only opens the vehicle door.',
  priority_fee_percentage: 25,
  emergency_surcharge_cents: 5000,
};

// ── Delivery Settings ──

const DELIVERY_SETTINGS = {
  enabled: true,
  handoff_methods: {
    primary: 'sms',
    secondary: 'webhook',
    fallback: 'email',
  },
  notify_email: 'dispatch@rapidresponsetowing.demo',
  notify_phone: '+16097318641',
  urgent_sms_phone: '+16097318641',
};

// ── FAQs ──

const FAQS = [
  { question: 'How much does a tow cost?', answer: 'Our rates start at $75 for local tows within 10 miles. Beyond that, it depends on distance and vehicle type. The AI will give you an exact quote based on your location and vehicle. We always quote before dispatching.', priority_weight: 0 },
  { question: 'How long until the truck arrives?', answer: 'Typical arrival time is 15 to 45 minutes depending on your location and traffic. We provide a specific ETA when we dispatch and the driver will call you about 5 minutes before arrival.', priority_weight: 1 },
  { question: 'Do you tow all vehicles?', answer: 'We tow cars, trucks, SUVs, motorcycles, and light commercial vehicles. For luxury and AWD vehicles, we use a flatbed to prevent damage. Heavy duty and commercial vehicles require special equipment. Call and we will let you know.', priority_weight: 2 },
  { question: 'What payment methods do you accept?', answer: 'We accept cash, credit cards, and debit cards. Payment is due when the driver arrives. We do not require prepayment.', priority_weight: 3 },
  { question: 'Can you tow my car to a specific shop?', answer: 'Absolutely. You can choose any destination. Just provide the address and we will tow your vehicle there. If you do not have a preference, we can suggest a nearby shop.', priority_weight: 4 },
  { question: 'Are you available 24/7?', answer: 'Yes, we operate 24 hours a day, 7 days a week, 365 days a year. Local zone service is always available. Extended zone hours are 6 AM to 10 PM weekdays, slightly longer on weekends.', priority_weight: 5 },
  { question: 'I locked my keys in my car. Can you help?', answer: 'Yes, we offer lockout service. Our driver can unlock most vehicles. If the vehicle cannot be opened after 3 attempts, we will refer you to a locksmith at no charge. Lockout service pricing starts at $65.', priority_weight: 6 },
  { question: 'My car broke down on the highway. What do I do?', answer: 'Stay in your vehicle with hazard lights on if possible. Call us and we will dispatch a truck immediately. Highway tows have a slightly higher rate due to safety requirements but we prioritize highway calls. Give us your exact location or mile marker.', priority_weight: 7 },
  { question: 'Do you offer roadside assistance?', answer: 'Yes. We offer jump starts, tire changes, fuel delivery, and lockout service in addition to towing. Let our AI know what you need and we will send the right help.', priority_weight: 8 },
  { question: 'How do I get my car out of impound?', answer: 'Bring a valid photo ID and current vehicle registration to our lot during business hours. Insurance proof is also required. There is a 24-hour grace period before storage fees begin. After that, storage is $45 per day.', priority_weight: 9 },
];

// ── Objection Responses ──

const OBJECTIONS = [
  { objection: 'That is too expensive', response: 'I understand. Our rates are competitive for the area and include everything: the tow, insurance coverage, and no hidden fees. Many roadside clubs charge less but have long wait times. We prioritize fast response and safe handling of your vehicle.', priority_weight: 0 },
  { objection: 'My insurance covers towing', response: 'Great, many insurance policies do cover towing. You can use our service and submit the receipt to your insurance for reimbursement. We provide itemized receipts. Would you like us to dispatch a truck now and you can sort the insurance after?', priority_weight: 1 },
  { objection: 'Can you give me a discount?', response: 'Our pricing is based on distance and vehicle type with no markups. What I can tell you is we have no hidden fees, no hookup charges, and no mileage surprises. The price quoted is the price you pay.', priority_weight: 2 },
  { objection: 'I will just call AAA', response: 'That is totally fine. Just be aware that wait times with AAA can be 1 to 3 hours depending on demand. We can typically have a truck to you in 15 to 45 minutes. If time matters, we are the faster option.', priority_weight: 3 },
];

// ── Sample Customers ──

const SAMPLE_CUSTOMERS = [
  { full_name: 'Mike Hernandez', phone_e164: '+17325551001', email: 'mike.hernandez@example.com' },
  { full_name: 'Sarah Chen', phone_e164: '+17325551002', email: 'sarah.chen@example.com' },
  { full_name: 'Robert Johnson', phone_e164: '+17325551003', email: 'robert.johnson@example.com' },
];

// ── AI Assistant Settings ──

const ASSISTANT_SETTINGS = {
  voice_ai_enabled: true,
  instant_text_enabled: true,
  missed_call_behavior: 'ai_callback',
};

// ── Main Seed Function ──

async function seed() {
  console.log('Seeding Rapid Response Towing (dispatch mode) demo tenant...\n');

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

    for (const table of [
      'dispatch_jobs', 'dispatch_coverage_zones', 'dispatch_workflow_config',
      'dispatch_policies', 'dispatch_delivery_settings',
      'ai_call_sessions', 'bookings', 'services', 'business_faqs',
      'objection_responses', 'customers', 'availability_slots',
      'assistant_settings', 'subscriptions',
    ]) {
      const { error } = await supabase.from(table).delete().eq('tenant_id', tenantId);
      if (error && !error.message.includes('does not exist')) {
        console.warn(`  Clear ${table}: ${error.message}`);
      }
    }

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
  if (subErr) console.warn('Subscription:', subErr.message);
  else console.log('  + Subscription (base-200, active, 1 year)');

  // ── Assistant Settings ──
  const { error: aiErr } = await supabase.from('assistant_settings').insert({
    tenant_id: tenantId,
    ...ASSISTANT_SETTINGS,
  });
  if (aiErr) console.warn('Assistant settings:', aiErr.message);
  else console.log('  + Assistant settings');

  // ── Dispatch Workflow Config ──
  const { error: wfErr } = await supabase.from('dispatch_workflow_config').insert({
    tenant_id: tenantId,
    ...WORKFLOW_CONFIG,
  });
  if (wfErr) console.warn('Workflow config:', wfErr.message);
  else console.log('  + Dispatch workflow config');

  // ── Dispatch Coverage Zones ──
  const zoneRows = COVERAGE_ZONES.map(z => ({ tenant_id: tenantId, ...z }));
  const { error: zoneErr } = await supabase.from('dispatch_coverage_zones').insert(zoneRows);
  if (zoneErr) console.warn('Coverage zones:', zoneErr.message);
  else console.log(`  + ${COVERAGE_ZONES.length} coverage zones`);

  // ── Dispatch Policies ──
  const { error: polErr } = await supabase.from('dispatch_policies').insert({
    tenant_id: tenantId,
    ...POLICIES,
  });
  if (polErr) console.warn('Dispatch policies:', polErr.message);
  else console.log('  + Dispatch policies');

  // ── Delivery Settings ──
  const { error: delErr } = await supabase.from('dispatch_delivery_settings').insert({
    tenant_id: tenantId,
    ...DELIVERY_SETTINGS,
  });
  if (delErr) console.warn('Delivery settings:', delErr.message);
  else console.log('  + Delivery settings');

  // ── FAQs ──
  const faqRows = FAQS.map(f => ({ tenant_id: tenantId, ...f }));
  const { error: faqErr } = await supabase.from('business_faqs').insert(faqRows);
  if (faqErr) console.warn('FAQs:', faqErr.message);
  else console.log(`  + ${FAQS.length} FAQs`);

  // ── Objection Responses ──
  const objRows = OBJECTIONS.map(o => ({ tenant_id: tenantId, ...o }));
  const { error: objErr } = await supabase.from('objection_responses').insert(objRows);
  if (objErr) console.warn('Objections:', objErr.message);
  else console.log(`  + ${OBJECTIONS.length} objection responses`);

  // ── Customers ──
  const custRows = SAMPLE_CUSTOMERS.map(c => ({ tenant_id: tenantId, ...c }));
  const { data: customers, error: custErr } = await supabase.from('customers').insert(custRows).select('id');
  if (custErr) console.warn('Customers:', custErr.message);
  else console.log(`  + ${SAMPLE_CUSTOMERS.length} sample customers`);

  // ── Sample Dispatch Jobs (make dashboard look lived-in) ──
  const jobStatuses = ['completed', 'completed', 'en_route', 'pending', 'cancelled'];
  const jobTypes = ['Standard Tow', 'Flatbed Tow', 'Jump Start', 'Lockout', 'Standard Tow'];
  const jobDescriptions = [
    'Flat tire, needs tow to Firestone on Route 1',
    '2024 Tesla Model 3, flatbed required, tow to Tesla service center',
    'Dead battery, needs jump start in parking lot',
    'Keys locked in 2019 Honda Civic',
    'Customer cancelled - got car started',
  ];
  const jobPriorities = ['normal', 'normal', 'high', 'normal', 'low'];
  const priceCents = [9500, 15000, 6500, 6500, 0];

  const jobs = jobStatuses.map((status, i) => {
    const hoursAgo = (i + 1) * 3 + Math.floor(Math.random() * 2);
    const requestedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return {
      tenant_id: tenantId,
      job_number: `RRT-${String(1000 + i).padStart(4, '0')}`,
      status,
      priority: jobPriorities[i],
      pickup_address: ['123 Main St, North Brunswick, NJ 08902', '456 Route 1, Edison, NJ 08817', '789 College Ave, New Brunswick, NJ 08901', '321 Livingston Ave, New Brunswick, NJ 08901', '555 Route 27, Somerset, NJ 08873'][i],
      dropoff_address: status === 'cancelled' ? null : ['Firestone, 1200 Route 1, North Brunswick, NJ 08902', 'Tesla Service Center, 100 Tesla Rd, Springfield, NJ 07081', null, null, 'Pep Boys, 800 Route 18, East Brunswick, NJ 08816'][i],
      job_type: jobTypes[i],
      description: jobDescriptions[i],
      customer_name: ['Mike Hernandez', 'Sarah Chen', 'Robert Johnson', 'Lisa Park', 'Dave Wilson'][i],
      customer_phone: [`+1732555100${i + 1}`],
      customer_id: customers?.[i % 3]?.id || null,
      price_cents: priceCents[i],
      estimated_duration_minutes: [45, 60, 15, 20, 0][i],
      requested_at: requestedAt.toISOString(),
      scheduled_at: status === 'pending' ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
      dispatched_at: ['completed', 'en_route'].includes(status) ? new Date(requestedAt.getTime() + 5 * 60 * 1000).toISOString() : null,
      arrived_at: status === 'completed' ? new Date(requestedAt.getTime() + 25 * 60 * 1000).toISOString() : null,
      completed_at: status === 'completed' ? new Date(requestedAt.getTime() + 50 * 60 * 1000).toISOString() : null,
      assigned_crew: status !== 'pending' && status !== 'cancelled' ? ['Driver A - Tom', 'Driver B - Ray', 'Driver A - Tom'][i % 3] : null,
      assigned_vehicle: status !== 'pending' && status !== 'cancelled' ? ['Truck 1 - Flatbed', 'Truck 2 - Flatbed', 'Van 1 - Service'][i % 3] : null,
    };
  });
  const { error: jobErr } = await supabase.from('dispatch_jobs').insert(jobs);
  if (jobErr) console.warn('Dispatch jobs:', jobErr.message);
  else console.log(`  + ${jobs.length} sample dispatch jobs`);

  // ── Sample Call Sessions ──
  const callStatuses = ['completed', 'completed', 'completed', 'missed', 'voicemail'];
  const callReasons = ['Standard tow request', 'Flatbed tow for Tesla', 'Jump start needed', null, 'Lockout help needed'];
  const callDurations = [150, 210, 120, 8, 35];

  const calls = callStatuses.map((status, i) => {
    const hoursAgo = (i + 1) * 5 + Math.floor(Math.random() * 3);
    const startedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return {
      tenant_id: tenantId,
      started_at: startedAt.toISOString(),
      ended_at: new Date(startedAt.getTime() + callDurations[i] * 1000).toISOString(),
      status,
      caller_phone: `+1732555${1100 + i}`,
      summary: callReasons[i],
      customer_id: customers?.[i % 3]?.id || null,
    };
  });
  const { error: callErr } = await supabase.from('ai_call_sessions').insert(calls);
  if (callErr) console.warn('Call sessions:', callErr.message);
  else console.log(`  + ${calls.length} sample call sessions`);

  console.log(`\nDone! Tenant ID: ${tenantId}`);
  console.log('\nNext steps:');
  console.log('1. Build Business Brain: POST to /functions/v1/build-business-brain');
  console.log('2. Test via text simulator: set tenant to this ID');
  console.log('3. Try: "I need a tow" -> should ask location, vehicle, quote price');
  console.log('4. Try: "My car broke down on the turnpike" -> highway zone pricing');
  console.log('5. Try: "How much for a tow?" -> should ask location first, then quote');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
