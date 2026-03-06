/**
 * Seed "Gloss Labs" — mobile auto detailing tenant for Flux Receptionist.
 *
 * Usage: node scripts/seed-gloss-labs-tenant.mjs
 *
 * Uses Supabase service role key to bypass RLS.
 * Follows the pattern from seed-demo-tenant.mjs
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
  name: 'Gloss Labs',
  slug: 'gloss-labs',
  address: '18 Yorkshire Road, Hamilton, NJ 08610',
  timezone: 'America/New_York',
  business_mode: 'service',
  industry: 'auto_detailing',
  phone_public: '+16097318641', // Will update when Twilio number is purchased
  website_url: 'https://glosslabsauto.com',
  tagline: "It's Not Clean Till It's Gloss",
  hipaa_mode: false,
  enabled_modules: ['voice_ai', 'booking', 'analytics', 'business_brain'],
  capabilities_json: {
    scheduling: true,
    estimates: true,
    ai_voice: true,
    instant_text_back: true,
    emergency_dispatch: false,
    offersFinancing: false,
  },
  cancellation_policy: 'Cancellations must be made at least 2 hours before your appointment. Less than 2 hours notice or a no-show will result in a $100 cancellation fee.',
  hours_json: {
    monday:    { closed: false, windows: [{ open: '08:00', close: '18:00' }] },
    tuesday:   { closed: false, windows: [{ open: '08:00', close: '18:00' }] },
    wednesday: { closed: false, windows: [{ open: '08:00', close: '18:00' }] },
    thursday:  { closed: false, windows: [{ open: '08:00', close: '18:00' }] },
    friday:    { closed: false, windows: [{ open: '08:00', close: '18:00' }] },
    saturday:  { closed: false, windows: [{ open: '08:00', close: '18:00' }] },
    sunday:    { closed: true,  windows: [] },
  },
  service_area_json: {
    type: 'radius',
    radius_miles: 25,
    center: { lat: 40.2171, lng: -74.7429 },
    zip_codes: ['08610', '08619', '08690', '08648', '08638', '08540', '08536', '08520', '08534', '08550', '08608', '08611', '08618', '08620', '08628', '08629'],
    description: 'Serving Hamilton, Trenton, Princeton, Lawrenceville, Ewing, Bordentown, and surrounding areas within 25 miles',
  },
};

// ── Services (with vehicle size tiers) ──

const SERVICES = [
  {
    name: 'Exterior Wash',
    description: 'Safe, thorough hand wash with foam pre-soak, pH-neutral wash, wheel and tire cleaning, touch-safe blow dry, and streak-free glass. Safe for ceramic-coated vehicles. Pricing: Sedan $120, SUV $150, Truck/XXL $170. About 1.5 hours.',
    duration_minutes: 90,
    price_amount: 120,
    price_type: 'starting_at',
    service_category: 'wash',
    display_order: 1,
  },
  {
    name: 'Interior Detail',
    description: 'Full vacuum, compressed air cleaning, wipe-down of all surfaces, steam cleaning of high-touch areas, and glass cleaned inside and out. Does not include carpet shampooing, that is available as an add-on. Pricing: Sedan $200, SUV $230, Truck/XXL $300. About 4 hours.',
    duration_minutes: 240,
    price_amount: 200,
    price_type: 'starting_at',
    service_category: 'interior',
    display_order: 2,
  },
  {
    name: 'Interior & Exterior Combo',
    description: 'Complete inside-and-out refresh. Combines our full Interior Detail with our Exterior Wash for that new-car feel. Safe for coated vehicles. Does not include shampoo extraction, clay bar, or paint correction. Pricing: Sedan $280, SUV $330, Truck/XXL $380. About 5.5 hours.',
    duration_minutes: 330,
    price_amount: 280,
    price_type: 'starting_at',
    service_category: 'full_detail',
    display_order: 3,
  },
  {
    name: 'Wash, Clay & Seal',
    description: 'Premium maintenance detail. Includes hand wash, iron and bug decontamination, clay bar treatment, and paint sealant for 4-6 months of glossy protection and hydrophobic water beading. Pricing: Sedan $200, SUV $250, Truck/XXL $280. About 1.5-2 hours.',
    duration_minutes: 90,
    price_amount: 200,
    price_type: 'starting_at',
    service_category: 'protection',
    display_order: 4,
  },
  {
    name: 'Paint Correction',
    description: 'Machine polishing to remove swirls, haze, and defects. Choose 1-Step for light imperfections or 2-Step for deeper correction. Includes prep wash, iron remover, clay decon, masking, and panel wipe. 1-Step: Sedan $500, SUV $600, Truck $700. 2-Step: Sedan $800, SUV $900, Truck $1,000. 6-12 hours.',
    duration_minutes: 360,
    price_amount: 500,
    price_type: 'starting_at',
    service_category: 'correction',
    display_order: 5,
  },
  {
    name: 'Ceramic Coating',
    description: 'Professional ceramic coating for long-lasting paint protection. Choose 1, 3, or 5 year durability. Pricing includes prep wash and decon. Add paint correction for best results. Prep Only: 1yr $600, 3yr $900, 5yr $1,200. With 1-Step Correction: 1yr $1,000, 3yr $1,200, 5yr $1,400. With 2-Step Correction: 1yr $1,400, 3yr $1,600, 5yr $2,000. Full day.',
    duration_minutes: 480,
    price_amount: 600,
    price_type: 'starting_at',
    service_category: 'protection',
    display_order: 6,
  },
];

// ── FAQs ──

const FAQS = [
  { question: 'Where are you located?', answer: 'Our shop is at 18 Yorkshire Road in Hamilton, NJ 08610. You can drop your car off or we also offer mobile detailing and will come to you anywhere in New Jersey. There is a $50 service fee for mobile appointments beyond 25 miles. We serve Hamilton, Trenton, Princeton, Lawrenceville, Ewing, Bordentown, and all surrounding areas.', priority_weight: 0 },
  { question: 'How long does a detail take?', answer: 'It depends on the service. An exterior wash takes about an hour and a half. Interior detail is about 4 hours. The interior and exterior combo is about 5 and a half hours. Paint correction is 6 to 12 hours depending on the level. Ceramic coating takes a full day. We will give you an exact estimate when you book.', priority_weight: 1 },
  { question: 'What do I need to provide?', answer: 'If you are coming to our shop, just drop off your vehicle and we handle the rest. For mobile appointments, just make sure we have access to your vehicle and ideally an outdoor electrical outlet and water spigot nearby. We bring all our own equipment, products, and water if needed. We are fully self-sufficient.', priority_weight: 2 },
  { question: 'Do you detail at businesses?', answer: 'Absolutely! We work with businesses to keep their fleet vehicles looking professional. We can come to your lot on a regular schedule. We offer volume pricing for 3 or more vehicles. Great for HVAC companies, plumbers, electricians, real estate agents, and any business with branded vehicles.', priority_weight: 3 },
  { question: 'What is ceramic coating?', answer: 'Ceramic coating is a liquid polymer that bonds to your paint and creates a protective layer. It makes your car hydrophobic, meaning water beads up and rolls right off. It protects against UV damage, bird droppings, tree sap, and minor scratches. Our coating lasts 2 or more years with proper maintenance.', priority_weight: 4 },
  { question: 'How much does it cost?', answer: 'Pricing depends on the service and vehicle size. Exterior wash starts at $120 for sedans. Interior detail starts at $200. The combo is $280. Wash clay and seal is $200. Paint correction starts at $500 for 1-step. Ceramic coating starts at $600 for a 1-year prep-only package. SUVs and trucks are a bit more due to the extra surface area. We also have add-ons like upholstery shampoo, pet hair removal, headlight restoration, and more. We can give you an exact quote based on your vehicle.', priority_weight: 5 },
  { question: 'How do I book?', answer: 'You can book online at glosslabsauto.com, call us at 609-731-8641, or send a DM on Instagram at @glosslabsnj. You can also stop by our shop at 18 Yorkshire Road in Hamilton. We will confirm your appointment and send you a reminder the day before.', priority_weight: 6 },
  { question: 'What products do you use?', answer: 'We use professional-grade products including CarPro, Gyeon, and Chemical Guys. All products are safe for all paint types, clear coats, and vehicle surfaces. We never use automatic car wash chemicals.', priority_weight: 7 },
  { question: 'Do you offer gift certificates?', answer: 'Yes! Gift certificates are available for any service. A detail makes a great gift. Contact us to purchase one.', priority_weight: 8 },
  { question: 'What if it rains?', answer: 'If rain is in the forecast, we will contact you to reschedule at no charge. For ceramic coating specifically, we need a full dry day. We monitor the weather closely and will always reach out in advance if we need to move your appointment.', priority_weight: 9 },
];

// ── Objection Responses ──

const OBJECTIONS = [
  { objection: 'That seems expensive', response: 'I understand. Keep in mind we use professional-grade products and spend real time on your vehicle, not a 10-minute automatic wash. You can drop off at our shop or we come to you. Our customers consistently say the results speak for themselves. We have 35 five-star Google reviews. Would you like to start with our exterior wash at $120 to see the difference?', priority_weight: 0 },
  { objection: 'I can just go to a car wash', response: 'Automatic car washes are convenient, but they use harsh brushes and chemicals that can damage your paint over time. Our hand wash and detail process is much gentler and thorough. Plus, we come to you, so you save the trip. The difference in results is night and day.', priority_weight: 1 },
  { objection: 'I need to think about it', response: 'No problem at all. We are here when you are ready. Just keep in mind that regular detailing actually protects your paint and preserves your car value long-term. Would you like me to send you some before-and-after photos so you can see what to expect?', priority_weight: 2 },
  { objection: 'Can you do it cheaper?', response: 'Our pricing reflects the quality of our work and products. That said, we do offer some flexibility. If you have multiple vehicles or want to set up a recurring schedule, we can work out a better rate. Fleet customers get volume pricing too.', priority_weight: 3 },
];

// ── AI Assistant Settings ──

const ASSISTANT_SETTINGS = {
  voice_ai_enabled: true,
  instant_text_enabled: true,
  missed_call_behavior: 'ai_callback',
};

// ── Main Seed Function ──

async function seed() {
  console.log('Seeding Gloss Labs tenant...\n');

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
  else console.log('  + Assistant settings');

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

  // ── Availability Slots (matching business hours) ──
  const daySlots = [
    { day_of_week: 1, start_time: '08:00', end_time: '18:00' }, // Monday
    { day_of_week: 2, start_time: '08:00', end_time: '18:00' }, // Tuesday
    { day_of_week: 3, start_time: '08:00', end_time: '18:00' }, // Wednesday
    { day_of_week: 4, start_time: '08:00', end_time: '18:00' }, // Thursday
    { day_of_week: 5, start_time: '08:00', end_time: '18:00' }, // Friday
    { day_of_week: 6, start_time: '08:00', end_time: '18:00' }, // Saturday
  ];
  const slotRows = daySlots.map(s => ({ tenant_id: tenantId, ...s }));
  const { error: slotErr } = await supabase.from('availability_slots').insert(slotRows);
  if (slotErr) console.warn('Availability slots insert:', slotErr.message);
  else console.log(`  + ${daySlots.length} availability slots`);

  console.log('\nGloss Labs tenant seeded successfully!');
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Slug: ${TENANT.slug}`);
  console.log('\nNext steps:');
  console.log('  1. Buy a Twilio 609 number for Gloss Labs');
  console.log('  2. Update phone_public with the new number');
  console.log('  3. Configure ElevenLabs agent for Gloss Labs voice');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
