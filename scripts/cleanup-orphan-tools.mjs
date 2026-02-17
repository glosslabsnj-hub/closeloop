/**
 * Delete orphaned duplicate tools from ElevenLabs workspace.
 * These were accidentally created by the earlier update script.
 * Only deletes tools NOT actively assigned to any agent.
 *
 * Pass --dry-run to list without deleting.
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const TOOL_BASE = "https://api.elevenlabs.io/v1/convai/tools";
const DRY_RUN = process.argv.includes("--dry-run");

// Tools actively assigned to agents — DO NOT DELETE
const ACTIVE_TOOL_IDS = new Set([
  "tool_2501kgme13e2fhmvad507ztr5ch4",  // suggest_availability
  "tool_5101kgngvtv2ffxsnxfr1jd5qv2j",  // create_callback
  "tool_6101kgmevs5ce248r1kgj5d0skgh",  // create_booking
  "tool_7801kgj0n9mke7sbsaym23mfq6sa",  // check_service_area
  "tool_3101kgj28s1afztv01vymwctamr1",  // create_dispatch_job
  "tool_3001khapzps8e22v53nneyzeq0hp",  // check_availability (new)
  "tool_8701khapz0mhe9jvxgcfpxrnpzh4",  // lookup_dispatch_status (new)
  "tool_8701khapxksmer6bvphg477vcq08",  // cancel_booking (new)
  "tool_1201khapxksnfr9vhfka0431k79y",  // add_to_waitlist (new)
  "tool_2601kgqw7y0ve9h89vabt297ry0h",  // check_impound
  "tool_6301kgqwb2rqf9c8zjgjq2nzqpdd",  // get_impound_release_info
  "tool_3101kgqwdd7fea4bbc29xq93rkha",  // get_impound_lot_info
]);

async function run() {
  const res = await fetch(TOOL_BASE, { headers: { "xi-api-key": API_KEY } });
  const data = await res.json();
  const tools = data.tools || [];

  const orphans = tools.filter(t => ACTIVE_TOOL_IDS.has(t.id) === false);

  console.log(`Active tools: ${ACTIVE_TOOL_IDS.size}`);
  console.log(`Total workspace tools: ${tools.length}`);
  console.log(`Orphaned tools to delete: ${orphans.length}`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE DELETE"}`);
  console.log();

  let deleted = 0;
  for (const o of orphans) {
    const name = o.tool_config?.name || "unknown";
    if (DRY_RUN) {
      console.log(`  [DRY] Would delete: ${o.id} (${name})`);
    } else {
      const delRes = await fetch(`${TOOL_BASE}/${o.id}`, {
        method: "DELETE",
        headers: { "xi-api-key": API_KEY }
      });
      if (delRes.ok || delRes.status === 204) {
        console.log(`  [DEL] Deleted: ${o.id} (${name})`);
        deleted++;
      } else {
        console.log(`  [ERR] Failed to delete ${o.id} (${name}): ${delRes.status}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\nDone. ${DRY_RUN ? "Would delete" : "Deleted"} ${DRY_RUN ? orphans.length : deleted}/${orphans.length} orphaned tools.`);
}

run();
