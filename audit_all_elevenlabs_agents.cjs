const fs = require('fs');

const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';

console.log('=== AUDIT ALL ELEVENLABS AGENTS ===\n');
console.log('Checking for common configuration issues:\n');
console.log('1. Missing tenant_id parameter in tools');
console.log('2. Missing conversation_id parameter in tools');
console.log('3. Missing dynamic variables');
console.log('4. Tool parameter mismatches with edge functions\n');

// Known edge function parameter requirements
const EDGE_FUNCTION_REQUIREMENTS = {
  'elevenlabs-create-dispatch-job': {
    required: ['pickup_address', 'service_type', 'tenant_id'],
    optional: ['conversation_id', 'customer_name', 'customer_phone', 'vehicle_info', 'dropoff_address', 'drivable', 'urgency', 'notes']
  },
  'elevenlabs-check-service-area': {
    required: ['address', 'tenant_id'],
    optional: ['conversation_id', 'customer_phone', 'service_type', 'vehicle_type', 'dropoff_address']
  },
  'elevenlabs-create-booking': {
    required: ['customer_name', 'date', 'time', 'tenant_id'],
    optional: ['conversation_id', 'customer_phone', 'service_id', 'notes']
  },
  'elevenlabs-suggest-availability': {
    required: ['tenant_id'],
    optional: ['conversation_id', 'date', 'service_name', 'preference']
  },
  'elevenlabs-check-availability': {
    required: ['date', 'time', 'tenant_id'],
    optional: ['conversation_id', 'service_id']
  },
  'elevenlabs-create-callback': {
    required: ['customer_phone', 'reason', 'tenant_id'],
    optional: ['conversation_id', 'customer_name', 'notes', 'best_time']
  },
  'elevenlabs-lookup-dispatch-status': {
    required: ['tenant_id'],
    optional: ['conversation_id', 'customer_phone', 'job_number']
  }
};

// Critical dynamic variables that should be present
const REQUIRED_DYNAMIC_VARS = [
  'tenant_id',
  'business_name',
  'business_mode',
  'enabled_modules',
  'timezone',
  'caller_phone',
  'tone'
];

async function auditAgent(agentId, agentName) {
  const issues = [];
  const warnings = [];

  console.log(`\n${'='.repeat(80)}`);
  console.log(`AUDITING: ${agentName} (${agentId})`);
  console.log('='.repeat(80));

  try {
    // Fetch agent configuration
    const response = await fetch(`${BASE_URL}/v1/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': API_KEY }
    });

    if (!response.ok) {
      issues.push(`Failed to fetch agent: ${response.status}`);
      return { agentName, agentId, issues, warnings };
    }

    const agent = await response.json();

    // Check 1: Dynamic variables
    console.log('\n1️⃣  CHECKING DYNAMIC VARIABLES...');
    const dynamicVars = agent.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {};
    const varCount = Object.keys(dynamicVars).length;

    console.log(`   Found ${varCount} dynamic variables`);

    if (varCount === 0) {
      issues.push('❌ NO DYNAMIC VARIABLES CONFIGURED');
    } else {
      console.log('   ✅ Dynamic variables present');

      // Check for required variables
      const missing = REQUIRED_DYNAMIC_VARS.filter(v => !(v in dynamicVars));
      if (missing.length > 0) {
        warnings.push(`⚠️  Missing recommended variables: ${missing.join(', ')}`);
      }
    }

    // Check 2: Tools
    console.log('\n2️⃣  CHECKING TOOLS...');
    const toolIds = agent.conversation_config?.agent?.prompt?.tool_ids || [];
    console.log(`   Found ${toolIds.length} tools attached`);

    if (toolIds.length === 0) {
      warnings.push('⚠️  No tools configured (may be intentional)');
    } else {
      // Fetch each tool to check parameters
      for (const toolId of toolIds) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit

        const toolResponse = await fetch(`${BASE_URL}/v1/convai/tools/${toolId}`, {
          headers: { 'xi-api-key': API_KEY }
        });

        if (!toolResponse.ok) {
          warnings.push(`⚠️  Could not fetch tool ${toolId}`);
          continue;
        }

        const tool = await toolResponse.json();
        const toolConfig = tool.tool_config || tool; // Handle both response formats
        const toolName = toolConfig.name;
        const toolUrl = toolConfig.api_schema?.url || '';
        const params = toolConfig.api_schema?.request_body_schema?.properties || {};
        const paramNames = Object.keys(params);

        console.log(`\n   📋 Tool: ${toolName}`);
        console.log(`      URL: ${toolUrl}`);
        console.log(`      Parameters: ${paramNames.join(', ')}`);

        // Check for tenant_id
        if (!paramNames.includes('tenant_id')) {
          issues.push(`❌ ${toolName}: Missing tenant_id parameter`);
        } else {
          const requiredParams = toolConfig.api_schema?.request_body_schema?.required || [];
          const tenantIdRequired = requiredParams.includes('tenant_id');
          if (!tenantIdRequired) {
            warnings.push(`⚠️  ${toolName}: tenant_id is not marked as required`);
          } else {
            console.log('      ✅ tenant_id (required)');
          }
        }

        // Check for conversation_id
        if (!paramNames.includes('conversation_id')) {
          warnings.push(`⚠️  ${toolName}: Missing conversation_id parameter (recommended)`);
        } else {
          console.log('      ✅ conversation_id (optional)');
        }

        // Check against known edge function requirements
        const functionName = toolUrl.split('/').pop();
        if (EDGE_FUNCTION_REQUIREMENTS[functionName]) {
          const requirements = EDGE_FUNCTION_REQUIREMENTS[functionName];

          // Check required parameters
          for (const requiredParam of requirements.required) {
            if (!paramNames.includes(requiredParam)) {
              issues.push(`❌ ${toolName}: Missing REQUIRED parameter "${requiredParam}" for ${functionName}`);
            }
          }

          // Check for extra parameters not in requirements
          const allExpected = [...requirements.required, ...requirements.optional];
          const extra = paramNames.filter(p => !allExpected.includes(p));
          if (extra.length > 0) {
            warnings.push(`⚠️  ${toolName}: Has unexpected parameters: ${extra.join(', ')}`);
          }
        }
      }
    }

    // Check 3: System prompt
    console.log('\n3️⃣  CHECKING SYSTEM PROMPT...');
    const promptText = agent.conversation_config?.agent?.prompt?.prompt || '';

    if (!promptText) {
      issues.push('❌ No system prompt configured');
    } else {
      console.log(`   System prompt length: ${promptText.length} characters`);

      // Check for dynamic variable usage
      const varUsage = promptText.match(/\{\{[^}]+\}\}/g) || [];
      console.log(`   Dynamic variables referenced: ${varUsage.length}`);

      if (varUsage.length === 0) {
        warnings.push('⚠️  System prompt does not reference any dynamic variables');
      }

      // Check if prompt mentions passing tenant_id to tools
      if (!promptText.includes('tenant_id') && toolIds.length > 0) {
        warnings.push('⚠️  System prompt should instruct agent to pass {{tenant_id}} to tools');
      } else if (toolIds.length > 0) {
        console.log('   ✅ Prompt references tenant_id');
      }
    }

  } catch (error) {
    issues.push(`❌ Error auditing agent: ${error.message}`);
  }

  return { agentName, agentId, issues, warnings };
}

async function main() {
  // Known agents to audit
  const agents = [
    { id: 'agent_2601kghfpmckez3t2n6p7bmcpac4', name: 'DISPATCH Agent' },
    { id: 'agent_4701kg1vwhzqfxmvzh032nhvx434', name: 'SERVICE Agent' },
    // Add other agents here if known
  ];

  console.log(`Found ${agents.length} agents to audit\n`);

  const results = [];

  for (const agent of agents) {
    const result = await auditAgent(agent.id, agent.name);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary report
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(80));

  let totalIssues = 0;
  let totalWarnings = 0;

  for (const result of results) {
    console.log(`\n${result.agentName}:`);

    if (result.issues.length === 0 && result.warnings.length === 0) {
      console.log('  ✅ No issues found');
    } else {
      if (result.issues.length > 0) {
        console.log(`  ❌ ${result.issues.length} critical issues:`);
        result.issues.forEach(issue => console.log(`     ${issue}`));
        totalIssues += result.issues.length;
      }

      if (result.warnings.length > 0) {
        console.log(`  ⚠️  ${result.warnings.length} warnings:`);
        result.warnings.forEach(warning => console.log(`     ${warning}`));
        totalWarnings += result.warnings.length;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${totalIssues} critical issues, ${totalWarnings} warnings`);
  console.log('='.repeat(80));

  // Save detailed report
  const report = {
    auditDate: new Date().toISOString(),
    totalAgents: agents.length,
    totalIssues,
    totalWarnings,
    results
  };

  fs.writeFileSync('elevenlabs_audit_report.json', JSON.stringify(report, null, 2));
  console.log('\n✓ Detailed report saved to elevenlabs_audit_report.json');

  // Return exit code based on issues
  if (totalIssues > 0) {
    console.log('\n⚠️  CRITICAL ISSUES FOUND - Review and fix before production use');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n✓ No critical issues, but review warnings');
    process.exit(0);
  } else {
    console.log('\n✅ All agents passed audit');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ AUDIT FAILED:', error.message);
  process.exit(1);
});
