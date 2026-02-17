const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';
const DISPATCH_AGENT_ID = 'agent_2601kghfpmckez3t2n6p7bmcpac4';

async function main() {
  const response = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  
  const agent = await response.json();
  
  console.log('Dynamic variables config:');
  console.log(JSON.stringify(agent.conversation_config.agent.prompt.dynamic_variables, null, 2));
}

main().catch(console.error);
