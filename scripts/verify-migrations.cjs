const https = require('https');
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

function query(sql, label) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ query: sql });
    const opts = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/yltzlvzgwkidbeqaoevp/database/query',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { console.log(`\n--- ${label} (${res.statusCode}) ---`); console.log(d.slice(0, 500)); resolve(); });
    });
    req.on('error', e => { console.error(e); resolve(); });
    req.write(body);
    req.end();
  });
}

async function main() {
  // Check migration history
  await query(
    "SELECT version FROM supabase_migrations.schema_migrations WHERE version >= '20260307220000' ORDER BY version",
    "Migration history"
  );

  // Check dispatch_priority enum values
  await query(
    "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'dispatch_priority') ORDER BY enumsortorder",
    "dispatch_priority enum values"
  );

  // Check fleet_drivers RLS policies
  await query(
    "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'fleet_drivers' ORDER BY policyname",
    "fleet_drivers RLS policies"
  );
}

main();
