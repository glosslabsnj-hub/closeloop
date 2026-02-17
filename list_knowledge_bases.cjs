/**
 * LIST ALL KNOWLEDGE BASES
 */

const https = require('https');

const ELEVENLABS_API_KEY = "0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b";

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: path,
      method: method,
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log("🔍 Listing all knowledge bases in workspace...\n");

  const response = await makeRequest('GET', '/v1/convai/knowledge-base');

  console.log("Response structure:", JSON.stringify(response.data, null, 2).substring(0, 500));

  const kbs = Array.isArray(response.data) ? response.data : (response.data.documents || response.data.knowledge_base || []);

  console.log(`\nTotal knowledge bases: ${kbs.length}\n`);

  kbs.forEach((kb, i) => {
    console.log(`[${i + 1}] ${kb.name}`);
    console.log(`    ID: ${kb.id}`);
    console.log(`    Type: ${kb.type}`);
    if (kb.created_at) console.log(`    Created: ${new Date(kb.created_at).toLocaleDateString()}`);
    console.log('');
  });

  // Write to file
  const fs = require('fs');
  fs.writeFileSync(
    './knowledge_bases_list.json',
    JSON.stringify(kbs, null, 2)
  );
  console.log("📄 Full list written to: knowledge_bases_list.json");
}

main().catch(error => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
