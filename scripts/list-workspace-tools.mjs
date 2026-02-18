/**
 * List all workspace tools to understand the structure
 */

const ELEVENLABS_API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

// Try different endpoints
const endpoints = [
  "https://api.elevenlabs.io/v1/convai/tools",
  "https://api.elevenlabs.io/v1/convai/conversation/tools",
  "https://api.elevenlabs.io/v1/tools",
];

for (const endpoint of endpoints) {
  console.log(`\nTrying: ${endpoint}`);
  const res = await fetch(endpoint, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });
  console.log(`Status: ${res.status}`);

  if (res.ok) {
    const data = await res.json();
    console.log(`Response:`, JSON.stringify(data, null, 2).substring(0, 500));
  } else {
    console.log(`Error:`, await res.text());
  }
}
