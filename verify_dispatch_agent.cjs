/**
 * VERIFY DISPATCH AGENT CONFIGURATION
 *
 * Fetch current agent state to see what's actually configured
 */

const https = require('https');

const ELEVENLABS_API_KEY = "0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b";
const AGENT_ID = "agent_2601kghfpmckez3t2n6p7bmcpac4";

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
  console.log("🔍 Fetching DISPATCH agent configuration...\n");

  const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
  const agent = response.data;

  // Check knowledge base
  console.log("📚 KNOWLEDGE BASE:");
  if (agent.conversation_config?.agent?.knowledge_base) {
    const kb = agent.conversation_config.agent.knowledge_base;
    console.log(`   Count: ${kb.length}`);
    kb.forEach((item, i) => {
      console.log(`   [${i + 1}] Type: ${item.type}`);
      console.log(`       Name: ${item.name}`);
      console.log(`       ID: ${item.id}`);
      console.log(`       Usage: ${item.usage_mode}`);
    });
  } else {
    console.log("   ❌ NO KNOWLEDGE BASE CONFIGURED");
  }

  // Check tools
  console.log("\n🔧 TOOLS:");
  if (agent.conversation_config?.agent?.tool_ids) {
    const tools = agent.conversation_config.agent.tool_ids;
    console.log(`   Count: ${tools.length}`);
    tools.forEach((toolId, i) => {
      console.log(`   [${i + 1}] ${toolId}`);
    });
  } else {
    console.log("   ❌ NO TOOLS CONFIGURED");
  }

  // Check prompt length
  console.log("\n📝 SYSTEM PROMPT:");
  if (agent.conversation_config?.agent?.prompt?.prompt) {
    const promptLength = agent.conversation_config.agent.prompt.prompt.length;
    console.log(`   Length: ${promptLength.toLocaleString()} characters`);
  } else {
    console.log("   ❌ NO PROMPT CONFIGURED");
  }

  // Write full config to file for inspection
  const fs = require('fs');
  fs.writeFileSync(
    './dispatch_agent_current_config.json',
    JSON.stringify(agent, null, 2)
  );
  console.log("\n📄 Full config written to: dispatch_agent_current_config.json");
}

main().catch(error => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
