const fs = require('fs');

const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';
const SERVICE_AGENT_ID = 'agent_4701kg1vwhzqfxmvzh032nhvx434';
const SECRET_ID = '9G30VIglbkIoULRKR7xD';

console.log('=== FIX SERVICE AGENT - MAKE TENANT_ID REQUIRED ===\n');
console.log('⚠️  Updating all 10 tools to mark tenant_id as REQUIRED\n');

async function main() {
  const results = {
    updated: [],
    failed: [],
    startTime: new Date().toISOString()
  };

  // Step 1: Get current agent configuration
  console.log('Step 1: Fetching SERVICE agent configuration...');
  const getAgentResponse = await fetch(`${BASE_URL}/v1/convai/agents/${SERVICE_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  if (!getAgentResponse.ok) {
    throw new Error(`Failed to get agent: ${getAgentResponse.status}`);
  }

  const currentAgent = await getAgentResponse.json();
  const toolIds = currentAgent.conversation_config.agent.prompt?.tool_ids || [];

  console.log(`   Found ${toolIds.length} tools to fix\n`);

  // Step 2: Update each tool
  console.log('Step 2: Updating tools to make tenant_id REQUIRED...\n');

  for (let i = 0; i < toolIds.length; i++) {
    const toolId = toolIds[i];
    console.log(`[${i + 1}/${toolIds.length}] Processing ${toolId}...`);

    try {
      // Fetch current tool config
      const toolResponse = await fetch(`${BASE_URL}/v1/convai/tools/${toolId}`, {
        headers: { 'xi-api-key': API_KEY }
      });

      if (!toolResponse.ok) {
        throw new Error(`Failed to fetch tool: ${toolResponse.status}`);
      }

      const tool = await toolResponse.json();
      const toolConfig = tool.tool_config;
      const toolName = toolConfig.name;

      console.log(`   Tool: ${toolName}`);

      // Check if tenant_id exists
      const params = toolConfig.api_schema?.request_body_schema?.properties || {};
      if (!params.tenant_id) {
        console.log('   ⚠️  No tenant_id parameter found - skipping');
        results.failed.push({ toolId, name: toolName, reason: 'No tenant_id parameter' });
        continue;
      }

      // Check if already required
      const required = toolConfig.api_schema?.request_body_schema?.required || [];
      if (required.includes('tenant_id')) {
        console.log('   ✓ tenant_id already REQUIRED - no change needed');
        results.updated.push({ toolId, name: toolName, changed: false });
        continue;
      }

      // Update to make tenant_id required
      const updatedRequired = [...required];
      if (!updatedRequired.includes('tenant_id')) {
        updatedRequired.push('tenant_id');
      }

      const updatedToolConfig = {
        ...toolConfig,
        api_schema: {
          ...toolConfig.api_schema,
          request_body_schema: {
            ...toolConfig.api_schema.request_body_schema,
            required: updatedRequired
          }
        }
      };

      // Update the tool via API
      const updateResponse = await fetch(`${BASE_URL}/v1/convai/tools/${toolId}`, {
        method: 'PATCH',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tool_config: updatedToolConfig })
      });

      if (updateResponse.ok) {
        console.log('   ✅ Updated: tenant_id now REQUIRED');
        results.updated.push({ toolId, name: toolName, changed: true });
      } else {
        const error = await updateResponse.text();
        console.log(`   ✗ Failed to update: ${updateResponse.status} - ${error}`);
        results.failed.push({ toolId, name: toolName, error: `${updateResponse.status}: ${error}` });
      }

    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
      results.failed.push({ toolId, error: error.message });
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const changedCount = results.updated.filter(r => r.changed).length;
  const unchangedCount = results.updated.filter(r => !r.changed).length;

  console.log(`\nUpdated: ${changedCount} tools (tenant_id now REQUIRED)`);
  console.log(`Already correct: ${unchangedCount} tools`);
  console.log(`Failed: ${results.failed.length} tools`);

  if (results.failed.length > 0) {
    console.log('\nFailed tools:');
    results.failed.forEach(f => console.log(`  - ${f.name || f.toolId}: ${f.reason || f.error}`));
  }

  // Save results
  results.endTime = new Date().toISOString();
  fs.writeFileSync('service_agent_fix_results.json', JSON.stringify(results, null, 2));
  console.log('\n✓ Results saved to service_agent_fix_results.json');

  console.log('\n=== FIX COMPLETE ===');
  console.log('\n📋 NEXT STEP:');
  console.log('   Run: node audit_all_elevenlabs_agents.cjs');
  console.log('   Expected: 0 critical issues, significantly fewer warnings');

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
