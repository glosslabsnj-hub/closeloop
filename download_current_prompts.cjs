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

async function downloadPrompt(agentId, agentName, outputFile) {
  console.log(`\n📥 Downloading ${agentName} prompt...`);

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  const data = await response.json();
  const prompt = data?.conversation_config?.agent?.prompt?.prompt || '';

  console.log(`   ├─ Downloaded: ${prompt.length} characters`);

  // Save to file
  fs.writeFileSync(outputFile, prompt, 'utf8');
  console.log(`   └─ Saved to: ${outputFile}\n`);

  return prompt;
}

(async () => {
  console.log('📥 Downloading current ElevenLabs agent prompts...\n');

  try {
    await downloadPrompt(
      'agent_2601kghfpmckez3t2n6p7bmcpac4',
      'DISPATCH Agent',
      'docs/dispatch_current.txt'
    );

    await downloadPrompt(
      'agent_4701kg1vwhzqfxmvzh032nhvx434',
      'SERVICE Agent',
      'docs/service_current.txt'
    );

    console.log('✅ Download complete!\n');
    console.log('Files saved:');
    console.log('  - docs/dispatch_current.txt');
    console.log('  - docs/service_current.txt\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
