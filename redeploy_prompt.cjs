const fs = require('fs');

const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';
const DISPATCH_AGENT_ID = 'agent_2601kghfpmckez3t2n6p7bmcpac4';

async function deployPrompt() {
  console.log('=== RE-DEPLOYING SYSTEM PROMPT ===\n');
  
  const systemPrompt = fs.readFileSync('dispatch_agent_system_prompt_FINAL.txt', 'utf8');
  console.log('Loaded system prompt:', systemPrompt.length, 'characters\n');
  
  const getResponse = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  
  const currentAgent = await getResponse.json();
  const promptWithoutTools = { ...currentAgent.conversation_config.agent.prompt };
  delete promptWithoutTools.tools;
  
  const updatePayload = {
    conversation_config: {
      ...currentAgent.conversation_config,
      agent: {
        ...currentAgent.conversation_config.agent,
        prompt: {
          ...promptWithoutTools,
          prompt: systemPrompt
        }
      }
    }
  };
  
  console.log('Sending update request...');
  const updateResponse = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatePayload)
  });
  
  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error('Failed: ' + updateResponse.status + ' - ' + error);
  }
  
  console.log('✓ System prompt updated\n');
  
  // Verify
  console.log('Verifying deployment...');
  const verifyResponse = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  
  const verifiedAgent = await verifyResponse.json();
  const newPrompt = verifiedAgent.conversation_config.agent.prompt.prompt;
  const newLength = newPrompt.length;
  const hasPricingFix = newPrompt.includes('PRICING FORMAT CONVERSION');
  const hasErrorRecovery = newPrompt.includes('TOOL ERROR RECOVERY');
  const hasAddressConfirm = newPrompt.includes('ADDRESS CONFIRMATION');
  const hasWinchOut = newPrompt.includes('WINCH-OUT DRIVABILITY');
  
  console.log('\n📊 VERIFICATION RESULTS:');
  console.log('  Prompt length:', newLength, 'characters');
  console.log('  Expected:', systemPrompt.length, 'characters');
  console.log('  Match:', newLength === systemPrompt.length ? 'YES ✓' : 'NO ❌');
  console.log('\n🎯 CRITICAL FIXES:');
  console.log('  ✓ Pricing conversion fix:', hasPricingFix ? 'YES' : 'NO');
  console.log('  ✓ Error recovery protocol:', hasErrorRecovery ? 'YES' : 'NO');
  console.log('  ✓ Address confirmation:', hasAddressConfirm ? 'YES' : 'NO');
  console.log('  ✓ Winch-out drivability:', hasWinchOut ? 'YES' : 'NO');
  
  if (newLength > 90000 && hasPricingFix && hasErrorRecovery) {
    console.log('\n✅ SYSTEM PROMPT SUCCESSFULLY DEPLOYED');
    console.log('\n📞 Agent is ready for testing!');
  } else {
    console.log('\n⚠️  Warning: Prompt may not have deployed correctly');
  }
}

deployPrompt().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
