#!/usr/bin/env node

/**
 * UPDATE DISPATCH AGENT PROMPT TO COMPREHENSIVE VERSION
 * This script updates the live DISPATCH agent with the comprehensive 76,574 character system prompt
 *
 * Run with: node update_dispatch_prompt.js
 */

const fs = require('fs');
const https = require('https');

const ELEVENLABS_API_KEY = "0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b";
const AGENT_ID = "agent_2601kghfpmckez3t2n6p7bmcpac4";
const BASE_URL = "api.elevenlabs.io";

console.log("📖 Reading comprehensive dispatch prompt...");

const promptFile = "./dispatch_agent_system_prompt_COMPREHENSIVE.txt";
if (!fs.existsSync(promptFile)) {
  console.error(`❌ Error: Prompt file not found: ${promptFile}`);
  process.exit(1);
}

const comprehensivePrompt = fs.readFileSync(promptFile, 'utf8');
const charCount = comprehensivePrompt.length;

console.log(`   - Characters: ${charCount.toLocaleString()}`);
console.log(`   - Improvement: ~${Math.round((charCount / 8563) * 10) / 10}x larger than current prompt (8,563 chars)`);
console.log("");

console.log("🚀 Updating DISPATCH agent via ElevenLabs API...");
console.log(`   Agent ID: ${AGENT_ID}`);

// Create the update payload
const updatePayload = JSON.stringify({
  conversation_config: {
    agent: {
      prompt: {
        prompt: comprehensivePrompt
      }
    }
  }
});

// Make the API call
const options = {
  hostname: BASE_URL,
  path: `/v1/convai/agents/${AGENT_ID}`,
  method: 'PATCH',
  headers: {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(updatePayload)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log("");
      console.log("✅ DISPATCH agent updated successfully!");
      console.log(`   - New prompt length: ${charCount.toLocaleString()} characters`);
      console.log(`   - Previous prompt length: 8,563 characters`);
      console.log(`   - Improvement: ~${Math.round((charCount / 8563) * 10) / 10}x larger`);
      console.log(`   - Coverage: 245+ dispatch scenarios`);
      console.log("");
      console.log("🎯 What Changed:");
      console.log("   - 3-tier urgency detection (Emergency/Urgent/Standard)");
      console.log("   - 245+ comprehensive scenario coverage");
      console.log("   - Pricing transparency BEFORE dispatch (builds trust)");
      console.log("   - 5-step objection handling protocol");
      console.log("   - 15+ upsell opportunities (natural, not pushy)");
      console.log("   - Impound call patterns (empathy-first)");
      console.log("   - Safety protocols for all situations");
      console.log("   - Geographic edge cases (rural, GPS, landmarks)");
      console.log("   - Seasonal & weather-specific handling");
      console.log("   - Vehicle condition & special handling");
      console.log("   - Authorization & documentation flows");
      console.log("");
      console.log("📋 Next Steps:");
      console.log("   1. ✅ System prompt updated");
      console.log("   2. ⏳ Configure 7 tools via ElevenLabs dashboard (manual)");
      console.log("   3. ⏳ Test 20+ scenarios to verify quality");
      console.log("   4. ⏳ Monitor live calls for first week");
      console.log("");
      console.log("🔧 Tools to Configure (Manual - via ElevenLabs Dashboard):");
      console.log("   1. check_service_area");
      console.log("   2. create_dispatch_job");
      console.log("   3. lookup_dispatch_status");
      console.log("   4. check_availability");
      console.log("   5. suggest_availability");
      console.log("   6. create_booking");
      console.log("   7. create_callback");
      console.log("");
      console.log("   Tool definitions saved in: dispatch_agent_tools_config.json");
    } else {
      console.log("");
      console.log(`❌ Error updating agent (HTTP ${res.statusCode})`);
      console.log("Response:");
      console.log(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error("");
  console.error("❌ Error making API request:");
  console.error(error);
  process.exit(1);
});

req.write(updatePayload);
req.end();
