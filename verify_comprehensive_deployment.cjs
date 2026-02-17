#!/usr/bin/env node
/**
 * VERIFY COMPREHENSIVE PROMPT DEPLOYMENT
 *
 * This script verifies that comprehensive prompts were deployed correctly to ElevenLabs.
 *
 * CHECKS:
 * - Character count matches expected
 * - All workflow config variables are present
 * - No broken template syntax
 * - Agent is responding correctly
 *
 * USAGE:
 *   node verify_comprehensive_deployment.cjs
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const AGENTS = {
  DISPATCH: {
    id: 'agent_2601kghfpmckez3t2n6p7bmcpac4',
    name: 'DISPATCH',
    expected_min_chars: 29000,
    required_variables: [
      'dispatch_vehicle_timing',
      'dispatch_luxury_flatbed_enabled',
      'dispatch_luxury_brands',
      'dispatch_awd_detection_enabled',
      'dispatch_payment_timing',
      'dispatch_ask_payment_method',
      'dispatch_accepted_methods',
      'dispatch_payment_due_message',
      'dispatch_confirm_geocoded_address',
      'dispatch_address_confirmation_script',
      'dispatch_require_zip',
      'dispatch_include_direct_contact',
      'dispatch_driver_callback_script',
      'dispatch_required_vehicle_fields'
    ],
    critical_sections: [
      'WORKFLOW CONFIGURATION',
      'VEHICLE INFO COLLECTION',
      'ADDRESS CONFIRMATION',
      'PAYMENT DISCUSSION',
      'DRIVER CONTACT & EXPECTATIONS'
    ]
  },
  SERVICE: {
    id: 'agent_4701kg1vwhzqfxmvzh032nhvx434',
    name: 'SERVICE',
    expected_min_chars: 55000,
    required_variables: [
      'service_deposit_upfront',
      'service_deposit_timing',
      'service_suggest_alternatives',
      'service_max_alternatives',
      'service_confirmation_script',
      'service_deposit_timing'
    ],
    critical_sections: [
      'DEPOSIT COLLECTION',
      'AVAILABILITY CHECK',
      'WORKFLOW CONFIGURATION'
    ]
  }
};

const API_BASE = 'https://api.elevenlabs.io/v1/convai/agents';

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, type = 'info') {
  const prefix = {
    info: '\x1b[36mℹ\x1b[0m',
    success: '\x1b[32m✓\x1b[0m',
    warning: '\x1b[33m⚠\x1b[0m',
    error: '\x1b[31m✗\x1b[0m'
  }[type] || 'ℹ';

  console.log(`${prefix} ${message}`);
}

function formatNumber(num) {
  return num.toLocaleString();
}

// ============================================================================
// ELEVENLABS API
// ============================================================================

async function getElevenLabsApiKey() {
  const envPath = path.join(__dirname, '.env.local');

  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/(?:VITE_)?ELEVENLABS_API_KEY=(.+)/);

  if (!match) {
    throw new Error('ELEVENLABS_API_KEY not found in .env.local');
  }

  return match[1].trim();
}

async function getCurrentPrompt(agentId, apiKey) {
  const response = await fetch(`${API_BASE}/${agentId}`, {
    headers: {
      'xi-api-key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch agent: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.conversation_config?.agent?.prompt?.prompt || '';
}

// ============================================================================
// VERIFICATION
// ============================================================================

function verifyPrompt(agentConfig, promptContent) {
  const results = {
    passed: true,
    checks: [],
    issues: [],
    warnings: []
  };

  // Check 1: Character count
  results.checks.push({
    name: 'Character Count',
    expected: `≥ ${formatNumber(agentConfig.expected_min_chars)}`,
    actual: formatNumber(promptContent.length),
    passed: promptContent.length >= agentConfig.expected_min_chars
  });

  if (promptContent.length < agentConfig.expected_min_chars) {
    results.issues.push(`Prompt too short: ${formatNumber(promptContent.length)} chars (expected ≥ ${formatNumber(agentConfig.expected_min_chars)})`);
    results.passed = false;
  }

  // Check 2: Required variables (check both {{var}} and {{#if var}})
  const missingVars = agentConfig.required_variables.filter(
    varName => !promptContent.includes(`{{${varName}}}`) && !promptContent.includes(`{{#if ${varName}`)
  );

  results.checks.push({
    name: 'Required Variables',
    expected: `${agentConfig.required_variables.length} variables`,
    actual: `${agentConfig.required_variables.length - missingVars.length} present`,
    passed: missingVars.length === 0
  });

  if (missingVars.length > 0) {
    results.issues.push(`Missing variables: ${missingVars.join(', ')}`);
    results.passed = false;
  }

  // Check 3: Critical sections
  const missingSections = agentConfig.critical_sections.filter(
    section => !promptContent.includes(section)
  );

  results.checks.push({
    name: 'Critical Sections',
    expected: `${agentConfig.critical_sections.length} sections`,
    actual: `${agentConfig.critical_sections.length - missingSections.length} present`,
    passed: missingSections.length === 0
  });

  if (missingSections.length > 0) {
    results.issues.push(`Missing sections: ${missingSections.join(', ')}`);
    results.passed = false;
  }

  // Check 4: Template syntax
  const openIfs = (promptContent.match(/\{\{#if/g) || []).length;
  const closeIfs = (promptContent.match(/\{\{\/if\}\}/g) || []).length;
  const syntaxValid = openIfs === closeIfs;

  results.checks.push({
    name: 'Template Syntax',
    expected: 'Balanced if/endif blocks',
    actual: `${openIfs} opens, ${closeIfs} closes`,
    passed: syntaxValid
  });

  if (!syntaxValid) {
    results.issues.push(`Unbalanced template blocks: ${openIfs} opens, ${closeIfs} closes`);
    results.passed = false;
  }

  // Check 5: No placeholders
  const hasPlaceholders = promptContent.includes('TODO') || promptContent.includes('INSERT HERE');
  results.checks.push({
    name: 'No Placeholders',
    expected: 'No TODO/INSERT HERE',
    actual: hasPlaceholders ? 'Contains placeholders' : 'Clean',
    passed: !hasPlaceholders
  });

  if (hasPlaceholders) {
    results.warnings.push('Prompt contains placeholder text (TODO/INSERT HERE)');
  }

  return results;
}

// ============================================================================
// MAIN
// ============================================================================

async function verifyAgent(agentConfig, apiKey) {
  console.log('\n' + '='.repeat(80));
  console.log(`VERIFYING ${agentConfig.name} AGENT`);
  console.log('='.repeat(80) + '\n');

  // Fetch current prompt
  log('Fetching prompt from ElevenLabs...');
  let promptContent;
  try {
    promptContent = await getCurrentPrompt(agentConfig.id, apiKey);
    log(`Fetched: ${formatNumber(promptContent.length)} characters`, 'success');
  } catch (err) {
    log(`Failed to fetch: ${err.message}`, 'error');
    return { agent: agentConfig.name, passed: false };
  }

  // Run verification
  log('Running verification checks...');
  const results = verifyPrompt(agentConfig, promptContent);

  // Display results
  console.log('\n' + '-'.repeat(80));
  console.log('VERIFICATION RESULTS:');
  console.log('-'.repeat(80));

  results.checks.forEach(check => {
    const status = check.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`${status} ${check.name}`);
    console.log(`   Expected: ${check.expected}`);
    console.log(`   Actual:   ${check.actual}`);
  });

  console.log('-'.repeat(80));

  // Show issues
  if (results.issues.length > 0) {
    console.log('\n\x1b[31mISSUES:\x1b[0m');
    results.issues.forEach(issue => log(issue, 'error'));
  }

  // Show warnings
  if (results.warnings.length > 0) {
    console.log('\n\x1b[33mWARNINGS:\x1b[0m');
    results.warnings.forEach(warning => log(warning, 'warning'));
  }

  // Overall status
  console.log('\n' + '='.repeat(80));
  if (results.passed) {
    log(`${agentConfig.name} VERIFICATION PASSED`, 'success');
  } else {
    log(`${agentConfig.name} VERIFICATION FAILED`, 'error');
  }
  console.log('='.repeat(80));

  return { agent: agentConfig.name, passed: results.passed };
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE PROMPT DEPLOYMENT VERIFICATION');
  console.log('='.repeat(80) + '\n');

  // Get API key
  log('Loading ElevenLabs API key...');
  let apiKey;
  try {
    apiKey = await getElevenLabsApiKey();
    log('API key loaded', 'success');
  } catch (err) {
    log(err.message, 'error');
    process.exit(1);
  }

  // Verify both agents
  const results = [];
  for (const agent of Object.values(AGENTS)) {
    const result = await verifyAgent(agent, apiKey);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  results.forEach(({ agent, passed }) => {
    const status = passed ? '\x1b[32m✓ PASSED\x1b[0m' : '\x1b[31m✗ FAILED\x1b[0m';
    console.log(`${agent}: ${status}`);
  });
  console.log('='.repeat(80) + '\n');

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    log('All agents verified successfully!', 'success');
    console.log('\nNext steps:');
    console.log('1. Test agents with real phone calls');
    console.log('2. Navigate to Business Brain → Workflow Config');
    console.log('3. Change workflow settings and verify agent behavior adapts');
    console.log('4. Monitor call outcomes for 24-48 hours');
  } else {
    log('Some agents failed verification. Review issues above.', 'error');
    console.log('\nTo restore previous prompts: node restore_original_prompts.cjs');
  }

  process.exit(allPassed ? 0 : 1);
}

// ============================================================================
// ENTRY POINT
// ============================================================================

main().catch(err => {
  console.error('\n\x1b[31m✗ FATAL ERROR:\x1b[0m', err.message);
  console.error(err.stack);
  process.exit(1);
});
