const { execSync } = require('child_process');
const fs = require('fs');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  DISPATCH AGENT COMPLETE CLEANUP & CONFIGURATION             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

function runStep(stepName, scriptPath, continueOnError = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STEP: ${stepName}`);
  console.log('='.repeat(60));

  try {
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`\n✓ ${stepName} completed successfully`);
    return true;
  } catch (error) {
    console.log(`\n✗ ${stepName} failed`);
    if (!continueOnError) {
      console.log('\n❌ STOPPING: Fix errors before continuing');
      process.exit(1);
    }
    console.log('⚠️  Continuing despite error...');
    return false;
  }
}

async function main() {
  console.log('This script will:\n');
  console.log('  1. Analyze current state');
  console.log('  2. Clean up 34 duplicate tools (preserving SERVICE agent tools)');
  console.log('  3. Fix DISPATCH agent knowledge base');
  console.log('  4. Configure DISPATCH agent with 7 proper tools\n');

  console.log('⚠️  WARNING: This will DELETE tools and modify agent configuration!');
  console.log('\nPress Ctrl+C in the next 10 seconds to cancel...\n');

  await new Promise(resolve => setTimeout(resolve, 10000));

  const startTime = new Date();

  // Step 1: Analyze (already done, but run again for verification)
  console.log('Skipping analysis (already completed - see cleanup_analysis.json)\n');

  // Step 2: Clean up duplicate tools
  const cleanupSuccess = runStep(
    'Cleanup Duplicate Tools',
    'cleanup_duplicate_tools.cjs',
    false // Don't continue if this fails
  );

  if (!cleanupSuccess) {
    console.log('\n❌ Cleanup failed. Check errors above.');
    process.exit(1);
  }

  // Wait a bit for ElevenLabs to process deletions
  console.log('\nWaiting 3 seconds for ElevenLabs to process changes...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Fix knowledge base
  runStep(
    'Fix Knowledge Base',
    'fix_dispatch_knowledge_base.cjs',
    false
  );

  // Wait for KB to be processed
  console.log('\nWaiting 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 4: Configure tools
  runStep(
    'Configure DISPATCH Tools',
    'configure_dispatch_tools_final.cjs',
    false
  );

  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 1000);

  console.log('\n' + '='.repeat(60));
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ✓ COMPLETE - All steps finished successfully!               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nTotal time: ${duration} seconds`);

  console.log('\n📊 RESULTS SUMMARY:\n');

  // Load and display results
  try {
    const cleanupResults = JSON.parse(fs.readFileSync('cleanup_results.json', 'utf8'));
    console.log(`✓ Deleted tools: ${cleanupResults.deleted.length}`);
    console.log(`  Failed deletions: ${cleanupResults.failed.length}`);
  } catch (e) {
    console.log('  (cleanup_results.json not found)');
  }

  try {
    const kbResults = JSON.parse(fs.readFileSync('kb_fix_results.json', 'utf8'));
    console.log(`✓ Knowledge Base: ${kbResults.newKbId}`);
    console.log(`  Content length: ${kbResults.contentLength} chars`);
  } catch (e) {
    console.log('  (kb_fix_results.json not found)');
  }

  try {
    const toolResults = JSON.parse(fs.readFileSync('dispatch_tools_config_results.json', 'utf8'));
    console.log(`✓ Tools configured: ${toolResults.created.length}`);
    console.log(`  Verified: ${toolResults.verified ? 'Yes' : 'No'}`);
  } catch (e) {
    console.log('  (dispatch_tools_config_results.json not found)');
  }

  console.log('\n📋 VERIFICATION STEPS:\n');
  console.log('1. Go to https://elevenlabs.io/app/conversational-ai');
  console.log('2. Select DISPATCH agent');
  console.log('3. Check Knowledge tab:');
  console.log(`   - Should show today's date (${new Date().toLocaleDateString()})`);
  console.log('   - Should show 8,016+ characters');
  console.log('4. Check Tools tab:');
  console.log('   - Should show 7 webhook tools');
  console.log('   - Each should have proper configuration');
  console.log('\n5. OPTIONAL: Test SERVICE agent still works:');
  console.log('   - Should still have 10 tools');
  console.log('   - Should still have its knowledge base');
  console.log('\n6. Run a test call to DISPATCH agent to verify tools work');

  console.log('\n✓ All configuration files saved:');
  console.log('  - cleanup_analysis.json');
  console.log('  - cleanup_results.json');
  console.log('  - kb_fix_results.json');
  console.log('  - dispatch_tools_config_results.json');
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  process.exit(1);
});
