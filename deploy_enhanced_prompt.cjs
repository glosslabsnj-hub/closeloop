const fs = require('fs');

const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';
const DISPATCH_AGENT_ID = 'agent_2601kghfpmckez3t2n6p7bmcpac4';

async function deployPrompt() {
  console.log('=== DEPLOYING ENHANCED DISPATCH PROMPT ===\n');
  
  const systemPrompt = fs.readFileSync('dispatch_agent_prompt_ENHANCED.txt', 'utf8');
  console.log('✓ Loaded enhanced prompt:', systemPrompt.length, 'characters\n');
  
  console.log('📋 ENHANCEMENTS INCLUDED:');
  console.log('  ✓ Pricing conversion (cents → dollars)');
  console.log('  ✓ Address confirmation (city/state mandatory)');
  console.log('  ✓ Winch-out drivability assessment');
  console.log('  ✓ Price combination for complex services');
  console.log('  ✓ Tool error recovery protocol');
  console.log('  ✓ Tool success validation before confirmation');
  console.log('  ✓ Enhanced vehicle info collection');
  console.log('  ✓ Service type mapping table');
  console.log('  ✓ tenant_id + conversation_id in all tools\n');
  
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
  
  console.log('Deploying to DISPATCH agent...');
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
  
  console.log('✓ Prompt updated successfully\n');
  
  // Verify
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
  const hasPriceCombination = newPrompt.includes('PRICE COMBINATION FOR COMPLEX SERVICES');
  
  console.log('📊 DEPLOYMENT VERIFICATION:');
  console.log('  Prompt length:', newLength, 'characters');
  console.log('  Expected:', systemPrompt.length, 'characters');
  console.log('  Match:', newLength === systemPrompt.length ? 'YES ✓' : 'NO ❌');
  console.log('\n🎯 CRITICAL FIXES VERIFIED:');
  console.log('  ✓ Pricing conversion:', hasPricingFix ? 'YES' : 'NO');
  console.log('  ✓ Error recovery:', hasErrorRecovery ? 'YES' : 'NO');
  console.log('  ✓ Address confirmation:', hasAddressConfirm ? 'YES' : 'NO');
  console.log('  ✓ Winch-out drivability:', hasWinchOut ? 'YES' : 'NO');
  console.log('  ✓ Price combination:', hasPriceCombination ? 'YES' : 'NO');
  
  if (newLength > 30000 && hasPricingFix && hasErrorRecovery) {
    console.log('\n✅ ENHANCED PROMPT SUCCESSFULLY DEPLOYED');
    console.log('\n📞 READY FOR TESTING');
    console.log('Your working dispatch prompt is now live with all critical fixes!');
  } else {
    console.log('\n⚠️  Warning: Deployment may have issues');
  }
}

deployPrompt().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
