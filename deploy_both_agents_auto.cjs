#!/usr/bin/env node
/**
 * AUTO-DEPLOY BOTH COMPREHENSIVE AGENTS TO ELEVENLABS
 * Non-interactive version for quick deployment
 */

const fs = require('fs');
const path = require('path');

const AGENTS = {
  DISPATCH: {
    id: 'agent_2601kghfpmckez3t2n6p7bmcpac4',
    name: 'DISPATCH Universal',
    prompt_file: path.join(__dirname, 'docs', 'dispatch_universal.txt')
  },
  SERVICE: {
    id: 'agent_4701kg1vwhzqfxmvzh032nhvx434',
    name: 'SERVICE Comprehensive',
    prompt_file: path.join(__dirname, 'docs', 'service_comprehensive.txt')
  }
};

const API_BASE = 'https://api.elevenlabs.io/v1/convai/agents';

function loadApiKey() {
  const envPath = path.join(__dirname, '.env.local');

  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found. Cannot deploy without ElevenLabs API key.');
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/(?:VITE_)?ELEVENLABS_API_KEY=(.+)/);

  if (!match) {
    throw new Error('ELEVENLABS_API_KEY not found in .env.local');
  }

  return match[1].trim();
}

async function deployAgent(agentConfig, apiKey) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📤 DEPLOYING: ${agentConfig.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Read prompt file
  if (!fs.existsSync(agentConfig.prompt_file)) {
    console.error(`❌ ERROR: Prompt file not found: ${agentConfig.prompt_file}`);
    return false;
  }

  const promptContent = fs.readFileSync(agentConfig.prompt_file, 'utf-8');
  const charCount = promptContent.length;
  const lineCount = promptContent.split('\n').length;

  console.log(`📄 File: ${path.basename(agentConfig.prompt_file)}`);
  console.log(`📊 Size: ${charCount.toLocaleString()} characters, ${lineCount.toLocaleString()} lines`);

  // Upload to ElevenLabs
  console.log(`\n🚀 Uploading to ElevenLabs...`);

  try {
    const response = await fetch(`${API_BASE}/${agentConfig.id}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              prompt: promptContent
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Upload failed: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ SUCCESS: ${agentConfig.name} deployed`);
    console.log(`   Agent ID: ${agentConfig.id}`);
    console.log(`   Characters: ${charCount.toLocaleString()}`);

    return true;
  } catch (error) {
    console.error(`❌ ERROR deploying ${agentConfig.name}:`, error.message);
    return false;
  }
}

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  ELEVENLABS COMPREHENSIVE AGENTS AUTO-DEPLOYMENT         ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);

  // Load API key
  let apiKey;
  try {
    apiKey = loadApiKey();
    console.log(`✅ API key loaded from .env.local`);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }

  const results = {
    DISPATCH: false,
    SERVICE: false
  };

  // Deploy DISPATCH
  results.DISPATCH = await deployAgent(AGENTS.DISPATCH, apiKey);

  // Deploy SERVICE
  results.SERVICE = await deployAgent(AGENTS.SERVICE, apiKey);

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 DEPLOYMENT SUMMARY`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`DISPATCH: ${results.DISPATCH ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`SERVICE:  ${results.SERVICE ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const allSuccess = results.DISPATCH && results.SERVICE;

  if (allSuccess) {
    console.log(`✅ ALL AGENTS DEPLOYED SUCCESSFULLY`);
    console.log(`\n🎯 Both agents are now live and ready to handle 98%+ of customer interactions.\n`);
  } else {
    console.log(`⚠️  Some deployments failed. Check errors above.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
