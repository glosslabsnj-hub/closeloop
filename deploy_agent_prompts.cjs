#!/usr/bin/env node

/**
 * DEPLOY WORKFLOW-CONFIG-DRIVEN AGENT PROMPTS TO ELEVENLABS
 *
 * This script uploads the new configuration-driven system prompts
 * to the ElevenLabs dashboard for DISPATCH and SERVICE agents.
 *
 * The new prompts read workflow config variables like:
 * - {{dispatch_vehicle_timing}}
 * - {{service_deposit_timing}}
 * - {{dispatch_luxury_flatbed_enabled}}
 *
 * These prompts are defined in:
 * supabase/functions/_shared/agentBasePrompts.ts
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
    promptVariable: 'DISPATCH_AGENT_BASE_PROMPT',
  },
  SERVICE: {
    id: 'agent_4701kg1vwhzqfxmvzh032nhvx434',
    name: 'SERVICE & BOOKING Agent',
    promptVariable: 'SERVICE_AGENT_BASE_PROMPT',
  },
};

/**
 * Extract a prompt from agentBasePrompts.ts
 */
function extractPromptFromFile(promptVariable) {
  const filePath = path.join(__dirname, 'supabase', 'functions', '_shared', 'agentBasePrompts.ts');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  // Find the export statement for the prompt
  const regex = new RegExp(`export const ${promptVariable} = \`([\\s\\S]*?)\`;`, 'm');
  const match = fileContent.match(regex);

  if (!match) {
    throw new Error(`Could not find ${promptVariable} in agentBasePrompts.ts`);
  }

  const prompt = match[1];
  return prompt;
}

/**
 * Update an agent's system prompt via ElevenLabs API
 */
async function updateAgentPrompt(agentId, prompt) {
  const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            prompt: prompt,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update agent ${agentId}: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Verify the prompt was uploaded correctly
 */
async function verifyAgentPrompt(agentId, expectedSubstring) {
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

  const data = await response.json();
  const uploadedPrompt = data?.conversation_config?.agent?.prompt?.prompt || '';

  if (!uploadedPrompt.includes(expectedSubstring)) {
    throw new Error(`Verification failed: Prompt does not contain expected substring "${expectedSubstring}"`);
  }

  return true;
}

/**
 * Main deployment function
 */
async function deploy() {
  console.log('🚀 Starting deployment of workflow-config-driven agent prompts...\n');

  for (const [key, agent] of Object.entries(AGENTS)) {
    console.log(`📝 Processing ${agent.name}...`);

    try {
      // Step 1: Extract prompt from code
      console.log(`   ├─ Extracting ${agent.promptVariable} from agentBasePrompts.ts...`);
      const prompt = extractPromptFromFile(agent.promptVariable);
      console.log(`   ├─ Extracted ${prompt.length} characters`);

      // Step 2: Upload to ElevenLabs
      console.log(`   ├─ Uploading to ElevenLabs (${agent.id})...`);
      await updateAgentPrompt(agent.id, prompt);
      console.log(`   ├─ ✅ Upload successful`);

      // Step 3: Verify upload
      console.log(`   ├─ Verifying upload...`);
      let verificationString;
      if (key === 'DISPATCH') {
        verificationString = '{{dispatch_vehicle_timing}}';
      } else if (key === 'SERVICE') {
        verificationString = '{{service_deposit_timing}}';
      }

      await verifyAgentPrompt(agent.id, verificationString);
      console.log(`   └─ ✅ Verification passed: Found "${verificationString}" in uploaded prompt\n`);

    } catch (error) {
      console.error(`   └─ ❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  }

  console.log('✅ Deployment complete!\n');
  console.log('Next steps:');
  console.log('1. Test DISPATCH agent with a real call');
  console.log('2. Test SERVICE agent with a real call');
  console.log('3. Verify workflow config variables are read correctly');
  console.log('4. If successful, deploy FOOD, MEDICAL, GENERAL agents');
}

// Run deployment
deploy().catch((error) => {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
});
