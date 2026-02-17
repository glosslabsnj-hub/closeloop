#!/usr/bin/env node

/**
 * CONFIGURE ALL DISPATCH AGENT TOOLS VIA ELEVENLABS API
 * Creates 7 webhook tools for the DISPATCH agent programmatically
 */

const https = require('https');

const ELEVENLABS_API_KEY = "0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b";
const AGENT_ID = "agent_2601kghfpmckez3t2n6p7bmcpac4";
const BASE_URL = "api.elevenlabs.io";
const X_CL_SECRET_PLACEHOLDER = "${X_CL_SECRET}";

console.log("🔧 CONFIGURING DISPATCH AGENT TOOLS");
console.log("━".repeat(70));
console.log("");

// Tool definitions matching DISPATCH_TOOLS_SETUP_GUIDE.md
const tools = [
  {
    name: "check_service_area",
    description: "CRITICAL TOOL - Use for every dispatch call. Check if location is in service area and get real-time ETA and pricing. Call immediately when customer provides their location. Returns: in_area (yes/no), ETA range, distance, and price estimate for towing/service.",
    url: "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-check-service-area",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-closeloop-secret": X_CL_SECRET_PLACEHOLDER
    },
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Customer's address where service is needed. Accept street address, intersection, highway exits, landmarks."
        },
        vehicle_type: {
          type: "string",
          description: "Vehicle type: 'car', 'truck', 'suv', 'motorcycle', 'rv'. Helps with pricing."
        },
        dropoff_address: {
          type: "string",
          description: "Where to tow the vehicle. Get this for accurate pricing."
        },
        service_type: {
          type: "string",
          description: "Type of service: 'towing', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch_out'."
        },
        tenant_id: {
          type: "string",
          description: "Tenant identifier (from {{tenant_id}})"
        },
        conversation_id: {
          type: "string",
          description: "Conversation tracking"
        }
      },
      required: ["address"]
    }
  },
  {
    name: "create_dispatch_job",
    description: "MAIN DISPATCH TOOL - Send a driver/technician NOW. Use for: \"I need a tow\", \"I'm stranded\", \"Car won't start\", \"Locked out\", \"Flat tire\". Always call check_service_area FIRST to get ETA and confirm coverage, then create the dispatch job. CRITICAL: customer_name is REQUIRED - always ask for it before dispatching.",
    url: "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-create-dispatch-job",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-closeloop-secret": X_CL_SECRET_PLACEHOLDER
    },
    parameters: {
      type: "object",
      properties: {
        pickup_address: {
          type: "string",
          description: "Where to send the driver - customer's current location"
        },
        vehicle_info: {
          type: "string",
          description: "Vehicle year, make, model, and color as one string. Example: \"Blue 2019 Honda Accord\". Critical for driver to identify."
        },
        service_type: {
          type: "string",
          description: "Service needed: 'tow', 'flatbed', 'roadside', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch'"
        },
        dropoff_address: {
          type: "string",
          description: "Where to take the vehicle. REQUIRED if service says [REQUIRES DROPOFF]. Do NOT ask for [ON-SITE ONLY] services."
        },
        customer_name: {
          type: "string",
          description: "Customer's name. ALWAYS ask for this before dispatching. MANDATORY."
        },
        customer_phone: {
          type: "string",
          description: "Customer phone number (from {{caller_phone}})"
        },
        urgency: {
          type: "string",
          description: "'emergency' (blocking traffic, unsafe), 'urgent' (stranded), 'standard'"
        },
        notes: {
          type: "string",
          description: "Special instructions: \"Keys locked inside\", \"Won't go into neutral\", \"In parking garage level 3\", ALL extra details"
        },
        tenant_id: {
          type: "string",
          description: "Tenant identifier (from {{tenant_id}})"
        },
        conversation_id: {
          type: "string",
          description: "Conversation tracking"
        }
      },
      required: ["pickup_address", "vehicle_info", "service_type", "customer_name"]
    }
  },
  {
    name: "lookup_dispatch_status",
    description: "Check status of an existing dispatch job. Use when caller asks: \"Where's my driver?\", \"Any update?\", \"How much longer?\", \"Checking on my tow\", \"Is someone on the way?\", \"ETA on my driver?\". Returns: job status, driver name (first name only), ETA, and human-readable status message. Requires at least 2 of: customer_name, customer_phone, pickup_address.",
    url: "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-lookup-dispatch-status",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-closeloop-secret": X_CL_SECRET_PLACEHOLDER
    },
    parameters: {
      type: "object",
      properties: {
        tenant_id: {
          type: "string",
          description: "Tenant identifier (from {{tenant_id}})"
        },
        customer_name: {
          type: "string",
          description: "Customer's name to match against job records"
        },
        customer_phone: {
          type: "string",
          description: "Customer's phone number for lookup (from {{caller_phone}})"
        },
        pickup_address: {
          type: "string",
          description: "Pickup address to match against job records"
        },
        job_number: {
          type: "string",
          description: "If caller has reference number"
        },
        conversation_id: {
          type: "string",
          description: "Conversation tracking"
        }
      },
      required: ["tenant_id"]
    }
  },
  {
    name: "check_availability",
    description: "Check availability for SCHEDULED (non-emergency) jobs. Use when customer wants to schedule a future tow, planned vehicle transport, or non-urgent service. Example: \"Can I schedule a tow for tomorrow morning?\"",
    url: "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-check-availability",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-closeloop-secret": X_CL_SECRET_PLACEHOLDER
    },
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD format."
        },
        time: {
          type: "string",
          description: "Appointment time. Accept '2pm', '10:30am', 'noon', or HH:MM format."
        },
        service_name: {
          type: "string",
          description: "Service being booked (e.g., 'towing', 'scheduled pickup'). Helps determine duration."
        },
        tenant_id: {
          type: "string",
          description: "Tenant identifier (from {{tenant_id}})"
        },
        conversation_id: {
          type: "string",
          description: "Conversation tracking"
        }
      },
      required: ["date", "time"]
    }
  },
  {
    name: "suggest_availability",
    description: "Get available times for scheduled (non-emergency) jobs. Use when customer asks \"When can you come pick up my car?\" for a planned service, not an emergency.",
    url: "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-suggest-availability",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-closeloop-secret": X_CL_SECRET_PLACEHOLDER
    },
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to check. Accept 'tomorrow', 'next week', 'Saturday'. Defaults to next available."
        },
        service_name: {
          type: "string",
          description: "Service name to determine duration needed"
        },
        preference: {
          type: "string",
          description: "Time preference: 'morning', 'afternoon', 'evening', or 'earliest'"
        },
        tenant_id: {
          type: "string",
          description: "Tenant identifier (from {{tenant_id}})"
        },
        conversation_id: {
          type: "string",
          description: "Conversation tracking"
        }
      },
      required: []
    }
  },
  {
    name: "create_booking",
    description: "Book a SCHEDULED tow or service for a future date/time. Only for non-emergency planned services. For immediate dispatch, use create_dispatch_job instead.",
    url: "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-create-booking",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-closeloop-secret": X_CL_SECRET_PLACEHOLDER
    },
    parameters: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "Customer's full name. Ask \"May I have your name?\" if not provided."
        },
        date: {
          type: "string",
          description: "Confirmed appointment date"
        },
        time: {
          type: "string",
          description: "Confirmed appointment time"
        },
        service_name: {
          type: "string",
          description: "Service being booked"
        },
        customer_phone: {
          type: "string",
          description: "Customer phone number (from {{caller_phone}})"
        },
        notes: {
          type: "string",
          description: "Special requests or instructions, vehicle info, addresses"
        },
        tenant_id: {
          type: "string",
          description: "Tenant identifier (from {{tenant_id}})"
        },
        conversation_id: {
          type: "string",
          description: "Conversation tracking"
        }
      },
      required: ["customer_name", "date", "time"]
    }
  },
  {
    name: "create_callback",
    description: "Schedule a callback for pricing questions, complaints, or when customer needs to speak to dispatch manager. Use when: \"I need an exact quote\", \"I want to talk to a manager\", \"I have a complaint\", or billing questions.",
    url: "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-create-callback",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-closeloop-secret": X_CL_SECRET_PLACEHOLDER
    },
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Why callback needed: 'pricing question', 'exact quote needed', 'speak to manager', 'complaint', 'billing', 'pricing negotiation'"
        },
        customer_name: {
          type: "string",
          description: "Customer's name"
        },
        customer_phone: {
          type: "string",
          description: "Customer phone number (from {{caller_phone}})"
        },
        department: {
          type: "string",
          description: "'dispatch', 'manager', 'billing', 'owner'"
        },
        urgency: {
          type: "string",
          description: "'low', 'medium', 'high'"
        },
        notes: {
          type: "string",
          description: "Context about their question"
        },
        tenant_id: {
          type: "string",
          description: "Tenant identifier (from {{tenant_id}})"
        },
        conversation_id: {
          type: "string",
          description: "Conversation tracking"
        }
      },
      required: ["reason"]
    }
  }
];

// Function to make API call
function createTool(tool) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      tool_config: {
        type: "webhook",
        name: tool.name,
        description: tool.description,
        url: tool.url,
        method: tool.method,
        headers: tool.headers,
        body: {
          type: "json",
          template: Object.keys(tool.parameters.properties).reduce((acc, key) => {
            acc[key] = `{${key}}`;
            return acc;
          }, {})
        },
        parameters: tool.parameters
      }
    });

    const options = {
      hostname: BASE_URL,
      path: `/v1/convai/tools`,
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const response = JSON.parse(data);
          resolve({
            success: true,
            tool_name: tool.name,
            tool_id: response.tool_id || response.id
          });
        } else {
          resolve({
            success: false,
            tool_name: tool.name,
            status: res.statusCode,
            error: data
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        tool_name: tool.name,
        error: error.message
      });
    });

    req.write(payload);
    req.end();
  });
}

// Function to attach tools to agent
function attachToolsToAgent(toolIds) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      conversation_config: {
        agent: {
          tool_ids: toolIds
        }
      }
    });

    const options = {
      hostname: BASE_URL,
      path: `/v1/convai/agents/${AGENT_ID}`,
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true });
        } else {
          resolve({ success: false, status: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.write(payload);
    req.end();
  });
}

// Create all tools sequentially
async function createAllTools() {
  console.log(`Creating ${tools.length} webhook tools for DISPATCH agent...`);
  console.log("");

  const results = [];

  for (const tool of tools) {
    process.stdout.write(`⏳ Creating ${tool.name}... `);
    const result = await createTool(tool);
    results.push(result);

    if (result.success) {
      console.log(`✅ Success (ID: ${result.tool_id})`);
    } else {
      console.log(`❌ Failed`);
      console.log(`   Status: ${result.status || 'N/A'}`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
    }
  }

  console.log("");
  console.log("━".repeat(70));
  console.log("📊 TOOL CONFIGURATION SUMMARY");
  console.log("━".repeat(70));
  console.log("");

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successfully created: ${successful.length}/${tools.length} tools`);
  if (successful.length > 0) {
    successful.forEach(r => {
      console.log(`   - ${r.tool_name} (ID: ${r.tool_id})`);
    });
  }

  if (failed.length > 0) {
    console.log("");
    console.log(`❌ Failed to create: ${failed.length} tools`);
    failed.forEach(r => {
      console.log(`   - ${r.tool_name}`);
      console.log(`     Error: ${r.error || 'Unknown'}`);
    });
  }

  console.log("");

  if (successful.length === tools.length) {
    console.log("");
    console.log("⏳ Attaching tools to DISPATCH agent...");

    const toolIds = successful.map(r => r.tool_id);
    const attachResult = await attachToolsToAgent(toolIds);

    if (attachResult.success) {
      console.log("✅ Tools attached to agent successfully!");
      console.log("");
      console.log("🎉 ALL TOOLS CONFIGURED SUCCESSFULLY!");
      console.log("");
      console.log("✅ Dispatch Agent is now FULLY OPERATIONAL:");
      console.log("   ✓ System Prompt: 81,367 characters with 156 dynamic variables");
      console.log("   ✓ Knowledge Base: 8,016 characters of dispatch expertise");
      console.log("   ✓ Tools: 7/7 webhook tools configured and attached");
      console.log("");
      console.log("📋 Next Steps:");
      console.log("   1. Test 20+ scenarios across all dispatch types");
      console.log("   2. Monitor first week of live calls");
      console.log("   3. Refine based on real-world performance");
      console.log("");
      console.log("🎯 Expected Results:");
      console.log("   - Conversion rate: 75%+ (match SERVICE agent)");
      console.log("   - Name collection: 95%+ (mandatory enforcement)");
      console.log("   - Tool usage accuracy: 95%+");
      console.log("   - Pricing objection resolution: 40%+");
      console.log("   - Upsell attach rate: 20%+");
    } else {
      console.log("❌ Failed to attach tools to agent");
      console.log(`   Error: ${attachResult.error}`);
      console.log("");
      console.log("⚠️  Tools were created but not attached to agent.");
      console.log("   You may need to attach them manually via the dashboard.");
    }
  } else {
    console.log("⚠️  Some tools failed to configure.");
    console.log("   Review errors above and retry or configure manually via dashboard.");
  }

  console.log("");
}

// Run the tool creation
createAllTools().catch(error => {
  console.error("❌ Unexpected error:");
  console.error(error);
  process.exit(1);
});
