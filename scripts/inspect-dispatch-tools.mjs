/**
 * Inspect DISPATCH agent tools to see correct schema format
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const DISPATCH_AGENT_ID = "agent_2601kghfpmckez3t2n6p7bmcpac4";

const res = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${DISPATCH_AGENT_ID}`,
  {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  }
);

const data = await res.json();
const tools = data.conversation_config?.agent?.prompt?.tools || [];

console.log("DISPATCH agent has", tools.length, "tools");
console.log("\nFirst tool structure:");
console.log(JSON.stringify(tools[0], null, 2));
