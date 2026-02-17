/**
 * CONFIGURE DISPATCH TOOLS (CORRECT API STRUCTURE)
 *
 * Problem: Previous attempts used wrong structure (missing api_schema)
 * Solution: Use exact structure from SERVICE agent tools
 *
 * Creates all 7 dispatch tools with proper ElevenLabs webhook format
 *
 * Run: node configure_dispatch_tools_correct.cjs
 */

const https = require('https');

const ELEVENLABS_API_KEY = "0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b";
const AGENT_ID = "agent_2601kghfpmckez3t2n6p7bmcpac4";
const SECRET_ID = "9G30VIglbkIoULRKR7xD"; // From SERVICE agent config
const BASE_URL = "https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1";

// Helper to make HTTPS requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: path,
      method: method,
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Define all 7 dispatch tools with CORRECT API structure
const dispatchTools = [
  {
    type: "webhook",
    name: "check_service_area",
    description: "CRITICAL TOOL - Use for every dispatch call. Check if location is in service area and get real-time ETA and pricing. Call immediately when customer provides their location.",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: { dynamic_variable_placeholders: {} },
    execution_mode: "immediate",
    api_schema: {
      request_headers: {
        "content-type": "application/json",
        "X-CL-Secret": { secret_id: SECRET_ID }
      },
      url: `${BASE_URL}/elevenlabs-check-service-area`,
      method: "POST",
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: ["address"],
        description: "",
        properties: {
          address: {
            type: "string",
            description: "Customer's address where service is needed. Accept street address, intersection, highway exits, landmarks.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          vehicle_type: {
            type: "string",
            description: "Vehicle type: 'car', 'truck', 'suv', 'motorcycle', 'rv'. Helps with pricing.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          dropoff_address: {
            type: "string",
            description: "Where to tow the vehicle. Get this for accurate pricing.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          service_type: {
            type: "string",
            description: "Type of service: 'towing', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch_out'.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          tenant_id: {
            type: "string",
            description: "The tenant_id from your system prompt context. Always include this.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID if available",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          }
        }
      },
      content_type: "application/json",
      auth_connection: null
    }
  },
  {
    type: "webhook",
    name: "create_dispatch_job",
    description: "MAIN DISPATCH TOOL - Send a driver/technician NOW. CRITICAL: customer_name is REQUIRED - always ask for it before dispatching.",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: { dynamic_variable_placeholders: {} },
    execution_mode: "immediate",
    api_schema: {
      request_headers: {
        "content-type": "application/json",
        "X-CL-Secret": { secret_id: SECRET_ID }
      },
      url: `${BASE_URL}/elevenlabs-create-dispatch-job`,
      method: "POST",
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: ["pickup_address", "vehicle_info", "service_type", "customer_name"],
        description: "",
        properties: {
          pickup_address: {
            type: "string",
            description: "Where to send the driver - customer's current location",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          vehicle_info: {
            type: "string",
            description: "Vehicle year, make, model, and color as one string. Example: 'Blue 2019 Honda Accord'.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          service_type: {
            type: "string",
            description: "Service needed: 'tow', 'flatbed', 'roadside', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch'",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          dropoff_address: {
            type: "string",
            description: "Where to take the vehicle/item. REQUIRED for towing services.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          customer_name: {
            type: "string",
            description: "Customer's name. ALWAYS ask for this before dispatching. This is MANDATORY.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          customer_phone: {
            type: "string",
            description: "The caller's phone number from caller_phone in your system prompt context.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          urgency: {
            type: "string",
            description: "'emergency' (blocking traffic, unsafe), 'urgent' (stranded), 'standard'",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          notes: {
            type: "string",
            description: "Special instructions: vehicle details, access notes, ALL extra details",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          tenant_id: {
            type: "string",
            description: "The tenant_id from your system prompt context. Always include this.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID if available",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          }
        }
      },
      content_type: "application/json",
      auth_connection: null
    }
  },
  {
    type: "webhook",
    name: "lookup_dispatch_status",
    description: "Check status of an existing dispatch job. Use when caller asks: 'Where's my driver?', 'Any update?', 'How much longer?'",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: { dynamic_variable_placeholders: {} },
    execution_mode: "immediate",
    api_schema: {
      request_headers: {
        "content-type": "application/json",
        "X-CL-Secret": { secret_id: SECRET_ID }
      },
      url: `${BASE_URL}/elevenlabs-lookup-dispatch-status`,
      method: "POST",
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: ["tenant_id"],
        description: "",
        properties: {
          tenant_id: {
            type: "string",
            description: "The tenant_id from your system prompt context. Always include this.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          customer_name: {
            type: "string",
            description: "Customer's name to match against job records",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          customer_phone: {
            type: "string",
            description: "The caller's phone number from caller_phone in your system prompt context.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          pickup_address: {
            type: "string",
            description: "Pickup address to match against job records",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          job_number: {
            type: "string",
            description: "If caller has reference number",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID if available",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          }
        }
      },
      content_type: "application/json",
      auth_connection: null
    }
  },
  {
    type: "webhook",
    name: "check_availability",
    description: "Check availability for SCHEDULED (non-emergency) jobs. Use when customer wants to schedule a future tow or planned service.",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: { dynamic_variable_placeholders: {} },
    execution_mode: "immediate",
    api_schema: {
      request_headers: {
        "content-type": "application/json",
        "X-CL-Secret": { secret_id: SECRET_ID }
      },
      url: `${BASE_URL}/elevenlabs-check-availability`,
      method: "POST",
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: ["date", "time"],
        description: "",
        properties: {
          date: {
            type: "string",
            description: "Appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD format.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          time: {
            type: "string",
            description: "Appointment time. Accept '2pm', '10:30am', 'noon', or HH:MM format.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          service_name: {
            type: "string",
            description: "Service being booked (e.g., 'towing', 'scheduled pickup').",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          tenant_id: {
            type: "string",
            description: "The tenant_id from your system prompt context. Always include this.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID if available",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          }
        }
      },
      content_type: "application/json",
      auth_connection: null
    }
  },
  {
    type: "webhook",
    name: "suggest_availability",
    description: "Get available times for scheduled (non-emergency) jobs. Use when customer asks 'When can you come pick up my car?'",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: { dynamic_variable_placeholders: {} },
    execution_mode: "immediate",
    api_schema: {
      request_headers: {
        "content-type": "application/json",
        "X-CL-Secret": { secret_id: SECRET_ID }
      },
      url: `${BASE_URL}/elevenlabs-suggest-availability`,
      method: "POST",
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: [],
        description: "",
        properties: {
          date: {
            type: "string",
            description: "Date to check. Accept 'tomorrow', 'next week', 'Saturday'. Defaults to next available.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          service_name: {
            type: "string",
            description: "Service name to determine duration needed",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          preference: {
            type: "string",
            description: "Time preference: 'morning', 'afternoon', 'evening', or 'earliest'",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          tenant_id: {
            type: "string",
            description: "The tenant_id from your system prompt context. Always include this.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID if available",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          }
        }
      },
      content_type: "application/json",
      auth_connection: null
    }
  },
  {
    type: "webhook",
    name: "create_booking",
    description: "Book a SCHEDULED tow or service for a future date/time. Only for non-emergency planned services.",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: { dynamic_variable_placeholders: {} },
    execution_mode: "immediate",
    api_schema: {
      request_headers: {
        "content-type": "application/json",
        "X-CL-Secret": { secret_id: SECRET_ID }
      },
      url: `${BASE_URL}/elevenlabs-create-booking`,
      method: "POST",
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: ["customer_name", "date", "time"],
        description: "",
        properties: {
          customer_name: {
            type: "string",
            description: "Customer's full name. Ask if not provided.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          date: {
            type: "string",
            description: "Confirmed appointment date",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          time: {
            type: "string",
            description: "Confirmed appointment time",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          service_name: {
            type: "string",
            description: "Service being booked",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          customer_phone: {
            type: "string",
            description: "The caller's phone number from caller_phone in your system prompt context.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          notes: {
            type: "string",
            description: "Special requests, address, vehicle info, and ALL answers to required questions.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          tenant_id: {
            type: "string",
            description: "The tenant_id from your system prompt context. Always include this.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID if available",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          }
        }
      },
      content_type: "application/json",
      auth_connection: null
    }
  },
  {
    type: "webhook",
    name: "create_callback",
    description: "Create a callback request. Use when: complex quote needed, manager requested, unclear pricing, or any human follow-up.",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    dynamic_variables: { dynamic_variable_placeholders: {} },
    execution_mode: "immediate",
    api_schema: {
      request_headers: {
        "content-type": "application/json",
        "X-CL-Secret": { secret_id: SECRET_ID }
      },
      url: `${BASE_URL}/elevenlabs-create-callback`,
      method: "POST",
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: "object",
        required: ["customer_name"],
        description: "",
        properties: {
          customer_name: {
            type: "string",
            description: "Customer's name",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          customer_phone: {
            type: "string",
            description: "The caller's phone number from caller_phone in your system prompt context.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          reason: {
            type: "string",
            description: "Why callback is needed",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          preferred_time: {
            type: "string",
            description: "When customer wants callback",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          tenant_id: {
            type: "string",
            description: "The tenant_id from your system prompt context. Always include this.",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          },
          conversation_id: {
            type: "string",
            description: "Conversation tracking ID if available",
            enum: null,
            is_system_provided: false,
            dynamic_variable: "",
            constant_value: ""
          }
        }
      },
      content_type: "application/json",
      auth_connection: null
    }
  }
];

async function main() {
  console.log("🔧 DISPATCH Agent Tools Configuration\n");
  console.log(`Creating ${dispatchTools.length} tools with correct API structure...\n`);

  const createdToolIds = [];

  // Create each tool
  for (let i = 0; i < dispatchTools.length; i++) {
    const tool = dispatchTools[i];
    console.log(`[${i + 1}/${dispatchTools.length}] Creating: ${tool.name}...`);

    try {
      // Wrap tool in tool_config as required by API
      const response = await makeRequest('POST', '/v1/convai/tools', {
        tool_config: tool
      });

      // Debug: log the full response to see structure
      if (i === 0) {
        console.log("   DEBUG - Full response:", JSON.stringify(response.data, null, 2));
      }

      // Try different possible locations for tool ID
      const toolId = response.data.tool_id || response.data.id || (response.data.tool_config && response.data.tool_config.tool_id);

      if (!toolId) {
        console.error("   ⚠ WARNING: No tool ID found in response");
        console.error("   Response keys:", Object.keys(response.data || {}));
      }

      createdToolIds.push(toolId);
      console.log(`   ✓ Created with ID: ${toolId}\n`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      throw error;
    }
  }

  // Attach all tools to the agent
  console.log("Step 2: Attaching all tools to DISPATCH agent...");
  await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, {
    conversation_config: {
      agent: {
        tool_ids: createdToolIds
      }
    }
  });
  console.log("   ✓ All tools attached to agent\n");

  // Success summary
  console.log("✅ TOOLS CONFIGURATION COMPLETE!\n");
  console.log(`Created and attached ${createdToolIds.length} tools:`);
  dispatchTools.forEach((tool, i) => {
    console.log(`   ${i + 1}. ${tool.name} → ${createdToolIds[i]}`);
  });

  console.log("\nVerification steps:");
  console.log("1. Go to: https://elevenlabs.io/app/conversational-ai");
  console.log("2. Select DISPATCH agent");
  console.log("3. Click 'Tools' tab");
  console.log("4. Verify:");
  console.log(`   - Shows ${createdToolIds.length}/7 tools configured`);
  console.log("   - Each tool has correct webhook URL");
  console.log("   - X-CL-Secret header is configured");
  console.log("   - All parameters are properly defined");
}

main().catch(error => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
