const fs = require('fs');

const API_KEY = '0e909b301e15ce45e3b5a5af74a8f4813dc545b584c3a6b71eb80e9cb065ec4b';
const BASE_URL = 'https://api.elevenlabs.io';
const DISPATCH_AGENT_ID = 'agent_2601kghfpmckez3t2n6p7bmcpac4';
const SECRET_ID = '9G30VIglbkIoULRKR7xD'; // From SERVICE agent config

console.log('=== CONFIGURE DISPATCH AGENT TOOLS ===\n');

// Tool definitions with correct API schema structure
const DISPATCH_TOOLS = [
  {
    name: 'check_service_area',
    description: 'CRITICAL: Use FIRST on every call before ANY other action. Checks coverage area, calculates ETA, and provides pricing estimate for the customer\'s location. Required to determine if we can serve the area.',
    parameters: {
      address: {
        type: 'string',
        description: 'Customer\'s address where service is needed. Be specific with street number, street name, city, and zip code.',
        required: true,
        enum: null
      },
      customer_phone: {
        type: 'string',
        description: 'Customer\'s phone number in E.164 format (e.g., +15551234567)',
        required: true,
        enum: null
      },
      service_type: {
        type: 'string',
        description: 'Type of service needed (helps calculate accurate pricing)',
        required: false,
        enum: ['towing', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch_out', 'flatbed_tow', 'roadside', 'other']
      },
      vehicle_type: {
        type: 'string',
        description: 'Vehicle type for pricing calculation',
        required: false,
        enum: ['sedan', 'suv', 'truck', 'motorcycle', 'box_truck', 'flatbed', 'semi', 'rv', 'other']
      },
      dropoff_address: {
        type: 'string',
        description: 'Destination address (if applicable) for total distance calculation',
        required: false,
        enum: null
      }
    }
  },
  {
    name: 'create_dispatch_job',
    description: 'Create a new dispatch/service request. CRITICAL: You MUST collect customer_name AND service_type before calling this tool.',
    parameters: {
      customer_name: {
        type: 'string',
        description: 'MANDATORY. Customer\'s full name. Never use placeholders.',
        required: true,
        enum: null
      },
      customer_phone: {
        type: 'string',
        description: 'Customer\'s phone number in E.164 format',
        required: true,
        enum: null
      },
      pickup_address: {
        type: 'string',
        description: 'Complete pickup address with street, city, zip',
        required: true,
        enum: null
      },
      service_type: {
        type: 'string',
        description: 'Type of service needed',
        required: true,
        enum: ['towing', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch_out', 'flatbed_tow', 'roadside', 'other']
      },
      dropoff_address: {
        type: 'string',
        description: 'Destination address (if applicable). Use "none" for on-site service.',
        required: false,
        enum: null
      },
      vehicle_info: {
        type: 'string',
        description: 'Vehicle details as "year make model color" (e.g., "2019 blue Honda Accord"). Minimum: "color type" (e.g., "blue Honda")',
        required: false,
        enum: null
      },
      drivable: {
        type: 'string',
        description: 'Can vehicle be driven?',
        required: false,
        enum: ['yes', 'no', 'unknown']
      },
      urgency: {
        type: 'string',
        description: 'Urgency level',
        required: false,
        enum: ['emergency', 'urgent', 'standard', 'scheduled', 'flexible']
      },
      notes: {
        type: 'string',
        description: 'ANY special instructions, gate codes, vehicle color, keys location, etc.',
        required: false,
        enum: null
      }
    }
  },
  {
    name: 'lookup_dispatch_status',
    description: 'Check status of an existing dispatch job. Use when customer asks "where\'s my driver?" or for status updates.',
    parameters: {
      customer_phone: {
        type: 'string',
        description: 'Customer\'s phone number to look up their active job',
        required: true
      },
      job_number: {
        type: 'string',
        description: 'Job number if customer has it (optional)',
        required: false
      }
    }
  },
  {
    name: 'check_availability',
    description: 'Check if a specific date/time slot is available for scheduled service.',
    parameters: {
      date: {
        type: 'string',
        description: 'Date in YYYY-MM-DD format',
        required: true
      },
      time: {
        type: 'string',
        description: 'Time in HH:MM format (24-hour)',
        required: true
      },
      service_id: {
        type: 'string',
        description: 'Service ID (optional)',
        required: false
      }
    }
  },
  {
    name: 'suggest_availability',
    description: 'Get available time slots for a given date range.',
    parameters: {
      start_date: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format',
        required: true
      },
      end_date: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format (optional)',
        required: false
      },
      preferred_times: {
        type: 'string',
        description: 'Preferred time of day: morning, afternoon, evening',
        required: false
      }
    }
  },
  {
    name: 'create_booking',
    description: 'Book a future appointment for scheduled service (non-emergency).',
    parameters: {
      customer_name: {
        type: 'string',
        description: 'Customer\'s full name',
        required: true
      },
      customer_phone: {
        type: 'string',
        description: 'Customer\'s phone number',
        required: true
      },
      service_id: {
        type: 'string',
        description: 'Service ID',
        required: false
      },
      date: {
        type: 'string',
        description: 'Booking date (YYYY-MM-DD)',
        required: true
      },
      time: {
        type: 'string',
        description: 'Booking time (HH:MM)',
        required: true
      },
      notes: {
        type: 'string',
        description: 'Special notes or instructions',
        required: false
      }
    }
  },
  {
    name: 'create_callback',
    description: 'Create a callback request when you need manager assistance, complex pricing, or customer requests to speak with owner.',
    parameters: {
      customer_phone: {
        type: 'string',
        description: 'Customer\'s phone number',
        required: true
      },
      customer_name: {
        type: 'string',
        description: 'Customer\'s name',
        required: false
      },
      reason: {
        type: 'string',
        description: 'Reason for callback: pricing_question, complaint, complex_request, owner_requested, or other',
        required: true
      },
      notes: {
        type: 'string',
        description: 'Details about why callback is needed',
        required: false
      },
      best_time: {
        type: 'string',
        description: 'Customer\'s preferred callback time',
        required: false
      }
    }
  }
];

// Convert tool definitions to ElevenLabs API schema format
function convertToApiSchema(toolDef) {
  const properties = {};
  const required = [];

  Object.entries(toolDef.parameters).forEach(([paramName, paramDef]) => {
    properties[paramName] = {
      type: paramDef.type,
      description: paramDef.description,
      enum: paramDef.enum || null,  // Use enum from definition if present
      is_system_provided: false,
      dynamic_variable: '',
      constant_value: ''
    };

    if (paramDef.required) {
      required.push(paramName);
    }
  });

  return {
    type: 'webhook',
    name: toolDef.name,
    description: toolDef.description,
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: 'auto',
    tool_error_handling_mode: 'auto',
    dynamic_variables: {
      dynamic_variable_placeholders: {}
    },
    execution_mode: 'immediate',
    api_schema: {
      request_headers: {
        'content-type': 'application/json',
        'X-CL-Secret': {
          secret_id: SECRET_ID
        }
      },
      url: `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/elevenlabs-${toolDef.name.replace(/_/g, '-')}`,
      method: 'POST',
      path_params_schema: {},
      query_params_schema: null,
      request_body_schema: {
        type: 'object',
        required: required,
        description: '',
        properties: properties
      },
      content_type: 'application/json',
      auth_connection: null
    }
  };
}

async function main() {
  const createdTools = [];
  const results = {
    created: [],
    failed: [],
    startTime: new Date().toISOString()
  };

  // Step 1: Create all 7 tools
  console.log('Step 1: Creating tools in workspace...\n');

  for (let i = 0; i < DISPATCH_TOOLS.length; i++) {
    const toolDef = DISPATCH_TOOLS[i];
    console.log(`[${i + 1}/${DISPATCH_TOOLS.length}] Creating ${toolDef.name}...`);

    const apiPayload = convertToApiSchema(toolDef);

    try {
      const response = await fetch(`${BASE_URL}/v1/convai/tools`, {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tool_config: apiPayload })
      });

      if (response.ok) {
        const tool = await response.json();
        console.log(`   ✓ Created: ${tool.id}`);
        createdTools.push(tool.id);
        results.created.push({ name: toolDef.name, id: tool.id });
      } else {
        const error = await response.text();
        console.log(`   ✗ Failed: ${response.status} - ${error}`);
        results.failed.push({ name: toolDef.name, error: `${response.status}: ${error}` });
      }
    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
      results.failed.push({ name: toolDef.name, error: error.message });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\nCreated ${createdTools.length}/${DISPATCH_TOOLS.length} tools\n`);

  if (createdTools.length === 0) {
    throw new Error('No tools were created successfully. Cannot proceed with agent configuration.');
  }

  // Step 2: Get current agent configuration
  console.log('Step 2: Getting current agent configuration...');
  const getAgentResponse = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  if (!getAgentResponse.ok) {
    throw new Error(`Failed to get agent: ${getAgentResponse.status}`);
  }

  const currentAgent = await getAgentResponse.json();
  console.log('   ✓ Retrieved current configuration\n');

  // Step 3: Update agent with tool_ids
  console.log('Step 3: Attaching tools to DISPATCH agent...');

  // Build update payload - explicitly remove 'tools' to avoid conflict
  const promptWithoutTools = { ...currentAgent.conversation_config.agent.prompt };
  delete promptWithoutTools.tools;  // Remove old tools array

  const updatePayload = {
    conversation_config: {
      ...currentAgent.conversation_config,
      agent: {
        ...currentAgent.conversation_config.agent,
        prompt: {
          ...promptWithoutTools,
          tool_ids: createdTools  // Use new tool IDs only
        }
      }
    }
  };

  const updateResponse = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatePayload)
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to update agent: ${updateResponse.status} - ${error}`);
  }

  console.log('   ✓ Agent updated with tool_ids\n');

  // Step 4: Verify
  console.log('Step 4: Verifying tools are attached...');
  const verifyResponse = await fetch(`${BASE_URL}/v1/convai/agents/${DISPATCH_AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  const verifiedAgent = await verifyResponse.json();
  const attachedToolIds = verifiedAgent.conversation_config.agent.prompt?.tool_ids || [];

  console.log(`   Attached tools: ${attachedToolIds.length}`);

  if (attachedToolIds.length === createdTools.length) {
    console.log('   ✓ VERIFIED: All tools successfully attached\n');
    results.verified = true;
  } else {
    console.log('   ⚠️  WARNING: Tool count mismatch');
    console.log(`   Expected: ${createdTools.length}, Actual: ${attachedToolIds.length}\n`);
    results.verified = false;
  }

  // Save results
  results.endTime = new Date().toISOString();
  results.toolIds = createdTools;
  fs.writeFileSync('dispatch_tools_config_results.json', JSON.stringify(results, null, 2));
  console.log('✓ Results saved to dispatch_tools_config_results.json');

  console.log('\n=== TOOL CONFIGURATION COMPLETE ===');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Check ElevenLabs dashboard → DISPATCH agent → Tools tab');
  console.log('2. Verify 7 tools are listed');
  console.log('3. Check each tool has correct URL and parameters');
  console.log(`\nCreated tool IDs: ${createdTools.join(', ')}`);
}

main().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
