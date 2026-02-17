/**
 * Extract tool_ids from SERVICE agent config
 */

const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./service_agent_full_config.json', 'utf8'));

const toolIds = config.conversation_config?.agent?.tool_ids || [];

console.log(`Found ${toolIds.length} tool IDs in SERVICE agent config:\n`);
toolIds.forEach((id, i) => {
  console.log(`${i + 1}. ${id}`);
});

// Write to file
fs.writeFileSync('./service_agent_tool_ids.json', JSON.stringify(toolIds, null, 2));
console.log('\n📄 Saved to: service_agent_tool_ids.json');
