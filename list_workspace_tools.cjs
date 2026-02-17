/**
 * LIST ALL WORKSPACE TOOLS
 *
 * See what tools exist at workspace level
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
  console.log("🔍 Fetching all workspace tools...\n");

  const response = await makeRequest('GET', '/v1/convai/tools');

  console.log("Response structure:", JSON.stringify(response.data, null, 2).substring(0, 500));

  const tools = response.data.tools || response.data || [];

  console.log(`Total tools in workspace: ${tools.length}\n`);

  // Group by name to find duplicates
  const toolsByName = {};
  tools.forEach(tool => {
    const name = tool.tool_config?.name || 'unknown';
    if (!toolsByName[name]) {
      toolsByName[name] = [];
    }
    toolsByName[name].push(tool);
  });

  // Show summary
  Object.entries(toolsByName).forEach(([name, instances]) => {
    console.log(`${name}: ${instances.length} instance(s)`);
    instances.forEach(tool => {
      console.log(`  - ${tool.id} (created by: ${tool.access_info?.creator_name})`);
    });
  });

  // Write full list to file
  const fs = require('fs');
  fs.writeFileSync(
    './workspace_tools_full.json',
    JSON.stringify(tools, null, 2)
  );
  console.log("\n📄 Full tool list written to: workspace_tools_full.json");
}

main().catch(error => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
