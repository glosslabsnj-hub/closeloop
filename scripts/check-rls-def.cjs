const https = require('https');
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'fleet_drivers' AND cmd = 'INSERT'`;

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
  res.on('end', () => console.log(res.statusCode, d));
});
req.write(body);
req.end();
