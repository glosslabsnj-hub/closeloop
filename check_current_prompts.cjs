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

async function checkPromptLength(agentId, name) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
  });
  const data = await response.json();
  const prompt = data?.conversation_config?.agent?.prompt?.prompt || '';
  console.log(`\n${name}:`);
  console.log(`Length: ${prompt.length} characters`);
  console.log('\nFirst 1000 chars:');
  console.log(prompt.substring(0, 1000));
  console.log('\n' + '='.repeat(80));
}

(async () => {
  await checkPromptLength('agent_2601kghfpmckez3t2n6p7bmcpac4', 'DISPATCH');
  await checkPromptLength('agent_4701kg1vwhzqfxmvzh032nhvx434', 'SERVICE');
})();
