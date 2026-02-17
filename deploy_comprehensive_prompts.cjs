#!/usr/bin/env node
/**
 * DEPLOY COMPREHENSIVE ELEVENLABS AGENT PROMPTS
 *
 * This script safely deploys comprehensive, production-ready prompts to ElevenLabs agents.
 *
 * FEATURES:
 * - Pre-deployment safety checks (character count, workflow config variables)
 * - Interactive confirmation with preview
 * - Uploads to ElevenLabs via PATCH API
 * - Post-deployment verification
 * - Before/after comparison
 * - Automatic backup of current prompts
 *
 * USAGE:
 *   node deploy_comprehensive_prompts.cjs
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================================
// CONFIGURATION
// ============================================================================

const AGENTS = {
  DISPATCH: {
    id: 'agent_2601kghfpmckez3t2n6p7bmcpac4',
    name: 'DISPATCH',
    prompt_file: path.join(__dirname, 'docs', 'dispatch_universal.txt'),
    min_chars: 50000,
    required_variables: [
      'dispatch_vehicle_timing',
      'dispatch_luxury_flatbed_enabled',
      'dispatch_payment_timing',
      'dispatch_confirm_geocoded_address',
      'dispatch_include_direct_contact',
      'business_tagline',
      'years_in_business',
      'tone',
      'ai_behavior_mode'
    ]
  },
  SERVICE: {
    id: 'agent_4701kg1vwhzqfxmvzh032nhvx434',
    name: 'SERVICE',
    prompt_file: path.join(__dirname, 'docs', 'service_comprehensive.txt'),
    min_chars: 50000,
    required_variables: [
      'service_deposit_upfront',
      'service_deposit_timing',
      'service_suggest_alternatives',
      'service_max_alternatives',
      'ai_behavior_mode',
      'tone'
    ]
  }
};

const BACKUP_DIR = path.join(__dirname, 'docs', 'backups');
const API_BASE = 'https://api.elevenlabs.io/v1/convai/agents';

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '\x1b[36mℹ\x1b[0m',
    success: '\x1b[32m✓\x1b[0m',
    warning: '\x1b[33m⚠\x1b[0m',
    error: '\x1b[31m✗\x1b[0m',
    prompt: '\x1b[35m?\x1b[0m'
  }[type] || 'ℹ';

  console.log(`${prefix} ${message}`);
}

function formatNumber(num) {
  return num.toLocaleString();
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`\n\x1b[35m?\x1b[0m ${question} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

// ============================================================================
// PROMPT VALIDATION
// ============================================================================

function validatePrompt(agentConfig, promptContent) {
  const issues = [];
  const warnings = [];

  // Check character count
  if (promptContent.length < agentConfig.min_chars) {
    issues.push(`Prompt is too short: ${formatNumber(promptContent.length)} chars (min: ${formatNumber(agentConfig.min_chars)})`);
  }

  // Check for required workflow config variables (check both {{var}} and {{#if var}})
  const missingVars = agentConfig.required_variables.filter(
    varName => !promptContent.includes(`{{${varName}}}`) && !promptContent.includes(`{{#if ${varName}`)
  );
  if (missingVars.length > 0) {
    issues.push(`Missing required variables: ${missingVars.join(', ')}`);
  }

  // Check for placeholder text
  if (promptContent.includes('TODO') || promptContent.includes('INSERT HERE')) {
    warnings.push('Prompt contains placeholder text (TODO/INSERT HERE)');
  }

  // Check for broken template syntax
  const openIfs = (promptContent.match(/\{\{#if/g) || []).length;
  const closeIfs = (promptContent.match(/\{\{\/if\}\}/g) || []).length;
  if (openIfs !== closeIfs) {
    issues.push(`Unbalanced if/endif blocks: ${openIfs} opens, ${closeIfs} closes`);
  }

  return { issues, warnings };
}

// ============================================================================
// ELEVENLABS API
// ============================================================================

async function getElevenLabsApiKey() {
  const envPath = path.join(__dirname, '.env.local');

  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found. Cannot deploy without ElevenLabs API key.');
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

async function updatePrompt(agentId, newPrompt, apiKey) {
  const response = await fetch(`${API_BASE}/${agentId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            prompt: newPrompt
          }
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update agent: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return response.json();
}

// ============================================================================
// BACKUP
// ============================================================================

function backupCurrentPrompt(agentName, promptContent) {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `${agentName}_backup_${timestamp}.txt`;
  const backupPath = path.join(BACKUP_DIR, filename);

  fs.writeFileSync(backupPath, promptContent, 'utf-8');
  log(`Backed up current prompt to: ${filename}`, 'success');

  return backupPath;
}

// ============================================================================
// MAIN DEPLOYMENT FLOW
// ============================================================================

async function deployAgent(agentConfig, apiKey) {
  console.log('\n' + '='.repeat(80));
  console.log(`DEPLOYING ${agentConfig.name} AGENT`);
  console.log('='.repeat(80) + '\n');

  // Step 1: Load new prompt
  log('Loading new prompt from file...');
  if (!fs.existsSync(agentConfig.prompt_file)) {
    log(`Prompt file not found: ${agentConfig.prompt_file}`, 'error');
    return false;
  }

  const newPrompt = fs.readFileSync(agentConfig.prompt_file, 'utf-8');
  log(`Loaded prompt: ${formatNumber(newPrompt.length)} characters`, 'success');

  // Step 2: Validate new prompt
  log('Validating new prompt...');
  const validation = validatePrompt(agentConfig, newPrompt);

  if (validation.warnings.length > 0) {
    validation.warnings.forEach(w => log(w, 'warning'));
  }

  if (validation.issues.length > 0) {
    log('Validation failed:', 'error');
    validation.issues.forEach(i => log(`  - ${i}`, 'error'));
    return false;
  }

  log('Validation passed', 'success');

  // Step 3: Fetch current prompt
  log('Fetching current prompt from ElevenLabs...');
  let currentPrompt;
  try {
    currentPrompt = await getCurrentPrompt(agentConfig.id, apiKey);
    log(`Current prompt: ${formatNumber(currentPrompt.length)} characters`, 'success');
  } catch (err) {
    log(`Failed to fetch current prompt: ${err.message}`, 'error');
    return false;
  }

  // Step 4: Show comparison
  console.log('\n' + '-'.repeat(80));
  console.log('COMPARISON:');
  console.log('-'.repeat(80));
  console.log(`Current: ${formatNumber(currentPrompt.length)} characters`);
  console.log(`New:     ${formatNumber(newPrompt.length)} characters`);
  console.log(`Change:  ${newPrompt.length > currentPrompt.length ? '+' : ''}${formatNumber(newPrompt.length - currentPrompt.length)} characters`);
  console.log('-'.repeat(80) + '\n');

  // Step 5: Show preview
  console.log('PREVIEW (first 500 characters of new prompt):');
  console.log('-'.repeat(80));
  console.log(newPrompt.substring(0, 500) + '...');
  console.log('-'.repeat(80) + '\n');

  // Step 6: Confirm deployment
  const confirm = await promptUser(`Deploy this prompt to ${agentConfig.name} agent? (yes/no)`);
  if (confirm !== 'yes' && confirm !== 'y') {
    log('Deployment cancelled by user', 'warning');
    return false;
  }

  // Step 7: Backup current prompt
  log('Backing up current prompt...');
  backupCurrentPrompt(agentConfig.name, currentPrompt);

  // Step 8: Deploy new prompt
  log('Uploading new prompt to ElevenLabs...');
  try {
    await updatePrompt(agentConfig.id, newPrompt, apiKey);
    log('Upload successful!', 'success');
  } catch (err) {
    log(`Upload failed: ${err.message}`, 'error');
    return false;
  }

  // Step 9: Verify deployment
  log('Verifying deployment...');
  try {
    const verifyPrompt = await getCurrentPrompt(agentConfig.id, apiKey);

    if (verifyPrompt.length !== newPrompt.length) {
      log(`Verification failed: Size mismatch (expected ${formatNumber(newPrompt.length)}, got ${formatNumber(verifyPrompt.length)})`, 'error');
      return false;
    }

    // Check for key sections
    const keyChecks = agentConfig.required_variables.every(v => verifyPrompt.includes(`{{${v}}}`));
    if (!keyChecks) {
      log('Verification failed: Missing required variables in deployed prompt', 'error');
      return false;
    }

    log('Verification passed!', 'success');
  } catch (err) {
    log(`Verification failed: ${err.message}`, 'error');
    return false;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✓ ${agentConfig.name} DEPLOYMENT COMPLETE`);
  console.log('='.repeat(80) + '\n');

  return true;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('ELEVENLABS COMPREHENSIVE PROMPT DEPLOYMENT');
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

  // Select agents to deploy
  console.log('\nAvailable agents:');
  console.log('1. DISPATCH');
  console.log('2. SERVICE');
  console.log('3. Both (DISPATCH + SERVICE)');

  const choice = await promptUser('Which agent(s) do you want to deploy? (1/2/3)');

  const toDeploy = [];
  if (choice === '1') {
    toDeploy.push(AGENTS.DISPATCH);
  } else if (choice === '2') {
    toDeploy.push(AGENTS.SERVICE);
  } else if (choice === '3') {
    toDeploy.push(AGENTS.DISPATCH, AGENTS.SERVICE);
  } else {
    log('Invalid choice', 'error');
    process.exit(1);
  }

  // Deploy selected agents
  const results = [];
  for (const agent of toDeploy) {
    const success = await deployAgent(agent, apiKey);
    results.push({ agent: agent.name, success });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('DEPLOYMENT SUMMARY');
  console.log('='.repeat(80));
  results.forEach(({ agent, success }) => {
    const status = success ? '\x1b[32m✓ SUCCESS\x1b[0m' : '\x1b[31m✗ FAILED\x1b[0m';
    console.log(`${agent}: ${status}`);
  });
  console.log('='.repeat(80) + '\n');

  const allSuccess = results.every(r => r.success);
  if (allSuccess) {
    log('All deployments completed successfully!', 'success');
    console.log('\nNext steps:');
    console.log('1. Test the agents with real phone calls');
    console.log('2. Navigate to Business Brain → Workflow Config');
    console.log('3. Modify workflow settings and verify agent adapts behavior');
    console.log('4. If issues found, run: node restore_original_prompts.cjs');
  } else {
    log('Some deployments failed. Check logs above for details.', 'error');
    console.log('\nTo restore previous prompts, run: node restore_original_prompts.cjs');
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

main().catch(err => {
  console.error('\n\x1b[31m✗ FATAL ERROR:\x1b[0m', err.message);
  console.error(err.stack);
  process.exit(1);
});
