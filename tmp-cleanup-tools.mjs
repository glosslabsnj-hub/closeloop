const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

const ASSIGNED = new Set([
  'tool_0301khaze2ebfebaw9pkbpt72w20',
  'tool_5601khaze487ftd8ndgaw1wmaedc',
  'tool_9101khaze58re20b4g7fy6r5z8p5',
  'tool_2301khaze76petkafbed2vaty0cj',
  'tool_5701khaze94gfxg9snja1axm4e52',
  'tool_7301khazeb2ced9rx0rjw5j7hfbc',
  'tool_4801khazed26fdnbj2cnxzn7neh5',
  'tool_2901khazef1aeswr0ekefdvsh8c1',
  'tool_4601khazeg6bf649q71c78zkgcgr',
  'tool_4201khazej8xeyvrn5nxt9pymgat'
]);

async function run() {
  const res = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
    headers: { "xi-api-key": API_KEY }
  });
  const data = await res.json();
  const tools = data.tools || data;
  const orphans = tools.filter(t => !ASSIGNED.has(t.id));

  console.log(`Found ${orphans.length} orphaned tools to delete`);

  for (const t of orphans) {
    const name = t.name || t.tool_config?.name || "unknown";
    const delRes = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${t.id}`, {
      method: "DELETE",
      headers: { "xi-api-key": API_KEY }
    });
    console.log(`  Deleted ${t.id} (${name}) - ${delRes.status}`);
  }

  console.log("Done. Remaining tools should be only the 10 assigned ones.");
}

run();
