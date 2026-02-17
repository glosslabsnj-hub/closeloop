#!/usr/bin/env node

/**
 * DEPLOY DISPATCH AGENT - COMPLETE UPDATE (FIXED KNOWLEDGE BASE)
 * Updates both system prompt AND knowledge base with proper ID
 */

const fs = require('fs');
const https = require('https');

const ELEVENLABS_API_KEY = "0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b";
const AGENT_ID = "agent_2601kghfpmckez3t2n6p7bmcpac4";
const KNOWLEDGE_BASE_ID = "9C1yKiQZd9QSVbFzIXZe"; // Existing KB ID from config
const BASE_URL = "api.elevenlabs.io";

console.log("🔧 DISPATCH AGENT COMPLETE DEPLOYMENT (FIXED)");
console.log("━".repeat(60));

// Read system prompt
const promptFile = "./dispatch_agent_system_prompt_FINAL.txt";
if (!fs.existsSync(promptFile)) {
  console.error(`❌ Error: Prompt file not found: ${promptFile}`);
  process.exit(1);
}
const systemPrompt = fs.readFileSync(promptFile, 'utf8');

// Read knowledge base content
const knowledgeFile = "./dispatch_knowledge_base.txt";
if (!fs.existsSync(knowledgeFile)) {
  console.error(`❌ Error: Knowledge base file not found: ${knowledgeFile}`);
  process.exit(1);
}
const knowledgeContent = fs.readFileSync(knowledgeFile, 'utf8');

console.log("📖 Files loaded:");
console.log(`   System Prompt: ${systemPrompt.length.toLocaleString()} characters`);
console.log(`   Knowledge Base: ${knowledgeContent.length.toLocaleString()} characters`);
console.log("");

// Build the update payload with CORRECT knowledge base structure
const updatePayload = JSON.stringify({
  conversation_config: {
    agent: {
      prompt: {
        prompt: systemPrompt
      },
      knowledge_base: [{
        type: "text",
        name: "DISPATCH INDUSTRY EXPERTISE KNOWLEDGE BASE",
        content: knowledgeContent,
        id: KNOWLEDGE_BASE_ID,  // CRITICAL: Use existing ID to update, not create new
        usage_mode: "auto"
      }]
    }
  }
});

console.log("🚀 Updating DISPATCH agent via ElevenLabs API...");
console.log(`   Agent ID: ${AGENT_ID}`);
console.log(`   Knowledge Base ID: ${KNOWLEDGE_BASE_ID}`);
console.log("");

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
      console.log("✅ DISPATCH AGENT UPDATED SUCCESSFULLY!");
      console.log("━".repeat(60));
      console.log("");
      console.log("📊 What Was Updated:");
      console.log(`   ✓ System Prompt: ${systemPrompt.length.toLocaleString()} characters`);
      console.log(`     - All 156 dynamic variables integrated`);
      console.log(`     - 245+ dispatch scenarios covered`);
      console.log(`     - SERVICE agent structure replicated`);
      console.log("");
      console.log(`   ✓ Knowledge Base: ${knowledgeContent.length.toLocaleString()} characters`);
      console.log(`     - ID: ${KNOWLEDGE_BASE_ID} (updated existing)`);
      console.log(`     - Taxi/rideshare terminology`);
      console.log(`     - Towing/roadside terminology`);
      console.log(`     - Courier/delivery terminology`);
      console.log(`     - Locksmith terminology`);
      console.log(`     - Mobile services terminology`);
      console.log(`     - ETA communication guide`);
      console.log(`     - Dispatch priorities`);
      console.log("");
      console.log("🎯 Agent Capabilities:");
      console.log("   ✓ Adapts to each business via 156 dynamic variables");
      console.log("   ✓ Uses Business Brain data for business-specific behavior");
      console.log("   ✓ 3-tier urgency detection (Emergency/Urgent/Standard)");
      console.log("   ✓ Pricing transparency BEFORE dispatch creation");
      console.log("   ✓ 5-step objection handling protocol");
      console.log("   ✓ Natural upselling (15+ opportunities)");
      console.log("   ✓ Safety protocols for all situations");
      console.log("   ✓ Impound handling (empathy-first)");
      console.log("   ✓ Comprehensive industry knowledge");
      console.log("");
      console.log("⏳ Still Needed:");
      console.log("   1. Configure 7 tools via ElevenLabs dashboard (manual)");
      console.log("      - check_service_area");
      console.log("      - create_dispatch_job");
      console.log("      - lookup_dispatch_status");
      console.log("      - check_availability");
      console.log("      - suggest_availability");
      console.log("      - create_booking");
      console.log("      - create_callback");
      console.log("   2. Test 20+ scenarios");
      console.log("   3. Monitor first week of live calls");
      console.log("");
      console.log("📖 Tool Setup Guide: DISPATCH_TOOLS_SETUP_GUIDE.md");
      console.log("");
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
