/**
 * ELEVENLABS AGENT TOOLS CONFIGURATION
 *
 * Defines the tool configurations for each agent type (Service, Dispatch, Food, Medical, General).
 * These configurations are used to programmatically register tools with ElevenLabs agents.
 *
 * Each agent type has a specific set of tools based on its industry needs:
 * - Service (6 tools): Salons, HVAC, plumbers, contractors
 * - Dispatch (6 tools): Towing, roadside, couriers, locksmiths
 * - Food (6 tools): Restaurants, pizza, catering, bakeries
 * - Medical (5 tools): Doctors, dentists, clinics, veterinary
 * - General (3 tools): Any business, lead capture, basic info
 */

import type { BusinessMode } from "./agentResolver.ts";
import { getToolsForCapabilities } from "./toolCapabilityMap.ts";

// Re-export for consumers
export type { BusinessMode };

// ============= TYPE DEFINITIONS =============

export interface ToolParameter {
  /** Parameter name */
  name: string;
  /** Parameter type for ElevenLabs */
  type: "string" | "number" | "boolean";
  /** Whether this parameter is required */
  required: boolean;
  /** Description shown to the AI for when/how to use this parameter */
  description: string;
  /** Dynamic variable substitution (e.g., "{{tenant_id}}") */
  dynamicValue?: string;
}

export interface AgentTool {
  /** Tool name - must be unique within an agent */
  name: string;
  /** Description shown to the AI - explains when and why to call this tool */
  description: string;
  /** The endpoint URL for this tool */
  url: string;
  /** HTTP method (always POST for ElevenLabs tools) */
  method: "POST";
  /** Tool parameters */
  parameters: ToolParameter[];
}

export interface AgentToolsConfig {
  /** The business mode this configuration applies to */
  mode: BusinessMode;
  /** Human-readable name for this agent type */
  agentName: string;
  /** Industries this agent serves */
  industries: string[];
  /** Number of tools available */
  toolCount: number;
  /** The tools available to this agent */
  tools: AgentTool[];
}

// ============= BASE URL =============

const BASE_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

// ============= SHARED TOOL DEFINITIONS =============

/**
 * check_availability - Check if a specific appointment time is available
 * Used by: Service, Dispatch, Food, Medical
 */
function createCheckAvailabilityTool(modeSpecificDescription?: string): AgentTool {
  return {
    name: "check_availability",
    description: modeSpecificDescription ||
      `Check if a specific appointment time is available. Call this BEFORE confirming any appointment. Use when customer says "Do you have 2pm tomorrow?" or requests a specific time slot.`,
    url: `${BASE_URL}/elevenlabs-check-availability`,
    method: "POST",
    parameters: [
      {
        name: "date",
        type: "string",
        required: true,
        description: "Appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD format.",
      },
      {
        name: "time",
        type: "string",
        required: true,
        description: "Appointment time. Accept '2pm', '10:30am', 'noon', or HH:MM format.",
      },
      {
        name: "service_name",
        type: "string",
        required: false,
        description: "Service being booked (e.g., 'haircut', 'AC repair', 'full detail'). Helps determine duration.",
      },
      {
        name: "tenant_id",
        type: "string",
        required: false,
        description: "Tenant identifier",
        dynamicValue: "{{tenant_id}}",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "Conversation tracking",
      },
    ],
  };
}

/**
 * suggest_availability - Get available appointment times
 * Used by: All agent types
 */
function createSuggestAvailabilityTool(modeSpecificDescription?: string): AgentTool {
  return {
    name: "suggest_availability",
    description: modeSpecificDescription ||
      `Get available appointment times. Call when customer asks "What times do you have?", "When can I come in?", or "What's available this week?". Returns up to 5 open slots.`,
    url: `${BASE_URL}/elevenlabs-suggest-availability`,
    method: "POST",
    parameters: [
      {
        name: "date",
        type: "string",
        required: false,
        description: "Date to check. Accept 'tomorrow', 'next week', 'Saturday'. Defaults to next available.",
      },
      {
        name: "service_name",
        type: "string",
        required: false,
        description: "Service name to determine duration needed",
      },
      {
        name: "preference",
        type: "string",
        required: false,
        description: "Time preference: 'morning', 'afternoon', 'evening', or 'earliest'",
      },
      {
        name: "tenant_id",
        type: "string",
        required: false,
        description: "Tenant identifier",
        dynamicValue: "{{tenant_id}}",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "Conversation tracking",
      },
    ],
  };
}

/**
 * create_booking - Book an appointment
 * Used by: Service, Dispatch, Food, Medical
 */
function createBookingTool(modeSpecificDescription?: string): AgentTool {
  return {
    name: "create_booking",
    description: modeSpecificDescription ||
      `Book the appointment after customer confirms. Only call AFTER checking availability AND getting customer's explicit "yes" to book. Collect customer name if not already known.`,
    url: `${BASE_URL}/elevenlabs-create-booking`,
    method: "POST",
    parameters: [
      {
        name: "customer_name",
        type: "string",
        required: true,
        description: "Customer's full name. Ask \"May I have your name?\" if not provided.",
      },
      {
        name: "date",
        type: "string",
        required: true,
        description: "Confirmed appointment date",
      },
      {
        name: "time",
        type: "string",
        required: true,
        description: "Confirmed appointment time",
      },
      {
        name: "service_name",
        type: "string",
        required: false,
        description: "Service being booked",
      },
      {
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Customer phone number",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "notes",
        type: "string",
        required: false,
        description: "Special requests or instructions",
      },
      {
        name: "tenant_id",
        type: "string",
        required: false,
        description: "Tenant identifier",
        dynamicValue: "{{tenant_id}}",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "Conversation tracking",
      },
    ],
  };
}

/**
 * check_service_area - Check if we service a location
 * Used by: All agent types
 */
function createCheckServiceAreaTool(modeSpecificDescription?: string, includeVehicleType = false, includeDropoff = false): AgentTool {
  const params: ToolParameter[] = [
    {
      name: "address",
      type: "string",
      required: true,
      description: includeDropoff
        ? "Pickup location - where the vehicle/customer is. Accept street address, intersection, highway exits, landmarks."
        : "Customer's address where service is needed",
    },
  ];

  if (includeDropoff) {
    params.push({
      name: "dropoff_address",
      type: "string",
      required: false,
      description: "Where to tow the vehicle. Get this for accurate pricing.",
    });
  }

  if (includeVehicleType) {
    params.push({
      name: "vehicle_type",
      type: "string",
      required: false,
      description: "Vehicle type: 'car', 'truck', 'suv', 'motorcycle', 'rv', 'commercial'. Helps with pricing but NOT required to check service area. Only ask if naturally provided.",
    });
  }

  params.push(
    {
      name: "tenant_id",
      type: "string",
      required: false,
      description: "Tenant identifier",
      dynamicValue: "{{tenant_id}}",
    },
    {
      name: "conversation_id",
      type: "string",
      required: false,
      description: "Conversation tracking",
    }
  );

  return {
    name: "check_service_area",
    description: modeSpecificDescription ||
      `Check if we can come to the customer's location. Use for mobile services. Call when customer asks "Can you come to my house?" or gives their address. Returns ETA and whether location is in service area.`,
    url: `${BASE_URL}/elevenlabs-check-service-area`,
    method: "POST",
    parameters: params,
  };
}

/**
 * create_dispatch_job - Send someone immediately
 * Used by: Service, Dispatch, Food
 */
function createDispatchJobTool(modeSpecificDescription?: string, isDispatchMode = false): AgentTool {
  const params: ToolParameter[] = [
    {
      name: "pickup_address",
      type: "string",
      required: true,
      description: isDispatchMode
        ? "Where to send the driver - customer's current location"
        : "Customer's address where technician should go",
    },
    {
      name: "service_type",
      type: "string",
      required: true,
      description: isDispatchMode
        ? "Service needed: 'tow', 'flatbed', 'roadside', 'jumpstart', 'lockout', 'tire_change', 'fuel_delivery', 'winch'"
        : "Type of emergency: 'emergency_repair', 'ac_repair', 'plumbing', 'electrical', 'lockout'",
    },
  ];

  if (isDispatchMode) {
    params.push({
      name: "vehicle_info",
      type: "string",
      required: true,
      description: "Vehicle year, make, model, and color. Example: \"Blue 2019 Honda Accord\". Critical for driver to identify.",
    });
    params.push({
      name: "dropoff_address",
      type: "string",
      required: false,
      description: "Where to take the vehicle/item. REQUIRED if the service says [REQUIRES DROPOFF] (towing, flatbed, transport). Do NOT ask for this on [ON-SITE ONLY] services (jumpstart, lockout, tire change, fuel delivery).",
    });
  }

  params.push(
    {
      name: "customer_name",
      type: "string",
      required: true,
      description: "Customer's first name. ALWAYS ask for this before dispatching.",
    },
    {
      name: "customer_phone",
      type: "string",
      required: false,
      description: "Customer phone number (auto-filled from caller ID)",
      dynamicValue: "{{caller_phone}}",
    },
    {
      name: "urgency",
      type: "string",
      required: false,
      description: isDispatchMode
        ? "'emergency' (blocking traffic, unsafe), 'urgent' (stranded), 'standard'"
        : "'emergency', 'urgent', or 'standard'",
    },
    {
      name: "notes",
      type: "string",
      required: false,
      description: isDispatchMode
        ? "Special instructions: \"Keys locked inside\", \"Won't go into neutral\", \"In parking garage level 3\""
        : "Problem description and special instructions",
    },
    {
      name: "tenant_id",
      type: "string",
      required: false,
      description: "Tenant identifier",
      dynamicValue: "{{tenant_id}}",
    },
    {
      name: "conversation_id",
      type: "string",
      required: false,
      description: "Conversation tracking",
    }
  );

  return {
    name: "create_dispatch_job",
    description: modeSpecificDescription ||
      `Send a technician out NOW for emergency service calls. Use when customer has an urgent issue. Call check_service_area first to verify coverage, then create the job.`,
    url: `${BASE_URL}/elevenlabs-create-dispatch-job`,
    method: "POST",
    parameters: params,
  };
}

/**
 * create_callback - Schedule a callback
 * Used by: All agent types
 */
function createCallbackTool(modeSpecificDescription?: string): AgentTool {
  return {
    name: "create_callback",
    description: modeSpecificDescription ||
      `Schedule a callback when customer needs a quote, wants to discuss a complex job, or asks to speak with someone. Use when: "I need a quote", "Have someone call me", "I want to talk to the owner", or any question you cannot fully answer.`,
    url: `${BASE_URL}/elevenlabs-create-callback`,
    method: "POST",
    parameters: [
      {
        name: "reason",
        type: "string",
        required: true,
        description: "Why they want a callback: 'quote request', 'job estimate', 'speak to owner', 'question about service'",
      },
      {
        name: "customer_name",
        type: "string",
        required: false,
        description: "Customer's name",
      },
      {
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Customer phone number",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "department",
        type: "string",
        required: false,
        description: "Who should call: 'sales', 'owner', 'manager', 'technician'",
      },
      {
        name: "preferred_time",
        type: "string",
        required: false,
        description: "When to call: 'morning', 'afternoon', 'ASAP'",
      },
      {
        name: "notes",
        type: "string",
        required: false,
        description: "What they want to discuss",
      },
      {
        name: "tenant_id",
        type: "string",
        required: false,
        description: "Tenant identifier",
        dynamicValue: "{{tenant_id}}",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "Conversation tracking",
      },
    ],
  };
}

/**
 * cancel_booking - Cancel an existing appointment
 * Used by: Service (capability: booking)
 */
function createCancelBookingTool(): AgentTool {
  return {
    name: "cancel_booking",
    description: `Cancel an existing appointment. Use when caller says: "I need to cancel", "Cancel my appointment", "I can't make it". Ask for name or phone to identify the booking.`,
    url: `${BASE_URL}/elevenlabs-cancel-booking`,
    method: "POST",
    parameters: [
      {
        name: "tenant_id",
        type: "string",
        required: true,
        description: "Tenant identifier",
        dynamicValue: "{{tenant_id}}",
      },
      {
        name: "customer_name",
        type: "string",
        required: false,
        description: "Customer's name to find the booking",
      },
      {
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Customer's phone number to find the booking",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "booking_id",
        type: "string",
        required: false,
        description: "Direct booking ID if known",
      },
      {
        name: "reason",
        type: "string",
        required: false,
        description: "Reason for cancellation",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "Conversation tracking",
      },
    ],
  };
}

/**
 * add_to_waitlist - Add caller to waitlist when preferred time is unavailable
 * Used by: Service, Food (capability: booking, reservations)
 */
function createAddToWaitlistTool(): AgentTool {
  return {
    name: "add_to_waitlist",
    description: `Add caller to waitlist when their preferred time is unavailable. Use when: waitlist_enabled is "true" AND the time they want is fully booked. Ask if they want to be notified if something opens up.`,
    url: `${BASE_URL}/elevenlabs-add-to-waitlist`,
    method: "POST",
    parameters: [
      {
        name: "tenant_id",
        type: "string",
        required: true,
        description: "Tenant identifier",
        dynamicValue: "{{tenant_id}}",
      },
      {
        name: "customer_name",
        type: "string",
        required: true,
        description: "Customer's name",
      },
      {
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Customer's phone number for callback",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "preferred_date",
        type: "string",
        required: true,
        description: "Date they wanted",
      },
      {
        name: "preferred_time",
        type: "string",
        required: false,
        description: "Time they wanted",
      },
      {
        name: "service_name",
        type: "string",
        required: false,
        description: "Service they're waiting for",
      },
      {
        name: "notes",
        type: "string",
        required: false,
        description: "Additional notes",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "Conversation tracking",
      },
    ],
  };
}

/**
 * lookup_dispatch_status - Check status of an existing dispatch job
 * Used by: Dispatch (capability: dispatch_queue)
 */
function createLookupDispatchStatusTool(): AgentTool {
  return {
    name: "lookup_dispatch_status",
    description: `Check status of an existing dispatch job. Use when caller asks: "Where's my driver?", "Any update?", "How much longer?", "Checking on my tow", "Is someone on the way?", "ETA on my driver?". Requires at least 2 of: customer_name, customer_phone, pickup_address.`,
    url: `${BASE_URL}/elevenlabs-lookup-dispatch-status`,
    method: "POST",
    parameters: [
      {
        name: "tenant_id",
        type: "string",
        required: true,
        description: "Tenant identifier",
        dynamicValue: "{{tenant_id}}",
      },
      {
        name: "customer_name",
        type: "string",
        required: false,
        description: "Customer's name to match against job records",
      },
      {
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Customer's phone number for lookup",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "pickup_address",
        type: "string",
        required: false,
        description: "Pickup address to match against job records",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "Conversation tracking",
      },
    ],
  };
}

// ============= AGENT CONFIGURATIONS =============

/**
 * SERVICE AGENT (8 Tools)
 * Industries: Salons, spas, HVAC, plumbers, electricians, auto detailing, cleaning services, contractors
 */
export const SERVICE_AGENT_CONFIG: AgentToolsConfig = {
  mode: "service",
  agentName: "Service Agent",
  industries: ["Salons", "spas", "HVAC", "plumbers", "electricians", "auto detailing", "cleaning services", "contractors"],
  toolCount: 8,
  tools: [
    createCheckAvailabilityTool(
      `Check if a specific appointment time is available. Call this BEFORE confirming any appointment. Use when customer says "Do you have 2pm tomorrow?" or requests a specific time slot.`
    ),
    createSuggestAvailabilityTool(
      `Get available appointment times. Call when customer asks "What times do you have?", "When can I come in?", or "What's available this week?". Returns up to 5 open slots.`
    ),
    createBookingTool(
      `Book the appointment after customer confirms. Only call AFTER checking availability AND getting customer's explicit "yes" to book. Collect customer name if not already known.`
    ),
    createCheckServiceAreaTool(
      `Check if we can come to the customer's location. Use for mobile services (HVAC, plumber, detailing, cleaning going TO customer's home). Call when customer asks "Can you come to my house?" or gives their address. Returns ETA and whether location is in service area.`
    ),
    createDispatchJobTool(
      `Send a technician out NOW for emergency service calls. Use when customer has an urgent issue: "My AC is broken!", "Pipe is leaking!", "I'm locked out!". Call check_service_area first to verify coverage, then create the job.`,
      false
    ),
    createCallbackTool(
      `Schedule a callback when customer needs a quote, wants to discuss a complex job, or asks to speak with someone. Use when: "I need a quote", "Have someone call me", "I want to talk to the owner", or any question you cannot fully answer.`
    ),
    // CANCEL BOOKING
    {
      name: "cancel_booking",
      description: `Cancel an existing appointment. Use when caller says: "I need to cancel", "Cancel my appointment", "I can't make it". Ask for name or phone to identify the booking.`,
      url: `${BASE_URL}/elevenlabs-cancel-booking`,
      method: "POST",
      parameters: [
        {
          name: "tenant_id",
          type: "string",
          required: true,
          description: "Tenant identifier",
          dynamicValue: "{{tenant_id}}",
        },
        {
          name: "customer_name",
          type: "string",
          required: false,
          description: "Customer's name to find the booking",
        },
        {
          name: "customer_phone",
          type: "string",
          required: false,
          description: "Customer's phone number to find the booking",
          dynamicValue: "{{caller_phone}}",
        },
        {
          name: "booking_id",
          type: "string",
          required: false,
          description: "Direct booking ID if known",
        },
        {
          name: "reason",
          type: "string",
          required: false,
          description: "Reason for cancellation",
        },
        {
          name: "conversation_id",
          type: "string",
          required: false,
          description: "Conversation tracking",
        },
      ],
    },
    // ADD TO WAITLIST
    {
      name: "add_to_waitlist",
      description: `Add caller to waitlist when their preferred time is unavailable. Use when: waitlist_enabled is "true" AND the time they want is fully booked. Ask if they want to be notified if something opens up.`,
      url: `${BASE_URL}/elevenlabs-add-to-waitlist`,
      method: "POST",
      parameters: [
        {
          name: "tenant_id",
          type: "string",
          required: true,
          description: "Tenant identifier",
          dynamicValue: "{{tenant_id}}",
        },
        {
          name: "customer_name",
          type: "string",
          required: true,
          description: "Customer's name",
        },
        {
          name: "customer_phone",
          type: "string",
          required: false,
          description: "Customer's phone number for callback",
          dynamicValue: "{{caller_phone}}",
        },
        {
          name: "preferred_date",
          type: "string",
          required: true,
          description: "Date they wanted",
        },
        {
          name: "preferred_time",
          type: "string",
          required: false,
          description: "Time they wanted",
        },
        {
          name: "service_name",
          type: "string",
          required: false,
          description: "Service they're waiting for",
        },
        {
          name: "notes",
          type: "string",
          required: false,
          description: "Additional notes",
        },
        {
          name: "conversation_id",
          type: "string",
          required: false,
          description: "Conversation tracking",
        },
      ],
    },
  ],
};

/**
 * DISPATCH AGENT (7 Tools)
 * Industries: Towing, roadside assistance, courier/delivery, mobile mechanics, locksmith
 */
export const DISPATCH_AGENT_CONFIG: AgentToolsConfig = {
  mode: "dispatch",
  agentName: "Dispatch Agent",
  industries: ["Towing", "roadside assistance", "courier/delivery", "mobile mechanics", "locksmith"],
  toolCount: 7,
  tools: [
    createCheckAvailabilityTool(
      `Check availability for SCHEDULED (non-emergency) jobs. Use when customer wants to schedule a future tow, planned vehicle transport, or non-urgent service. Example: "Can I schedule a tow for tomorrow morning?"`
    ),
    createSuggestAvailabilityTool(
      `Get available times for scheduled (non-emergency) jobs. Use when customer asks "When can you come pick up my car?" for a planned service, not an emergency.`
    ),
    createBookingTool(
      `Book a SCHEDULED tow or service for a future date/time. Only for non-emergency planned services. For immediate dispatch, use create_dispatch_job instead.`
    ),
    createCheckServiceAreaTool(
      `CRITICAL TOOL - Use for every dispatch call. Check if location is in service area and get real-time ETA and pricing. Call immediately when customer provides their location. Returns: in_area (yes/no), ETA range, distance, and price estimate for towing.`,
      true, // includeVehicleType
      true  // includeDropoff
    ),
    createDispatchJobTool(
      `MAIN DISPATCH TOOL - Send a driver/technician NOW. Use for: "I need a tow", "I'm stranded", "Car won't start", "Locked out", "Flat tire". Always call check_service_area FIRST to get ETA and confirm coverage, then create the dispatch job.`,
      true // isDispatchMode
    ),
    // STATUS LOOKUP - For existing job inquiries
    {
      name: "lookup_dispatch_status",
      description: `Check status of an existing dispatch job. Use when caller asks: "Where's my driver?", "Any update?", "How much longer?", "Checking on my tow", "Is someone on the way?", "ETA on my driver?". Requires at least 2 of: customer_name, customer_phone, pickup_address.`,
      url: `${BASE_URL}/elevenlabs-lookup-dispatch-status`,
      method: "POST",
      parameters: [
        {
          name: "tenant_id",
          type: "string",
          required: true,
          description: "Tenant identifier",
          dynamicValue: "{{tenant_id}}",
        },
        {
          name: "customer_name",
          type: "string",
          required: false,
          description: "Customer's name to match against job records",
        },
        {
          name: "customer_phone",
          type: "string",
          required: false,
          description: "Customer's phone number for lookup",
          dynamicValue: "{{caller_phone}}",
        },
        {
          name: "pickup_address",
          type: "string",
          required: false,
          description: "Pickup address to match against job records",
        },
        {
          name: "conversation_id",
          type: "string",
          required: false,
          description: "Conversation tracking",
        },
      ],
    },
    // CALLBACK
    {
      name: "create_callback",
      description: `Schedule a callback for pricing questions, complaints, or when customer needs to speak to dispatch manager. Use when: "I need an exact quote", "I want to talk to a manager", "I have a complaint", or billing questions.`,
      url: `${BASE_URL}/elevenlabs-create-callback`,
      method: "POST",
      parameters: [
        {
          name: "reason",
          type: "string",
          required: true,
          description: "Why callback needed: 'pricing question', 'exact quote needed', 'speak to manager', 'complaint', 'billing', 'pricing negotiation'",
        },
        {
          name: "customer_name",
          type: "string",
          required: false,
          description: "Customer's name",
        },
        {
          name: "customer_phone",
          type: "string",
          required: false,
          description: "Customer phone number",
          dynamicValue: "{{caller_phone}}",
        },
        {
          name: "department",
          type: "string",
          required: false,
          description: "'dispatch', 'manager', 'billing', 'owner'",
        },
        {
          name: "urgency",
          type: "string",
          required: false,
          description: "'low', 'medium', 'high'",
        },
        {
          name: "notes",
          type: "string",
          required: false,
          description: "Context about their question",
        },
        {
          name: "tenant_id",
          type: "string",
          required: false,
          description: "Tenant identifier",
          dynamicValue: "{{tenant_id}}",
        },
        {
          name: "conversation_id",
          type: "string",
          required: false,
          description: "Conversation tracking",
        },
      ],
    },
  ],
};

/**
 * FOOD AGENT (6 Tools)
 * Industries: Restaurants, pizza, Chinese food, catering, bakeries, food trucks
 */
export const FOOD_AGENT_CONFIG: AgentToolsConfig = {
  mode: "food",
  agentName: "Food Agent",
  industries: ["Restaurants", "pizza", "Chinese food", "catering", "bakeries", "food trucks"],
  toolCount: 6,
  tools: [
    createCheckAvailabilityTool(
      `Check if a reservation time is available. Use when customer asks for a specific time: "Do you have a table at 7pm Friday?" or "Is 6:30 available for Saturday?"`
    ),
    createSuggestAvailabilityTool(
      `Get available reservation times. Use when customer asks "What times do you have Saturday?" or "When can we get a table for 6 people?"`
    ),
    {
      ...createBookingTool(
        `Make a reservation after customer confirms. Get their name and party size. For reservations only - food orders are handled through data collection, not this tool.`
      ),
      parameters: [
        {
          name: "customer_name",
          type: "string",
          required: true,
          description: "Name for the reservation",
        },
        {
          name: "date",
          type: "string",
          required: true,
          description: "Reservation date",
        },
        {
          name: "time",
          type: "string",
          required: true,
          description: "Reservation time",
        },
        {
          name: "service_name",
          type: "string",
          required: true,
          description: "Party size: 'table for 4', 'party of 6', 'reservation for 2'",
        },
        {
          name: "customer_phone",
          type: "string",
          required: false,
          description: "Customer phone for confirmation calls",
          dynamicValue: "{{caller_phone}}",
        },
        {
          name: "notes",
          type: "string",
          required: false,
          description: "Special requests: 'high chair needed', 'birthday celebration', 'quiet table', 'outdoor seating'",
        },
        {
          name: "tenant_id",
          type: "string",
          required: false,
          description: "Tenant identifier",
          dynamicValue: "{{tenant_id}}",
        },
        {
          name: "conversation_id",
          type: "string",
          required: false,
          description: "Conversation tracking",
        },
      ],
    },
    createCheckServiceAreaTool(
      `Check if we deliver to the customer's address. Use when customer asks "Do you deliver to [address]?" or "Can I get delivery to my house?" or gives an address for delivery. Returns whether address is in delivery zone and estimated delivery time.`
    ),
    {
      name: "create_dispatch_job",
      description: `Create a delivery order. Use after confirming delivery address is in service area AND customer has placed their order. This schedules the delivery driver.`,
      url: `${BASE_URL}/elevenlabs-create-dispatch-job`,
      method: "POST",
      parameters: [
        {
          name: "pickup_address",
          type: "string",
          required: true,
          description: "Delivery address - where to bring the food",
        },
        {
          name: "service_type",
          type: "string",
          required: false,
          description: "Default to 'delivery'",
        },
        {
          name: "customer_name",
          type: "string",
          required: false,
          description: "Customer's name for the order",
        },
        {
          name: "customer_phone",
          type: "string",
          required: false,
          description: "Customer phone number",
          dynamicValue: "{{caller_phone}}",
        },
        {
          name: "notes",
          type: "string",
          required: false,
          description: "Delivery instructions: 'Leave at door', 'Call when arriving', 'Gate code 1234', 'Apartment 2B'",
        },
        {
          name: "tenant_id",
          type: "string",
          required: false,
          description: "Tenant identifier",
          dynamicValue: "{{tenant_id}}",
        },
        {
          name: "conversation_id",
          type: "string",
          required: false,
          description: "Conversation tracking",
        },
      ],
    },
    {
      name: "create_callback",
      description: `Schedule a callback for catering inquiries, large orders, event planning, or questions about the menu. Use when: "I want to order catering for 50 people", "I'm planning an event", "I need to talk to the owner about a large order".`,
      url: `${BASE_URL}/elevenlabs-create-callback`,
      method: "POST",
      parameters: [
        {
          name: "reason",
          type: "string",
          required: true,
          description: "Why callback needed: 'catering inquiry', 'large order', 'event planning', 'menu question', 'special dietary needs'",
        },
        {
          name: "customer_name",
          type: "string",
          required: false,
          description: "Customer's name",
        },
        {
          name: "customer_phone",
          type: "string",
          required: false,
          description: "Customer phone number",
          dynamicValue: "{{caller_phone}}",
        },
        {
          name: "department",
          type: "string",
          required: false,
          description: "'catering', 'manager', 'owner', 'chef'",
        },
        {
          name: "preferred_time",
          type: "string",
          required: false,
          description: "When to call back",
        },
        {
          name: "notes",
          type: "string",
          required: false,
          description: "Event details: date, number of guests, type of event",
        },
        {
          name: "tenant_id",
          type: "string",
          required: false,
          description: "Tenant identifier",
          dynamicValue: "{{tenant_id}}",
        },
        {
          name: "conversation_id",
          type: "string",
          required: false,
          description: "Conversation tracking",
        },
      ],
    },
  ],
};

/**
 * MEDICAL AGENT (5 Tools)
 * Industries: Doctor's offices, dental practices, clinics, physical therapy, veterinary, mental health
 * Note: No create_dispatch_job - medical doesn't do emergency dispatch via AI
 */
export const MEDICAL_AGENT_CONFIG: AgentToolsConfig = {
  mode: "medical",
  agentName: "Medical Agent",
  industries: ["Doctor's offices", "dental practices", "clinics", "physical therapy", "veterinary", "mental health"],
  toolCount: 5,
  tools: [
    createCheckAvailabilityTool(
      `Check if an appointment time is available. Use when patient requests a specific time: "Do you have anything at 2pm Tuesday?" or "Is Dr. Smith available Friday morning?"`
    ),
    createSuggestAvailabilityTool(
      `Get available appointment times. Use when patient asks "When is the soonest appointment?", "What do you have this week?", or "When can I see the doctor?"`
    ),
    createBookingTool(
      `Book the appointment after patient confirms the time. Collect patient name. For new patients, note that in the notes field.`
    ),
    createCheckServiceAreaTool(
      `Check if home health visits or house calls are available to the patient's location. Use when patient asks "Do you do home visits?" or "Can the doctor come to my house?"`
    ),
    {
      name: "create_callback",
      description: `Schedule a callback for medical questions, prescription refills, test results, or to speak with clinical staff. IMPORTANT: Do not discuss medical information over the phone - use callback for clinical questions. Use when: "I need to talk to the doctor", "My prescription needs refilling", "Are my results in?", "I have a medical question".`,
      url: `${BASE_URL}/elevenlabs-create-callback`,
      method: "POST",
      parameters: [
        {
          name: "reason",
          type: "string",
          required: true,
          description: "Why callback needed: 'prescription refill', 'test results', 'medical question', 'speak to nurse', 'speak to doctor', 'billing question'",
        },
        {
          name: "customer_name",
          type: "string",
          required: false,
          description: "Patient's name",
        },
        {
          name: "customer_phone",
          type: "string",
          required: false,
          description: "Patient phone number",
          dynamicValue: "{{caller_phone}}",
        },
        {
          name: "department",
          type: "string",
          required: false,
          description: "'nurse', 'doctor', 'billing', 'front desk', 'medical records'",
        },
        {
          name: "preferred_time",
          type: "string",
          required: false,
          description: "When to call back",
        },
        {
          name: "urgency",
          type: "string",
          required: false,
          description: "'low', 'medium', 'high' - note: for emergencies, direct to 911",
        },
        {
          name: "notes",
          type: "string",
          required: false,
          description: "General context only - NO medical details or PHI",
        },
        {
          name: "tenant_id",
          type: "string",
          required: false,
          description: "Tenant identifier",
          dynamicValue: "{{tenant_id}}",
        },
        {
          name: "conversation_id",
          type: "string",
          required: false,
          description: "Conversation tracking",
        },
      ],
    },
  ],
};

/**
 * GENERAL AGENT (3 Tools)
 * Industries: Any business without specific mode, lead capture, basic information
 * Note: Only 3 tools - this agent is for simple inquiries and lead capture
 */
export const GENERAL_AGENT_CONFIG: AgentToolsConfig = {
  mode: "general",
  agentName: "General Agent",
  industries: ["Any business", "lead capture", "basic information"],
  toolCount: 3,
  tools: [
    createSuggestAvailabilityTool(
      `Get available times when scheduling a callback. Use if customer asks "When can someone call me?" or wants to schedule a specific callback time.`
    ),
    createCheckServiceAreaTool(
      `Check if we service the customer's area. Use when customer asks "Do you service my area?", "Are you available in [city]?", or provides their location.`
    ),
    {
      name: "create_callback",
      description: `PRIMARY TOOL - Create a callback for any inquiry. Use for: "I want to learn more", "Have someone call me", "I'm interested in your services", any question you cannot answer, or any request that needs a human. This is your main tool for capturing leads.`,
      url: `${BASE_URL}/elevenlabs-create-callback`,
      method: "POST",
      parameters: [
        {
          name: "reason",
          type: "string",
          required: true,
          description: "Why they're calling: 'interested in services', 'pricing question', 'general inquiry', 'want more information'",
        },
        {
          name: "customer_name",
          type: "string",
          required: false,
          description: "Customer's name - ask for it",
        },
        {
          name: "customer_phone",
          type: "string",
          required: false,
          description: "Customer phone number",
          dynamicValue: "{{caller_phone}}",
        },
        {
          name: "department",
          type: "string",
          required: false,
          description: "'sales', 'owner', 'manager'",
        },
        {
          name: "preferred_time",
          type: "string",
          required: false,
          description: "When to call back",
        },
        {
          name: "notes",
          type: "string",
          required: false,
          description: "What they want to discuss",
        },
        {
          name: "tenant_id",
          type: "string",
          required: false,
          description: "Tenant identifier",
          dynamicValue: "{{tenant_id}}",
        },
        {
          name: "conversation_id",
          type: "string",
          required: false,
          description: "Conversation tracking",
        },
      ],
    },
  ],
};

/**
 * SALES AGENT (5 Tools)
 * Industries: Car dealerships, RV/boat dealers, real estate, solar, insurance, equipment sales
 * Note: Reuses scheduling tools + callback; no dispatch or food tools
 */
export const SALES_AGENT_CONFIG: AgentToolsConfig = {
  mode: "sales",
  agentName: "Sales Agent",
  industries: ["Car dealership", "RV dealer", "Real estate", "Solar", "Insurance", "Equipment sales", "Luxury retail"],
  toolCount: 5,
  tools: [
    createCheckAvailabilityTool(
      `Check if a specific test drive or appointment time is available. Use when customer says "Can I come in Tuesday at 2?" or "Is Saturday morning open?"`
    ),
    createSuggestAvailabilityTool(
      `Get available times for test drives or showroom appointments. Use when customer asks "When can I come in?" or "What times do you have?"`
    ),
    createBookingTool(
      `Book a test drive or sales appointment. Use after confirming a time. ALWAYS include vehicle interest, budget, and trade-in info in the notes field.`,
      false // no party_size for sales
    ),
    createCheckServiceAreaTool(
      `Check if we serve the customer's area. Use for delivery, solar installation, real estate coverage, or service area questions.`
    ),
    createCallbackTool(
      `Create a callback for financing questions, trade-in valuations, manager requests, or when customer won't schedule but wants info. Use department field to route: 'sales', 'finance', 'service', 'manager'.`
    ),
  ],
};

// ============= REGISTRY =============

/**
 * Map of business mode to agent configuration
 */
export const AGENT_TOOLS_REGISTRY: Record<BusinessMode, AgentToolsConfig> = {
  service: SERVICE_AGENT_CONFIG,
  dispatch: DISPATCH_AGENT_CONFIG,
  food: FOOD_AGENT_CONFIG,
  medical: MEDICAL_AGENT_CONFIG,
  general: GENERAL_AGENT_CONFIG,
  sales: SALES_AGENT_CONFIG,
};

/**
 * Get the agent tools configuration for a given business mode
 */
export function getAgentToolsConfig(mode: BusinessMode): AgentToolsConfig {
  return AGENT_TOOLS_REGISTRY[mode] || GENERAL_AGENT_CONFIG;
}

/**
 * Get just the tool names for a given mode
 */
export function getToolNamesForMode(mode: BusinessMode): string[] {
  const config = getAgentToolsConfig(mode);
  return config.tools.map(t => t.name);
}

/**
 * Validate that a tool name is valid for a given mode
 */
export function isToolValidForMode(toolName: string, mode: BusinessMode): boolean {
  const validTools = getToolNamesForMode(mode);
  return validTools.includes(toolName);
}

/**
 * Get summary of all agents for documentation
 */
export function getAgentsSummary(): Array<{
  mode: BusinessMode;
  name: string;
  toolCount: number;
  tools: string[];
  industries: string[];
}> {
  return Object.values(AGENT_TOOLS_REGISTRY).map(config => ({
    mode: config.mode,
    name: config.agentName,
    toolCount: config.toolCount,
    tools: config.tools.map(t => t.name),
    industries: config.industries,
  }));
}

/**
 * Convert tool configuration to ElevenLabs API format
 * This is the format expected by the ElevenLabs tools API
 */
export function toElevenLabsToolFormat(tool: AgentTool): {
  name: string;
  description: string;
  api_schema: {
    url: string;
    method: string;
    request_body: {
      type: string;
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
} {
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    properties[param.name] = {
      type: param.type,
      description: param.description,
    };
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    api_schema: {
      url: tool.url,
      method: tool.method,
      request_body: {
        type: "object",
        properties,
        required,
      },
    },
  };
}

/**
 * Get all tools for a mode in ElevenLabs API format
 */
export function getElevenLabsToolsForMode(mode: BusinessMode): ReturnType<typeof toElevenLabsToolFormat>[] {
  const config = getAgentToolsConfig(mode);
  return config.tools.map(toElevenLabsToolFormat);
}

// ============= CAPABILITY-BASED TOOL BUILDING =============

/**
 * Build tools for a capability set, starting from a base mode
 * 
 * @param primaryMode - The "derived" primary mode (service, dispatch, food, medical, general)
 * @param capabilities - Record of enabled capabilities
 * @returns Array of tools to register with ElevenLabs
 */
export function buildToolsForCapabilities(
  primaryMode: BusinessMode,
  capabilities: Record<string, boolean>
): AgentTool[] {
  // Start with the base mode's core tools
  const baseConfig = AGENT_TOOLS_REGISTRY[primaryMode];
  if (!baseConfig) {
    console.warn(`[agentToolsConfig] No config for mode ${primaryMode}, using general`);
    return AGENT_TOOLS_REGISTRY.general.tools;
  }
  
  const tools: AgentTool[] = [...baseConfig.tools];
  const existingToolNames = new Set(tools.map(t => t.name));
  
  // Get all tools enabled by capabilities
  const enabledToolNames = getToolsForCapabilities(capabilities);
  
  // We need access to tool definitions - create a lookup
  const toolDefinitionLookup: Record<string, () => AgentTool> = {
    check_availability: () => createCheckAvailabilityTool(),
    suggest_availability: () => createSuggestAvailabilityTool(),
    create_booking: () => createBookingTool(),
    check_service_area: () => createCheckServiceAreaTool(undefined, true, true),
    create_dispatch_job: () => createDispatchJobTool(undefined, true),
    create_callback: () => createCallbackTool(),
    cancel_booking: () => createCancelBookingTool(),
    add_to_waitlist: () => createAddToWaitlistTool(),
    lookup_dispatch_status: () => createLookupDispatchStatusTool(),
  };
  
  // Inject bonus tools that aren't already in the base set
  for (const toolName of enabledToolNames) {
    if (!existingToolNames.has(toolName)) {
      const toolFactory = toolDefinitionLookup[toolName];
      if (toolFactory) {
        const tool = toolFactory();
        tools.push(tool);
        console.log(`[agentToolsConfig] Injecting bonus tool: ${toolName}`);
      }
    }
  }
  
  // Log the final tool set
  console.log(`[agentToolsConfig] Final tool set for ${primaryMode}:`, {
    baseTools: baseConfig.tools.length,
    bonusTools: tools.length - baseConfig.tools.length,
    totalTools: tools.length,
    toolNames: tools.map(t => t.name),
  });
  
  return tools;
}
