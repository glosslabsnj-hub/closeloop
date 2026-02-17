/**
 * FIX DISPATCH KNOWLEDGE BASE
 *
 * Problem: Knowledge base shows "last updated February 4" despite API returning 200 success
 * Solution: Delete old KB item and recreate with fresh content
 *
 * Run: node fix_dispatch_knowledge_base.cjs
 */

const fs = require('fs');
const https = require('https');

const ELEVENLABS_API_KEY = "0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b";
const AGENT_ID = "agent_2601kghfpmckez3t2n6p7bmcpac4";
const OLD_KB_ID = "9C1yKiQZd9QSVbFzIXZe";

// Helper to make HTTPS requests
function makeRequest(method, path, body = null) {
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Helper to upload file with multipart form data
function uploadFile(path, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    const formData = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      'Content-Type: text/plain',
      '',
      fileContent,
      `--${boundary}`,
      'Content-Disposition: form-data; name="name"',
      '',
      'DISPATCH INDUSTRY EXPERTISE',
      `--${boundary}--`
    ].join('\r\n');

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData)
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
    req.write(formData);
    req.end();
  });
}

async function main() {
  console.log("🔧 DISPATCH Agent Knowledge Base Fix\n");
  console.log("Step 1: Reading knowledge base content...");

  const kbContent = fs.readFileSync('./dispatch_knowledge_base.txt', 'utf8');
  console.log(`   ✓ Loaded ${kbContent.length} characters\n`);

  // Step 1: Remove KB from agent first (so we can delete it)
  console.log("Step 2: Removing knowledge base from agent...");
  await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, {
    conversation_config: {
      agent: {
        knowledge_base: []
      }
    }
  });
  console.log("   ✓ Knowledge base removed from agent\n");

  // Step 2: DELETE old knowledge base item
  console.log(`Step 3: Deleting old knowledge base (ID: ${OLD_KB_ID})...`);
  try {
    await makeRequest('DELETE', `/v1/convai/knowledge-base/${OLD_KB_ID}`);
    console.log("   ✓ Old knowledge base deleted\n");
  } catch (error) {
    console.log(`   ⚠ Delete failed (may not exist): ${error.message}\n`);
  }

  // Step 3: Upload new knowledge base as file
  console.log("Step 4: Uploading new knowledge base as file...");
  const createResponse = await uploadFile(
    '/v1/convai/knowledge-base',
    './dispatch_knowledge_base.txt',
    'dispatch_knowledge_base.txt'
  );

  const newKbId = createResponse.data.id;
  console.log(`   ✓ New knowledge base uploaded (ID: ${newKbId})\n`);

  // Step 4: PATCH agent to use new KB ID
  console.log("Step 5: Attaching new knowledge base to agent...");
  await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, {
    conversation_config: {
      agent: {
        knowledge_base: [{
          type: "file",
          name: "DISPATCH INDUSTRY EXPERTISE",
          id: newKbId,
          usage_mode: "auto"
        }]
      }
    }
  });
  console.log("   ✓ Agent updated\n");

  // Verification
  console.log("✅ KNOWLEDGE BASE FIX COMPLETE!\n");
  console.log("Verification steps:");
  console.log("1. Go to: https://elevenlabs.io/app/conversational-ai");
  console.log("2. Select DISPATCH agent");
  console.log("3. Click 'Knowledge' tab");
  console.log("4. Verify:");
  console.log(`   - Shows "last updated" as TODAY (${new Date().toLocaleDateString()})`);
  console.log(`   - Content displays ${kbContent.length} characters`);
  console.log("   - Contains dispatch terminology (taxi, towing, courier, etc.)");
  console.log(`\nNew KB ID: ${newKbId}`);
}

main().catch(error => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
