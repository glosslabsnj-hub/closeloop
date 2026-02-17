/**
 * CHECK SERVICE AGENT STATUS
 */

const https = require('https');

const ELEVENLABS_API_KEY = "0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b";
const SERVICE_AGENT_ID = "agent_4701kg1vwhzqfxmvzh032nhvx434";

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
  console.log("🔍 Checking SERVICE agent configuration...\n");

  const response = await makeRequest('GET', `/v1/convai/agents/${SERVICE_AGENT_ID}`);
  const agent = response.data;

  // Check knowledge base
  console.log("📚 KNOWLEDGE BASE:");
  if (agent.conversation_config?.agent?.knowledge_base) {
    const kb = agent.conversation_config.agent.knowledge_base;
    console.log(`   Count: ${kb.length}`);
    kb.forEach((item, i) => {
      console.log(`   [${i + 1}] Type: ${item.type}, Name: ${item.name}, ID: ${item.id}`);
    });
  } else {
    console.log("   ❌ NO KNOWLEDGE BASE");
  }

  // Check tools
  console.log("\n🔧 TOOLS:");
  if (agent.conversation_config?.agent?.tool_ids) {
    const tools = agent.conversation_config.agent.tool_ids;
    console.log(`   Count: ${tools.length}`);
    console.log(`   IDs: ${tools.join(', ')}`);
  } else {
    console.log("   ❌ NO TOOLS");
  }

  // Check prompt
  console.log("\n📝 SYSTEM PROMPT:");
  if (agent.conversation_config?.agent?.prompt?.prompt) {
    const promptLength = agent.conversation_config.agent.prompt.prompt.length;
    console.log(`   Length: ${promptLength.toLocaleString()} characters`);
  } else {
    console.log("   ❌ NO PROMPT");
  }

  // Write to file
  const fs = require('fs');
  fs.writeFileSync(
    './service_agent_current_state.json',
    JSON.stringify(agent, null, 2)
  );
  console.log("\n📄 Full config written to: service_agent_current_state.json");
}

main().catch(error => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
