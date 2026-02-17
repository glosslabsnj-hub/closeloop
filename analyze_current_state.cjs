const fs = require('fs');

console.log('=== ANALYZING CURRENT STATE ===\n');

// 1. Analyze SERVICE agent configuration
console.log('1. SERVICE AGENT ANALYSIS:');
const serviceConfig = JSON.parse(fs.readFileSync('service_agent_full_config.json', 'utf8'));

// Search for tool_ids in the entire config
function findToolIds(obj, path = '') {
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'string' && obj[0].startsWith('tool_')) {
    return { path, ids: obj };
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      const result = findToolIds(obj[key], path ? `${path}.${key}` : key);
      if (result) return result;
    }
  }

  return null;
}

const serviceToolIds = findToolIds(serviceConfig);
if (serviceToolIds) {
  console.log(`   Found tool_ids at: ${serviceToolIds.path}`);
  console.log(`   Count: ${serviceToolIds.ids.length}`);
  console.log(`   IDs:`, serviceToolIds.ids);
  fs.writeFileSync('service_tool_ids.json', JSON.stringify(serviceToolIds.ids, null, 2));
} else {
  console.log('   WARNING: No tool_ids found in SERVICE agent config!');
}

// 2. Analyze workspace tools
console.log('\n2. WORKSPACE TOOLS ANALYSIS:');
const workspaceTools = JSON.parse(fs.readFileSync('workspace_tools_full.json', 'utf8'));
console.log(`   Total tools: ${workspaceTools.length}`);

// Group by tool name
const grouped = {};
workspaceTools.forEach(tool => {
  const name = tool.tool_config.name;
  if (!grouped[name]) {
    grouped[name] = [];
  }
  grouped[name].push({
    id: tool.id,
    created: tool.access_info?.created_at || 'unknown'
  });
});

// Show duplicates
console.log('\n   Duplicate tools:');
let totalDuplicates = 0;
Object.entries(grouped).forEach(([name, instances]) => {
  if (instances.length > 1) {
    console.log(`   - ${name}: ${instances.length} instances`);
    instances.sort((a, b) => a.created.localeCompare(b.created));
    instances.forEach((inst, idx) => {
      console.log(`      [${idx}] ${inst.id} (${inst.created})`);
    });
    totalDuplicates += instances.length - 1; // All but one are duplicates
  }
});

console.log(`\n   Total duplicate instances: ${totalDuplicates}`);
console.log(`   Unique tool types: ${Object.keys(grouped).length}`);

// 3. Cross-reference
if (serviceToolIds) {
  console.log('\n3. CROSS-REFERENCE (SERVICE agent tools vs workspace):');
  const protectedIds = new Set(serviceToolIds.ids);
  const allToolIds = workspaceTools.map(t => t.id);

  const protectedCount = allToolIds.filter(id => protectedIds.has(id)).length;
  const unprotectedCount = allToolIds.filter(id => !protectedIds.has(id)).length;

  console.log(`   Protected (SERVICE is using): ${protectedCount}`);
  console.log(`   Can be deleted: ${unprotectedCount}`);

  // Save analysis
  const analysis = {
    protectedToolIds: serviceToolIds.ids,
    allWorkspaceTools: workspaceTools.map(t => ({
      id: t.id,
      name: t.tool_config.name,
      created: t.access_info?.created_at,
      isProtected: protectedIds.has(t.id)
    })),
    toolsToDelete: workspaceTools
      .filter(t => !protectedIds.has(t.id))
      .map(t => ({ id: t.id, name: t.tool_config.name }))
  };

  fs.writeFileSync('cleanup_analysis.json', JSON.stringify(analysis, null, 2));
  console.log('\n   ✓ Saved cleanup_analysis.json');
}

console.log('\n=== ANALYSIS COMPLETE ===');
