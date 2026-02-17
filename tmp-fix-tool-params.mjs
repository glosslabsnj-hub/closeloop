const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";

const toolIds = [
  "tool_3401khb3cqftf1n9b8w6pxfaf1ef", // check_availability
  "tool_6401khb3cqfvex6vw1q47hv5cznt", // suggest_availability
  "tool_9301khb3cqfwfn1srasnm44fj4hm", // create_booking
  "tool_2101khb3cqfxfhp9zrhvvx38skfw", // check_service_area
  "tool_2101khb3cqfyep28d56z08f1xacs", // create_dispatch_job
  "tool_7501khb3cqfzfmzt27kxqs6f3sn6", // create_callback
  "tool_0001khb3cqg0efktb2rkp5e8ex2h", // cancel_booking
  "tool_0701khb3cqg1fkw9wafdn2mn4wag", // add_to_waitlist
  "tool_3501khb3cqg2f6bahc9a7d1f8jk6", // lookup_active_job
  "tool_6901khb3cqg3f1jvznk4ayzsvgr3", // transfer_to_owner
];

const dvToDescription = {
  tenant_id: "The tenant/business ID from the system prompt context",
  caller_phone: "The caller phone number from the system prompt context",
  twilio_call_sid: "The Twilio call SID from the system prompt context",
};

async function fixTool(toolId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
    headers: { "xi-api-key": API_KEY },
  });
  const tool = await res.json();
  const name = tool.tool_config?.name;
  const props = tool.tool_config?.api_schema?.request_body_schema?.properties || {};

  let changed = false;
  for (const [k, v] of Object.entries(props)) {
    if (v.dynamic_variable) {
      const dvKey = v.dynamic_variable.replace(/[{}]/g, "");
      props[k] = {
        type: v.type,
        description: dvToDescription[dvKey] || `The ${dvKey} value`,
      };
      changed = true;
    }
  }

  if (!changed) {
    console.log(`${name}: no DV params, skipping`);
    return;
  }

  // Clean read-only fields from ALL properties
  for (const [k, v] of Object.entries(props)) {
    delete v.enum;
    delete v.is_system_provided;
    delete v.dynamic_variable;
    delete v.constant_value;
  }

  const patchBody = {
    tool_config: {
      type: tool.tool_config.type,
      name: tool.tool_config.name,
      description: tool.tool_config.description,
      api_schema: tool.tool_config.api_schema,
    },
  };

  const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${toolId}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(patchBody),
  });

  if (patchRes.ok) {
    const result = await patchRes.json();
    const updatedProps = result.tool_config?.api_schema?.request_body_schema?.properties || {};
    const dvCheck = Object.entries(updatedProps).filter(([k, v]) => v.dynamic_variable);
    console.log(`${name}: fixed DV -> LLM (remaining DVs: ${dvCheck.length})`);
  } else {
    const err = await patchRes.text();
    console.log(`${name}: PATCH failed (${patchRes.status}): ${err.substring(0, 300)}`);
  }
}

async function run() {
  for (const id of toolIds) {
    await fixTool(id);
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("\nDone. Check the ElevenLabs dashboard now.");
}

run();
