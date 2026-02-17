#!/usr/bin/env node

/**
 * VERIFY AGENT DEPLOYMENT
 *
 * This script verifies that the workflow-config-driven prompts
 * were successfully deployed to ElevenLabs and contain the expected
 * workflow configuration variables.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');
    process.env[key] = value;
  }
}

loadEnvFile();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in .env.local');
  process.exit(1);
}

// Agent IDs
const AGENTS = {
  DISPATCH: {
    id: 'agent_2601kghfpmckez3t2n6p7bmcpac4',
    name: 'DISPATCH Agent',
    expectedVariables: [
      '{{dispatch_vehicle_timing}}',
      '{{dispatch_luxury_flatbed_enabled}}',
      '{{dispatch_awd_detection_enabled}}',
      '{{dispatch_luxury_brands}}',
      '{{dispatch_payment_timing}}',
      '{{dispatch_ask_payment_method}}',
      '{{dispatch_accepted_methods}}',
      '{{dispatch_confirm_geocoded_address}}',
      '{{dispatch_address_confirmation_script}}',
      '{{dispatch_driver_callback_script}}',
      '{{dispatch_include_direct_contact}}',
    ],
  },
  SERVICE: {
    id: 'agent_4701kg1vwhzqfxmvzh032nhvx434',
    name: 'SERVICE & BOOKING Agent',
    expectedVariables: [
      '{{service_deposit_timing}}',
      '{{service_deposit_upfront}}',
      '{{service_suggest_alternatives}}',
      '{{service_max_alternatives}}',
      '{{service_confirmation_script}}',
    ],
  },
};

/**
 * Fetch agent config from ElevenLabs
 */
async function fetchAgentConfig(agentId) {
  const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch agent ${agentId}: ${response.status}`);
  }

  return await response.json();
}

/**
 * Verify agent configuration
 */
async function verifyAgent(agent) {
  console.log(`\n📋 Verifying ${agent.name} (${agent.id})...\n`);

  try {
    const config = await fetchAgentConfig(agent.id);
    const prompt = config?.conversation_config?.agent?.prompt?.prompt || '';

    if (!prompt) {
      console.error('   ❌ No prompt found in agent config');
      return false;
    }

    console.log(`   ✅ Prompt found (${prompt.length} characters)\n`);
    console.log('   Checking for workflow config variables:\n');

    let allFound = true;
    for (const variable of agent.expectedVariables) {
      // Check for both direct variable usage and conditional blocks
      const directUsage = prompt.includes(variable);
      const conditionalUsage = prompt.includes(variable.replace('{{', '{{#if ').replace('}}', ' equals'));

      const found = directUsage || conditionalUsage;
      const status = found ? '✅' : '❌';
      console.log(`      ${status} ${variable}`);

      if (!found) {
        allFound = false;
      }
    }

    if (allFound) {
      console.log(`\n   ✅ All workflow config variables found!`);
    } else {
      console.log(`\n   ⚠️  Some variables are missing`);
    }

    return allFound;

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Main verification function
 */
async function verify() {
  console.log('🔍 Verifying workflow-config-driven agent deployment...');

  let allSuccess = true;

  for (const agent of Object.values(AGENTS)) {
    const success = await verifyAgent(agent);
    if (!success) {
      allSuccess = false;
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  if (allSuccess) {
    console.log('✅ VERIFICATION PASSED\n');
    console.log('Both agents are configured correctly with workflow config variables.\n');
    console.log('Next steps:');
    console.log('1. Test DISPATCH agent with a real phone call');
    console.log('2. Test SERVICE agent with a real phone call');
    console.log('3. Modify workflow config in Business Brain → Workflow Config');
    console.log('4. Verify agent behavior adapts to config changes');
    console.log('5. If successful, deploy FOOD, MEDICAL, GENERAL agents\n');
  } else {
    console.log('❌ VERIFICATION FAILED\n');
    console.log('Some agents are missing expected workflow config variables.');
    console.log('Re-run the deployment script: node deploy_agent_prompts.cjs\n');
    process.exit(1);
  }
}

// Run verification
verify().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
