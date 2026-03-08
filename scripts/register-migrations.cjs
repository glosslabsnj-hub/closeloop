const https = require('https');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES
  ('20260307220000', 'fix_dispatch_module_and_customer_id', ARRAY['applied']),
  ('20260307220001', 'fix_fleet_rls_manager_role', ARRAY['applied']),
  ('20260307230000', 'add_emergency_dispatch_priority', ARRAY['applied']),
  ('20260307235000', 'fleet_rls_super_admin_bypass', ARRAY['applied'])
ON CONFLICT (version) DO NOTHING`;

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
  res.on('end', () => console.log(res.statusCode, d.slice(0, 300)));
});
req.on('error', e => console.error(e));
req.write(body);
req.end();
