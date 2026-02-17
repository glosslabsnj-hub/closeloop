const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';
const DISPATCH_AGENT_ID = 'agent_2601kghfpmckez3t2n6p7bmcpac4';

async function verifyDeployment() {
  console.log('=== VERIFYING CURRENT ELEVENLABS DEPLOYMENT ===\n');

  const response = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch agent: ${response.status}`);
  }

  const agent = await response.json();
  const currentPrompt = agent.conversation_config.agent.prompt.prompt;
  const promptLength = currentPrompt.length;

  console.log('📊 CURRENT DEPLOYMENT STATUS:');
  console.log('  Agent ID:', DISPATCH_AGENT_ID);
  console.log('  Agent Name:', agent.name);
  console.log('  Prompt Length:', promptLength, 'characters\n');

  const enhancements = [
    { name: 'Callback Number Verification', marker: 'CALLBACK NUMBER VERIFICATION' },
    { name: 'Unknown Dropoff Handling', marker: "DON'T KNOW DROPOFF YET" },
    { name: 'SMS Confirmation', marker: 'CONFIRMATION SMS OFFERING' },
    { name: 'Competing Quotes', marker: 'COMPETING QUOTES' },
    { name: 'Special Vehicle Protocols', marker: 'SPECIAL VEHICLE PROTOCOLS' },
    { name: 'Post-Dispatch Expectations', marker: 'POST-DISPATCH EXPECTATIONS' },
    { name: 'Graceful Unknown Handling', marker: 'GRACEFUL "I DON' },
    { name: 'Modification/Cancellation', marker: 'MODIFICATION OR CANCELLATION' },
    { name: 'Payment Upfront', marker: 'PAYMENT METHOD COLLECTION' },
    { name: 'Priority Override', marker: 'PRIORITY OVERRIDE FOR VULNERABLE' }
  ];

  const coreFixes = [
    { name: 'Pricing Conversion Fix', marker: 'PRICING FORMAT CONVERSION' },
    { name: 'Tool Error Recovery', marker: 'TOOL ERROR RECOVERY' },
    { name: 'Address Confirmation', marker: 'ADDRESS CONFIRMATION' },
    { name: 'Winch-Out Drivability', marker: 'WINCH-OUT DRIVABILITY' },
    { name: 'Price Combination', marker: 'PRICE COMBINATION FOR COMPLEX SERVICES' }
  ];

  console.log('🎯 STRATEGIC ENHANCEMENTS (10 TOTAL):');
  let allEnhancementsPresent = true;
  enhancements.forEach((enhancement, index) => {
    const present = currentPrompt.includes(enhancement.marker);
    console.log(`  ${index + 1}. ${enhancement.name}: ${present ? 'PRESENT ✓' : 'MISSING ❌'}`);
    if (!present) allEnhancementsPresent = false;
  });

  console.log('\n🔧 CORE FIXES (FROM EARLIER):');
  let allCoreFixesPresent = true;
  coreFixes.forEach(fix => {
    const present = currentPrompt.includes(fix.marker);
    console.log(`  ${fix.name}: ${present ? 'PRESENT ✓' : 'MISSING ❌'}`);
    if (!present) allCoreFixesPresent = false;
  });

  console.log('\n📋 TOOLS CONFIGURED:');
  const toolIds = agent.conversation_config.agent.prompt.tool_ids || [];
  console.log(`  Total tools: ${toolIds.length}`);

  console.log('\n🔢 DYNAMIC VARIABLES:');
  const dynamicVars = agent.conversation_config.agent.dynamic_variables?.dynamic_variable_placeholders || {};
  const varCount = Object.keys(dynamicVars).length;
  console.log(`  Total variables configured: ${varCount}`);

  console.log('\n📊 OVERALL STATUS:');
  if (promptLength === 42676 && allEnhancementsPresent && allCoreFixesPresent && toolIds.length === 7 && varCount >= 126) {
    console.log('  ✅ FULL ULTIMATE DEPLOYMENT CONFIRMED');
    console.log('  ✅ All 10 strategic enhancements present');
    console.log('  ✅ All 5 core fixes present');
    console.log('  ✅ 7 tools configured');
    console.log(`  ✅ ${varCount} dynamic variables configured`);
    console.log('\n🎉 DISPATCH agent is ready for production!');
  } else {
    console.log('  ⚠️  WARNING: Deployment may be incomplete');
    if (promptLength !== 42676) console.log(`    - Prompt length: ${promptLength} (expected 42676)`);
    if (!allEnhancementsPresent) console.log('    - Some enhancements missing');
    if (!allCoreFixesPresent) console.log('    - Some core fixes missing');
    if (toolIds.length !== 7) console.log(`    - Tools: ${toolIds.length} (expected 7)`);
    if (varCount < 126) console.log(`    - Variables: ${varCount} (expected 126+)`);
  }
}

verifyDeployment().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
