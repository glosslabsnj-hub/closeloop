const fs = require('fs');

const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';
const DISPATCH_AGENT_ID = 'agent_2601kghfpmckez3t2n6p7bmcpac4';

async function deployPrompt() {
  console.log('=== DEPLOYING ULTIMATE DISPATCH PROMPT ===\n');

  const systemPrompt = fs.readFileSync('dispatch_agent_prompt_ULTIMATE.txt', 'utf8');
  console.log('✓ Loaded ultimate prompt:', systemPrompt.length, 'characters\n');

  console.log('📋 ALL 10 STRATEGIC ENHANCEMENTS INCLUDED:');
  console.log('  1. ✓ Callback number verification');
  console.log('  2. ✓ "Don\'t know dropoff yet" handling');
  console.log('  3. ✓ Confirmation SMS offering');
  console.log('  4. ✓ Competing quotes / price shopping');
  console.log('  5. ✓ Special vehicle protocols (motorcycle, RV, exotic, semi)');
  console.log('  6. ✓ Post-dispatch expectations');
  console.log('  7. ✓ Graceful "I don\'t know" handling');
  console.log('  8. ✓ Modification/cancellation of recent dispatch');
  console.log('  9. ✓ Payment method upfront');
  console.log(' 10. ✓ Priority override for vulnerable callers\n');

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

  // Verify all 10 enhancements are present
  const enhancements = {
    callbackVerification: newPrompt.includes('CALLBACK NUMBER VERIFICATION'),
    unknownDropoff: newPrompt.includes('DON\'T KNOW DROPOFF YET'),
    smsConfirmation: newPrompt.includes('CONFIRMATION SMS OFFERING'),
    competingQuotes: newPrompt.includes('COMPETING QUOTES'),
    specialVehicles: newPrompt.includes('SPECIAL VEHICLE PROTOCOLS'),
    postDispatch: newPrompt.includes('POST-DISPATCH EXPECTATIONS'),
    gracefulUnknown: newPrompt.includes('GRACEFUL "I DON\'T KNOW"'),
    modification: newPrompt.includes('MODIFICATION OR CANCELLATION'),
    payment: newPrompt.includes('PAYMENT METHOD COLLECTION'),
    priority: newPrompt.includes('PRIORITY OVERRIDE FOR VULNERABLE')
  };

  console.log('📊 DEPLOYMENT VERIFICATION:');
  console.log('  Prompt length:', newLength, 'characters');
  console.log('  Expected:', systemPrompt.length, 'characters');
  console.log('  Match:', newLength === systemPrompt.length ? 'YES ✓' : 'NO ❌');
  console.log('\n🎯 ENHANCEMENT VERIFICATION:');
  console.log('  1. Callback verification:', enhancements.callbackVerification ? 'PRESENT ✓' : 'MISSING ❌');
  console.log('  2. Unknown dropoff:', enhancements.unknownDropoff ? 'PRESENT ✓' : 'MISSING ❌');
  console.log('  3. SMS confirmation:', enhancements.smsConfirmation ? 'PRESENT ✓' : 'MISSING ❌');
  console.log('  4. Competing quotes:', enhancements.competingQuotes ? 'PRESENT ✓' : 'MISSING ❌');
  console.log('  5. Special vehicles:', enhancements.specialVehicles ? 'PRESENT ✓' : 'MISSING ❌');
  console.log('  6. Post-dispatch expectations:', enhancements.postDispatch ? 'PRESENT ✓' : 'MISSING ❌');
  console.log('  7. Graceful "I don\'t know":', enhancements.gracefulUnknown ? 'PRESENT ✓' : 'MISSING ❌');
  console.log('  8. Modification/cancellation:', enhancements.modification ? 'PRESENT ✓' : 'MISSING ❌');
  console.log('  9. Payment upfront:', enhancements.payment ? 'PRESENT ✓' : 'MISSING ❌');
  console.log(' 10. Priority override:', enhancements.priority ? 'PRESENT ✓' : 'MISSING ❌');

  const allPresent = Object.values(enhancements).every(v => v === true);

  if (newLength === systemPrompt.length && allPresent) {
    console.log('\n✅ ULTIMATE PROMPT SUCCESSFULLY DEPLOYED');
    console.log('\n📞 READY FOR PRODUCTION TESTING');
    console.log('All 10 strategic enhancements are now live!');
  } else {
    console.log('\n⚠️  Warning: Deployment verification issues detected');
  }
}

deployPrompt().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
