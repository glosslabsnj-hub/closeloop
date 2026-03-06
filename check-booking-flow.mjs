import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\n]+)"?/)?.[1]?.trim();
const BASE = 'https://yltzlvzgwkidbeqaoevp.supabase.co/rest/v1';
const h = { apikey: key, Authorization: `Bearer ${key}` };

// Recent bookings
const bookings = await fetch(`${BASE}/bookings?tenant_id=eq.582b44cf-3026-4a34-a0f9-515c95797405&order=created_at.desc&limit=5&select=id,status,start_at,end_at,created_at,external_event_id,external_provider,review_sent,notes,lead_id,service_id`, { headers: h }).then(r => r.json());
console.log('=== Recent Bookings ===');
for (const b of bookings) console.log(JSON.stringify(b, null, 2));

// Recent messages (SMS)
const msgs = await fetch(`${BASE}/messages?tenant_id=eq.582b44cf-3026-4a34-a0f9-515c95797405&order=created_at.desc&limit=10&select=id,direction,body,status,created_at,channel`, { headers: h }).then(r => r.json());
console.log('\n=== Recent Messages ===');
if (Array.isArray(msgs)) {
  for (const m of msgs) console.log(`[${m.direction}] ${m.body?.substring(0, 100)} (${m.status}, ${m.created_at})`);
} else {
  console.log('Messages response:', JSON.stringify(msgs));
}

// Check booking-handoff function to understand if it creates Square bookings
console.log('\n=== Checking booking flow ===');

// Recent leads
const leads = await fetch(`${BASE}/leads?tenant_id=eq.582b44cf-3026-4a34-a0f9-515c95797405&order=created_at.desc&limit=3&select=id,full_name,phone,status,created_at`, { headers: h }).then(r => r.json());
console.log('\n=== Recent Leads ===');
for (const l of leads) console.log(JSON.stringify(l));
