#!/usr/bin/env node
/**
 * VERIFY ELEVENLABS AGENT DEPLOYMENT
 * Quick verification that agents are live with correct prompts
 */

const fs = require('fs');
const path = require('path');

const AGENTS = {
  DISPATCH: {
    id: 'agent_2601kghfpmckez3t2n6p7bmcpac4',
    name: 'DISPATCH Universal',
    local_file: path.join(__dirname, 'docs', 'dispatch_universal.txt')
  },
  SERVICE: {
    id: 'agent_4701kg1vwhzqfxmvzh032nhvx434',
    name: 'SERVICE Comprehensive',
    local_file: path.join(__dirname, 'docs', 'service_comprehensive.txt')
  }
};

const API_BASE = 'https://api.elevenlabs.io/v1/convai/agents';

function loadApiKey() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/(?:VITE_)?ELEVENLABS_API_KEY=(.+)/);
  if (!match) {
    throw new Error('ELEVENLABS_API_KEY not found in .env.local');
  }
  return match[1].trim();
}

async function verifyAgent(agentConfig, apiKey) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔍 VERIFYING: ${agentConfig.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Load local file
  const localContent = fs.readFileSync(agentConfig.local_file, 'utf-8');
  const localChars = localContent.length;

  console.log(`📄 Local file: ${localChars.toLocaleString()} characters`);

  // Fetch from ElevenLabs
  console.log(`📡 Fetching from ElevenLabs...`);

  try {
    const response = await fetch(`${API_BASE}/${agentConfig.id}`, {
      headers: { 'xi-api-key': apiKey }
    });

    if (!response.ok) {
      console.error(`❌ Fetch failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    const livePrompt = data.conversation_config?.agent?.prompt?.prompt || '';
    const liveChars = livePrompt.length;

    console.log(`☁️  Live agent: ${liveChars.toLocaleString()} characters`);

    // Compare
    const match = localContent === livePrompt;

    if (match) {
      console.log(`✅ VERIFIED: Live agent matches local file exactly`);
      return true;
    } else {
      console.log(`⚠️  WARNING: Live agent differs from local file`);
      console.log(`   Local: ${localChars} chars | Live: ${liveChars} chars`);
      console.log(`   Difference: ${Math.abs(localChars - liveChars)} characters`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  ELEVENLABS DEPLOYMENT VERIFICATION                      ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);

  const apiKey = loadApiKey();
  console.log(`✅ API key loaded`);

  const results = {
    DISPATCH: await verifyAgent(AGENTS.DISPATCH, apiKey),
    SERVICE: await verifyAgent(AGENTS.SERVICE, apiKey)
  };

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 VERIFICATION SUMMARY`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`DISPATCH: ${results.DISPATCH ? '✅ VERIFIED' : '❌ MISMATCH'}`);
  console.log(`SERVICE:  ${results.SERVICE ? '✅ VERIFIED' : '❌ MISMATCH'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (results.DISPATCH && results.SERVICE) {
    console.log(`✅ ALL AGENTS VERIFIED AND LIVE`);
    console.log(`\n🎉 Both agents are deployed and ready for production use!\n`);
  } else {
    console.log(`⚠️  Some agents have mismatches. Re-deploy if needed.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
