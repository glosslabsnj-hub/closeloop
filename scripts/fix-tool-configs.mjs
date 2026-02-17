/**
 * Fix ElevenLabs tool configurations to match backend expectations.
 *
 * HIGH PRIORITY fixes:
 * 1. create_booking: Wrong description + service_requested → service_name
 * 2. create_callback: prefered_time → preferred_time (typo)
 * 3. create_dispatch_job: vehicle_type → vehicle_info
 *
 * Also sets dynamic_variable on tenant_id and customer_phone for all older tools.
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const TOOL_BASE = "https://api.elevenlabs.io/v1/convai/tools";

const TOOLS_TO_FIX = [
  {
    id: "tool_6101kgmevs5ce248r1kgj5d0skgh",
    name: "create_booking",
    fixes: [
      {
        type: "description",
        newValue: "Book the appointment after customer confirms the service, date, and time. Creates a booking hold or confirmed booking depending on the tenant's ai_booking_mode. Returns a confirmation_message to read to the caller."
      },
      {
        type: "rename_property",
        oldName: "service_requested",
        newName: "service_name",
        newDescription: "Short plain-language description of the service requested, using the caller's wording (or a matching Business Brain service name). Example: \"Brake service\", \"Oil change\". No extra commentary."
      },
      {
        type: "set_dynamic_variable",
        property: "tenant_id",
        value: "{{tenant_id}}"
      },
      {
        type: "set_dynamic_variable",
        property: "customer_phone",
        value: "{{caller_phone}}"
      }
    ]
  },
  {
    id: "tool_5101kgngvtv2ffxsnxfr1jd5qv2j",
    name: "create_callback",
    fixes: [
      {
        type: "rename_property",
        oldName: "prefered_time",
        newName: "preferred_time",
        newDescription: "Caller's preferred callback time. Use natural language or HH:MM format."
      },
      {
        type: "set_dynamic_variable",
        property: "tenant_id",
        value: "{{tenant_id}}"
      },
      {
        type: "set_dynamic_variable",
        property: "customer_phone",
        value: "{{caller_phone}}"
      }
    ]
  },
  {
    id: "tool_3101kgj28s1afztv01vymwctamr1",
    name: "create_dispatch_job",
    fixes: [
      {
        type: "rename_property",
        oldName: "vehicle_type",
        newName: "vehicle_info",
        newDescription: "Vehicle details: year, make, model, and color when available. Example: \"2019 Honda Civic, white\" or \"Blue F-150\". If caller only gives partial info, use what they provide."
      },
      {
        type: "set_dynamic_variable",
        property: "tenant_id",
        value: "{{tenant_id}}"
      },
      {
        type: "set_dynamic_variable",
        property: "customer_phone",
        value: "{{caller_phone}}"
      }
    ]
  },
  // Also fix dynamic variables on the other two older tools
  {
    id: "tool_2501kgme13e2fhmvad507ztr5ch4",
    name: "suggest_availability",
    fixes: [
      {
        type: "set_dynamic_variable",
        property: "tenant_id",
        value: "{{tenant_id}}"
      }
    ]
  },
  {
    id: "tool_7801kgj0n9mke7sbsaym23mfq6sa",
    name: "check_service_area",
    fixes: [
      {
        type: "set_dynamic_variable",
        property: "tenant_id",
        value: "{{tenant_id}}"
      }
    ]
  }
];

async function fixTool(toolDef) {
  console.log(`\n--- Fixing ${toolDef.name} (${toolDef.id}) ---`);

  // GET current config
  const getRes = await fetch(`${TOOL_BASE}/${toolDef.id}`, {
    headers: { "xi-api-key": API_KEY }
  });
  if (!getRes.ok) {
    console.log(`  FAILED to GET: ${getRes.status}`);
    return false;
  }
  const current = await getRes.json();
  const config = current.tool_config;
  const props = config.api_schema.request_body_schema.properties;

  // Apply fixes
  for (const fix of toolDef.fixes) {
    if (fix.type === "description") {
      console.log(`  Fixing description...`);
      config.description = fix.newValue;
    }
    else if (fix.type === "rename_property") {
      if (props[fix.oldName]) {
        console.log(`  Renaming property: ${fix.oldName} → ${fix.newName}`);
        const propDef = props[fix.oldName];
        delete props[fix.oldName];
        propDef.description = fix.newDescription;
        props[fix.newName] = propDef;

        // Also update required array if old name was required
        const required = config.api_schema.request_body_schema.required || [];
        const idx = required.indexOf(fix.oldName);
        if (idx >= 0) {
          required[idx] = fix.newName;
        }
      } else {
        console.log(`  WARNING: Property ${fix.oldName} not found, skipping rename`);
      }
    }
    else if (fix.type === "set_dynamic_variable") {
      if (props[fix.property]) {
        console.log(`  Setting dynamic_variable on ${fix.property}: ${fix.value}`);
        // When setting dynamic_variable, must clear description (ElevenLabs only allows one of these)
        props[fix.property].dynamic_variable = fix.value;
        delete props[fix.property].description;
        props[fix.property].constant_value = "";
        props[fix.property].is_system_provided = false;
        props[fix.property].enum = null;
      } else {
        console.log(`  WARNING: Property ${fix.property} not found, skipping dynamic_variable`);
      }
    }
  }

  // PATCH back
  const patchRes = await fetch(`${TOOL_BASE}/${toolDef.id}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ tool_config: config })
  });

  if (patchRes.ok) {
    const result = await patchRes.json();
    const resultProps = result.tool_config?.api_schema?.request_body_schema?.properties || {};
    const propNames = Object.keys(resultProps);
    console.log(`  OK: Updated. Properties: ${JSON.stringify(propNames)}`);
    return true;
  } else {
    const err = await patchRes.text();
    console.log(`  FAILED (${patchRes.status}): ${err}`);
    return false;
  }
}

async function run() {
  let allOk = true;
  for (const tool of TOOLS_TO_FIX) {
    const ok = await fixTool(tool);
    if (!ok) allOk = false;
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n" + "=".repeat(60));
  console.log(allOk ? "ALL TOOL FIXES APPLIED" : "SOME FIXES FAILED - review above");
  console.log("=".repeat(60));
}

run();
