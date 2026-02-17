const SERVICE_AGENT_ID = "agent_4701kg1vwhzqfxmvzh032nhvx434";
const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';

async function main() {
  const response = await fetch(`${BASE_URL}/v1/convai/agents/${SERVICE_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  
  const agent = await response.json();
  const vars = agent.conversation_config.agent.dynamic_variables?.dynamic_variable_placeholders || {};
  
  console.log('SERVICE agent has', Object.keys(vars).length, 'dynamic variables');
  console.log('\nDynamic variable placeholders:');
  console.log(JSON.stringify(vars, null, 2));
}

main().catch(console.error);
