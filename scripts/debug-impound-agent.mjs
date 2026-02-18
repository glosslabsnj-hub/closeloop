/**
 * Debug IMPOUND agent to see full structure
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const IMPOUND_AGENT_ID = "agent_6301kgqscdvyek3a6wgegq8et167";

const res = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${IMPOUND_AGENT_ID}`,
  {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  }
);

const data = await res.json();

console.log("Full IMPOUND agent config:");
console.log(JSON.stringify(data, null, 2));
