/**
 * ELEVENLABS AGENT & TOOL STANDARD TEMPLATE
 *
 * This is the canonical template for creating ALL ElevenLabs agents and tools.
 * Copy this template and fill in the business-specific details.
 *
 * CRITICAL RULES:
 * 1. EVERY tool MUST include tenant_id (REQUIRED) and conversation_id (optional)
 * 2. Tool parameters MUST match edge function interfaces exactly
 * 3. Dynamic variables MUST be configured before tools are created
 * 4. System prompt MUST instruct agent to pass {{tenant_id}} and {{conversation_id}}
 */

// ============================================================================
// STANDARD CONTEXT PARAMETERS (ADD TO EVERY TOOL)
// ============================================================================

const STANDARD_CONTEXT_PARAMETERS = {
  tenant_id: {
    type: 'string',
    description: 'The tenant_id from your system prompt context. Always include this.',
    required: true,  // CRITICAL - MUST be required
    enum: null
  },
  conversation_id: {
    type: 'string',
    description: 'Conversation tracking ID for linking tool calls to AI sessions',
    required: false,  // Optional but recommended
    enum: null
  }
};

/**
 * Helper function to add standard context parameters to any tool definition
 *
 * Usage:
 *   const toolWithContext = addStandardContext(myToolDefinition);
 */
function addStandardContext(toolDef) {
  return {
    ...toolDef,
    parameters: {
      ...toolDef.parameters,
      ...STANDARD_CONTEXT_PARAMETERS
    }
  };
}

// ============================================================================
// TOOL DEFINITION TEMPLATE
// ============================================================================

/**
 * Template for defining a new tool
 *
 * Steps:
 * 1. Copy this template
 * 2. Fill in name, description, edge function URL
 * 3. Define business-specific parameters
 * 4. Call addStandardContext() to add tenant_id/conversation_id
 * 5. Convert to API schema with convertToApiSchema()
 */
const TOOL_TEMPLATE = {
  name: 'your_tool_name',  // Snake_case, matches edge function
  description: 'CRITICAL: [When to use]. [What it does]. [What it returns].',
  parameters: {
    // Define your business-specific parameters here
    // Example:
    customer_name: {
      type: 'string',
      description: 'Customer\'s full name. Never use placeholders.',
      required: true,
      enum: null
    },
    service_type: {
      type: 'string',
      description: 'Type of service needed',
      required: true,
      enum: ['option1', 'option2', 'option3']  // Always define enums where applicable
    },
    // ... more business parameters ...

    // DON'T MANUALLY ADD tenant_id/conversation_id - use addStandardContext()
  }
};

// ============================================================================
// AGENT CONFIGURATION TEMPLATE
// ============================================================================

const AGENT_CONFIG_TEMPLATE = {
  // Basic Info
  name: 'YOUR_BUSINESS_MODE Agent',  // e.g., "DISPATCH Agent", "SERVICE Agent"
  business_mode: 'dispatch',  // dispatch|service|food|medical|general

  // Dynamic Variables (REQUIRED - configure BEFORE creating tools)
  dynamic_variables: {
    dynamic_variable_placeholders: {
      // CRITICAL - ALWAYS include these
      "tenant_id": "pending",  // Runtime value injected by system
      "conversation_id": "pending",
      "business_name": "Our Business",
      "business_mode": "dispatch",
      "timezone": "America/New_York",
      "caller_phone": "unknown",
      "tone": "professional and helpful",

      // Add mode-specific variables
      // See update_dispatch_dynamic_vars.cjs for full list
    }
  },

  // Tools (create with addStandardContext)
  tools: [
    // Example:
    // addStandardContext({
    //   name: 'create_dispatch_job',
    //   description: '...',
    //   parameters: { ... }
    // })
  ],

  // System Prompt Requirements
  system_prompt_must_include: [
    '{{tenant_id}} reference',
    '{{conversation_id}} reference',
    'Instructions to pass these to ALL tools',
    'Error recovery protocol',
    'Tool response validation (check success: true/false)'
  ]
};

// ============================================================================
// DEPLOYMENT CHECKLIST TEMPLATE
// ============================================================================

const DEPLOYMENT_CHECKLIST = {
  'Pre-Creation': [
    '[ ] Read edge function interface to understand required parameters',
    '[ ] Define business-specific parameters',
    '[ ] Use STANDARD_CONTEXT_PARAMETERS for tenant_id/conversation_id',
    '[ ] Define enum values for all categorical parameters'
  ],

  'Dynamic Variables': [
    '[ ] Configure ALL dynamic variables BEFORE creating tools',
    '[ ] Include all REQUIRED_DYNAMIC_VARS',
    '[ ] Add mode-specific variables',
    '[ ] Set reasonable default values (not null/undefined)'
  ],

  'Tool Creation': [
    '[ ] Create tools with addStandardContext()',
    '[ ] Verify tenant_id is REQUIRED in schema',
    '[ ] Verify conversation_id is optional in schema',
    '[ ] Match parameter names EXACTLY to edge function expectations',
    '[ ] Set correct enum values',
    '[ ] Attach tools to agent (delete old tools field first)'
  ],

  'System Prompt': [
    '[ ] Instruct agent to pass {{tenant_id}} to ALL tools',
    '[ ] Instruct agent to pass {{conversation_id}} to ALL tools',
    '[ ] Include error recovery protocol',
    '[ ] Include tool response validation (check success field)',
    '[ ] Upload to ElevenLabs UI and verify no validation errors'
  ],

  'Verification': [
    '[ ] Run audit_all_elevenlabs_agents.cjs',
    '[ ] 0 critical issues',
    '[ ] All tools have tenant_id (required)',
    '[ ] All tools have conversation_id (optional)',
    '[ ] Test tool calls in ElevenLabs playground',
    '[ ] Verify edge functions receive tenant_id in payload'
  ],

  'Testing': [
    '[ ] Test complete flow (tool call → edge function → success)',
    '[ ] Test error recovery (tool failure → agent asks clarification)',
    '[ ] Test tenant_id isolation (correct tenant data returned)',
    '[ ] Test conversation_id tracking (tool results linked to session)'
  ]
};

// ============================================================================
// CONVERT TO ELEVENLABS API SCHEMA
// ============================================================================

const SECRET_ID = '9G30VIglbkIoULRKR7xD';  // Your ElevenLabs secret for X-CL-Secret header

function convertToApiSchema(toolDef) {
  const properties = {};
  const required = [];

  Object.entries(toolDef.parameters).forEach(([paramName, paramDef]) => {
    properties[paramName] = {
      type: paramDef.type,
      description: paramDef.description,
      enum: paramDef.enum || null,
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

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

// Example: Create a "create_dispatch_job" tool with standard context

const createDispatchJobTool = {
  name: 'create_dispatch_job',
  description: 'Create a new dispatch/service request. CRITICAL: You MUST collect customer_name AND service_type before calling this tool.',
  parameters: {
    customer_name: {
      type: 'string',
      description: 'MANDATORY. Customer\'s full name. Never use placeholders.',
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
    }
    // ... more parameters ...
  }
};

// Add standard context (tenant_id + conversation_id)
const createDispatchJobToolWithContext = addStandardContext(createDispatchJobTool);

// Convert to ElevenLabs API schema
const apiPayload = convertToApiSchema(createDispatchJobToolWithContext);

// Now create the tool via API:
// fetch(`${BASE_URL}/v1/convai/tools`, {
//   method: 'POST',
//   headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
//   body: JSON.stringify({ tool_config: apiPayload })
// });

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STANDARD_CONTEXT_PARAMETERS,
    addStandardContext,
    convertToApiSchema,
    TOOL_TEMPLATE,
    AGENT_CONFIG_TEMPLATE,
    DEPLOYMENT_CHECKLIST
  };
}
