const fs = require('fs');

const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';

// Load cleanup analysis
const analysis = JSON.parse(fs.readFileSync('cleanup_analysis.json', 'utf8'));
const toolsToDelete = analysis.toolsToDelete;

console.log('=== CLEANUP DUPLICATE TOOLS ===\n');
console.log(`Protected tools (SERVICE agent): ${analysis.protectedToolIds.length}`);
console.log(`Tools to delete: ${toolsToDelete.length}\n`);

// Dry run first
console.log('DRY RUN - Tools that would be deleted:');
toolsToDelete.forEach((tool, idx) => {
  console.log(`  [${idx + 1}/${toolsToDelete.length}] ${tool.name} (${tool.id})`);
});

console.log('\n⚠️  Press Ctrl+C to cancel or wait 5 seconds to proceed...\n');

setTimeout(async () => {
  console.log('Starting deletion...\n');

  const results = {
    deleted: [],
    failed: [],
    startTime: new Date().toISOString()
  };

  for (let i = 0; i < toolsToDelete.length; i++) {
    const tool = toolsToDelete[i];
    console.log(`[${i + 1}/${toolsToDelete.length}] Deleting ${tool.name} (${tool.id})...`);

    try {
      const response = await fetch(`${BASE_URL}/v1/convai/tools/${tool.id}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': API_KEY
        }
      });

      if (response.ok) {
        console.log(`   ✓ Deleted successfully`);
        results.deleted.push(tool);
      } else {
        const error = await response.text();
        console.log(`   ✗ Failed: ${response.status} - ${error}`);
        results.failed.push({ ...tool, error: `${response.status}: ${error}` });
      }
    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
      results.failed.push({ ...tool, error: error.message });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  results.endTime = new Date().toISOString();

  console.log('\n=== CLEANUP SUMMARY ===');
  console.log(`Deleted: ${results.deleted.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed deletions:');
    results.failed.forEach(tool => {
      console.log(`  - ${tool.name} (${tool.id}): ${tool.error}`);
    });
  }

  // Save results
  fs.writeFileSync('cleanup_results.json', JSON.stringify(results, null, 2));
  console.log('\n✓ Results saved to cleanup_results.json');

  // Verify remaining tools
  console.log('\nVerifying workspace state...');
  try {
    const verifyResponse = await fetch(`${BASE_URL}/v1/convai/tools`, {
      headers: { 'xi-api-key': API_KEY }
    });

    if (verifyResponse.ok) {
      const remainingTools = await verifyResponse.json();
      const toolCount = Array.isArray(remainingTools) ? remainingTools.length : 'unknown';
      console.log(`Remaining tools in workspace: ${toolCount}`);

      if (Array.isArray(remainingTools)) {
        // Check if all protected tools still exist
        const remainingIds = new Set(remainingTools.map(t => t.id));
        const protectedStillExist = analysis.protectedToolIds.filter(id => remainingIds.has(id));

        console.log(`Protected tools still exist: ${protectedStillExist.length}/${analysis.protectedToolIds.length}`);

        if (protectedStillExist.length === analysis.protectedToolIds.length) {
          console.log('✓ All SERVICE agent tools preserved!');
        } else {
          console.log('⚠️  WARNING: Some protected tools may have been deleted!');
        }
      }
    }
  } catch (verifyError) {
    console.log(`⚠️  Verification failed: ${verifyError.message}`);
    console.log('Continuing anyway - check results manually');
  }

  console.log('\n=== CLEANUP COMPLETE ===');
}, 5000);
