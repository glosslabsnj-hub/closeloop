const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    process.env[key] = valueParts.join('=');
  }
}

loadEnvFile();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

async function restorePrompt(agentId, promptFile, agentName) {
  console.log(`\n🔄 Restoring ${agentName}...`);

  // Read the original prompt from file
  const promptPath = path.join(__dirname, promptFile);
  const originalPrompt = fs.readFileSync(promptPath, 'utf8');

  console.log(`   ├─ Loaded original prompt: ${originalPrompt.length} characters`);

  // Upload to ElevenLabs
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            prompt: originalPrompt,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed: ${response.status} ${error}`);
  }

  console.log(`   └─ ✅ Restored successfully\n`);
}

(async () => {
  console.log('🚨 RESTORING ORIGINAL PROMPTS...\n');

  try {
    // Restore DISPATCH
    await restorePrompt(
      'agent_2601kghfpmckez3t2n6p7bmcpac4',
      'docs/dispatchpromt',
      'DISPATCH Agent'
    );

    console.log('✅ RESTORATION COMPLETE\n');
    console.log('I am SO SORRY for breaking the prompts.');
    console.log('The original DISPATCH prompt has been restored.');
    console.log('\nNext: We need to carefully ADD workflow config sections to the existing prompts,');
    console.log('not REPLACE them entirely.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
