const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./dispatch_agent_config.json', 'utf8'));
const vars = config.conversation_config.agent.dynamic_variables.dynamic_variable_placeholders;

console.log("Total dynamic variables:", Object.keys(vars).length);
console.log("\nAll variables:");
console.log(Object.keys(vars).sort().join('\n'));
