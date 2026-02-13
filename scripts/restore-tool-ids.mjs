/**
 * Restore tool_ids on all 7 ElevenLabs agents.
 *
 * 4 original tools were deleted from the workspace:
 *   - tool_5901kgme81yaepbvw465xsv67hdr (check-availability) — replaced by tool_3001khapzps8e22v53nneyzeq0hp (check_availability)
 *   - tool_4101kgt0zn67emmt8z9s1ynrfk1r (lookup_dispatch_status) — replaced by tool_8701khapz0mhe9jvxgcfpxrnpzh4
 *   - tool_8001kgtnrh6geatt1vqjq8caf8kg (cancel_booking) — replaced by tool_8701khapxksmer6bvphg477vcq08
 *   - tool_0001kgtnynxjeg4shghgzvz48v46 (add_to_waitlist) — replaced by tool_1201khapxksnfr9vhfka0431k79y
 *
 * Key fix: Medical agent gets create_booking instead of create_dispatch_job.
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai/agents";

// Original surviving tools
const SUGGEST_AVAILABILITY = "tool_2501kgme13e2fhmvad507ztr5ch4";
const CREATE_CALLBACK       = "tool_5101kgngvtv2ffxsnxfr1jd5qv2j";
const CREATE_BOOKING        = "tool_6101kgmevs5ce248r1kgj5d0skgh";
const CHECK_SERVICE_AREA    = "tool_7801kgj0n9mke7sbsaym23mfq6sa";
const CREATE_DISPATCH_JOB   = "tool_3101kgj28s1afztv01vymwctamr1";
const CHECK_IMPOUND         = "tool_2601kgqw7y0ve9h89vabt297ry0h";
const GET_IMPOUND_RELEASE   = "tool_6301kgqwb2rqf9c8zjgjq2nzqpdd";
const GET_IMPOUND_LOT_INFO  = "tool_3101kgqwdd7fea4bbc29xq93rkha";

// New replacements for deleted tools (created by earlier update script)
const CHECK_AVAILABILITY      = "tool_3001khapzps8e22v53nneyzeq0hp";  // replaces deleted check-availability
const LOOKUP_DISPATCH_STATUS  = "tool_8701khapz0mhe9jvxgcfpxrnpzh4";  // replaces deleted lookup_dispatch_status
const CANCEL_BOOKING          = "tool_8701khapxksmer6bvphg477vcq08";  // replaces deleted cancel_booking
const ADD_TO_WAITLIST         = "tool_1201khapxksnfr9vhfka0431k79y";  // replaces deleted add_to_waitlist

const AGENTS = [
  {
    mode: "general",
    id: "agent_9601kghg3djcfbfvwxxfkrxqpmq9",
    expected: 3,
    tool_ids: [
      CHECK_AVAILABILITY,     // check_availability
      SUGGEST_AVAILABILITY,   // suggest_availability
      CREATE_CALLBACK,        // create_callback
    ]
  },
  {
    mode: "medical",
    id: "agent_1001kghfstqzfryadtx3kh9t4ye4",
    expected: 5,
    // FIXED: create_booking instead of create_dispatch_job
    tool_ids: [
      CHECK_AVAILABILITY,     // check_availability
      SUGGEST_AVAILABILITY,   // suggest_availability
      CREATE_BOOKING,         // create_booking (NOT create_dispatch_job)
      CHECK_SERVICE_AREA,     // check_service_area
      CREATE_CALLBACK,        // create_callback
    ]
  },
  {
    mode: "food",
    id: "agent_6501kghfd7pcf5dte8k61wnn0m58",
    expected: 6,
    tool_ids: [
      CHECK_AVAILABILITY,     // check_availability
      SUGGEST_AVAILABILITY,   // suggest_availability
      CREATE_BOOKING,         // create_booking
      CHECK_SERVICE_AREA,     // check_service_area
      CREATE_DISPATCH_JOB,    // create_dispatch_job
      CREATE_CALLBACK,        // create_callback
    ]
  },
  {
    mode: "service",
    id: "agent_4701kg1vwhzqfxmvzh032nhvx434",
    expected: 8,
    tool_ids: [
      CHECK_AVAILABILITY,     // check_availability
      SUGGEST_AVAILABILITY,   // suggest_availability
      CREATE_BOOKING,         // create_booking
      CHECK_SERVICE_AREA,     // check_service_area
      CREATE_DISPATCH_JOB,    // create_dispatch_job
      CREATE_CALLBACK,        // create_callback
      CANCEL_BOOKING,         // cancel_booking (new replacement)
      ADD_TO_WAITLIST,        // add_to_waitlist (new replacement)
    ]
  },
  {
    mode: "dispatch",
    id: "agent_2601kghfpmckez3t2n6p7bmcpac4",
    expected: 7,
    tool_ids: [
      CHECK_AVAILABILITY,       // check_availability
      SUGGEST_AVAILABILITY,     // suggest_availability
      CREATE_BOOKING,           // create_booking
      CHECK_SERVICE_AREA,       // check_service_area
      CREATE_DISPATCH_JOB,      // create_dispatch_job
      CREATE_CALLBACK,          // create_callback
      LOOKUP_DISPATCH_STATUS,   // lookup_dispatch_status (new replacement)
    ]
  },
  {
    mode: "sales",
    id: "agent_2301kh5ertzwfas9e9badpers2cf",
    expected: 5,
    tool_ids: [
      CHECK_AVAILABILITY,     // check_availability
      SUGGEST_AVAILABILITY,   // suggest_availability
      CREATE_BOOKING,         // create_booking
      CHECK_SERVICE_AREA,     // check_service_area
      CREATE_CALLBACK,        // create_callback
    ]
  },
  {
    mode: "impound",
    id: "agent_6301kgqscdvyek3a6wgegq8et167",
    expected: 9,
    tool_ids: [
      CHECK_AVAILABILITY,     // check_availability
      SUGGEST_AVAILABILITY,   // suggest_availability
      CREATE_BOOKING,         // create_booking
      CHECK_SERVICE_AREA,     // check_service_area
      CREATE_DISPATCH_JOB,    // create_dispatch_job
      CREATE_CALLBACK,        // create_callback
      CHECK_IMPOUND,          // check_impound
      GET_IMPOUND_RELEASE,    // get_impound_release_info
      GET_IMPOUND_LOT_INFO,   // get_impound_lot_info
    ]
  }
];

async function run() {
  let allOk = true;

  for (const agent of AGENTS) {
    console.log(`\n--- Restoring tools for ${agent.mode.toUpperCase()} (${agent.tool_ids.length} tools) ---`);

    const payload = {
      conversation_config: {
        agent: {
          prompt: {
            tool_ids: agent.tool_ids
          }
        }
      }
    };

    const res = await fetch(`${BASE}/${agent.id}`, {
      method: "PATCH",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const tools = data.conversation_config?.agent?.prompt?.tools || [];
      console.log(`  OK: ${tools.length} tools restored`);
      console.log(`  Tools: ${JSON.stringify(tools.map(t => t.name))}`);
      if (tools.length !== agent.expected) {
        console.log(`  WARNING: Expected ${agent.expected} but got ${tools.length}`);
        allOk = false;
      }
    } else {
      const err = await res.text();
      console.log(`  FAILED (${res.status}): ${err}`);
      allOk = false;
    }

    // 2 second delay between agents
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("\n" + "=".repeat(60));
  console.log(allOk ? "ALL TOOL RESTORATIONS SUCCEEDED" : "SOME RESTORATIONS FAILED - review above");
  console.log("=".repeat(60));
}

run();
