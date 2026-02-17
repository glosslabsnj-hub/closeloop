#!/usr/bin/env node
/**
 * CHECK ELEVENLABS AGENT STATUS
 * Shows current published vs draft state
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
    throw new Error('ELEVENLABS_API_KEY not found');
  }
  return match[1].trim();
}

async function checkAgent(agentConfig, apiKey) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📋 AGENT: ${agentConfig.name}`);
  console.log(`   ID: ${agentConfig.id}`);
  console.log(`${'═'.repeat(70)}`);

  // Load local file
  const localContent = fs.readFileSync(agentConfig.local_file, 'utf-8');
  const localChars = localContent.length;
  const localLines = localContent.split('\n').length;

  console.log(`\n📄 LOCAL FILE (what we want to deploy):`);
  console.log(`   File: ${path.basename(agentConfig.local_file)}`);
  console.log(`   Size: ${localChars.toLocaleString()} characters`);
  console.log(`   Lines: ${localLines.toLocaleString()}`);

  // Fetch current state from ElevenLabs
  console.log(`\n☁️  Fetching from ElevenLabs API...`);

  try {
    const response = await fetch(`${API_BASE}/${agentConfig.id}`, {
      headers: { 'xi-api-key': apiKey }
    });

    if (!response.ok) {
      console.error(`   ❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();

    // Get the prompt from the response
    const livePrompt = data.conversation_config?.agent?.prompt?.prompt || '';
    const liveChars = livePrompt.length;
    const liveLines = livePrompt.split('\n').length;

    console.log(`\n☁️  CURRENT LIVE VERSION (what's in ElevenLabs):`);
    console.log(`   Size: ${liveChars.toLocaleString()} characters`);
    console.log(`   Lines: ${liveLines.toLocaleString()}`);

    // Compare
    const isMatch = localContent === livePrompt;
    const diff = localChars - liveChars;

    console.log(`\n🔍 COMPARISON:`);
    if (isMatch) {
      console.log(`   ✅ MATCH — Live version is identical to local file`);
      console.log(`   ✅ This agent is already using the correct version`);
    } else {
      console.log(`   ⚠️  MISMATCH — Live version differs from local file`);
      console.log(`   📊 Difference: ${diff > 0 ? '+' : ''}${diff.toLocaleString()} characters`);
      console.log(`   📊 Local is ${diff > 0 ? 'LONGER' : 'SHORTER'} than live`);

      // Check if our deployment is in draft
      if (diff > 0) {
        console.log(`\n   ℹ️  This means:`);
        console.log(`      - The NEW comprehensive version (${localChars.toLocaleString()} chars) is in DRAFT`);
        console.log(`      - The OLD version (${liveChars.toLocaleString()} chars) is still LIVE`);
        console.log(`      - YOU NEED TO CLICK "PUBLISH" in ElevenLabs UI`);
      }
    }

    // Show first 200 chars of each for comparison
    console.log(`\n📝 PREVIEW (first 200 characters):`);
    console.log(`   Local:  "${localContent.substring(0, 200)}..."`);
    console.log(`   Live:   "${livePrompt.substring(0, 200)}..."`);

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`ELEVENLABS AGENT STATUS CHECK`);
  console.log(`Checking published vs draft state...`);
  console.log(`${'═'.repeat(70)}`);

  const apiKey = loadApiKey();
  console.log(`✅ API key loaded`);

  await checkAgent(AGENTS.DISPATCH, apiKey);
  await checkAgent(AGENTS.SERVICE, apiKey);

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📊 SUMMARY & NEXT STEPS`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`
If you see "⚠️ MISMATCH" above, it means:

1. The NEW comprehensive version was uploaded to ElevenLabs
2. It's currently in DRAFT mode (not published yet)
3. The OLD version is still LIVE (handling calls)

✅ WHAT TO DO:
   → Go to ElevenLabs dashboard
   → Find each agent with "⚠️ MISMATCH"
   → Click the "PUBLISH" button
   → The new comprehensive version will go live

If you see "✅ MATCH" above:
   → That agent is already using the correct version
   → No action needed for that agent

`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
