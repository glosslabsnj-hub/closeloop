/**
 * ELEVENLABS AGENT TOOLS CONFIGURATION
 *
 * Defines the tool configurations for each agent type (Service, Dispatch, Food, Medical, General).
 * These configurations are used to programmatically register tools with ElevenLabs agents.
 *
 * Each agent type has a specific set of tools based on its industry needs:
 * - Service (12 tools): Salons, HVAC, plumbers, contractors
 * - Dispatch (8 tools): Towing, roadside, couriers, locksmiths
 * - Food (10 tools): Restaurants, pizza, catering, bakeries
 * - Medical (9 tools): Doctors, dentists, clinics, veterinary
 * - Sales (10 tools): Car dealerships, real estate, solar, insurance
 * - General (4 tools): Any business, lead capture, basic info
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
      `MANDATORY: Check if a specific appointment time is available. You MUST call this BEFORE create_booking. NEVER confirm or book any time without calling this first. If you skip this, the customer may be double-booked. IMPORTANT: You MUST ask the caller what service they need BEFORE calling this tool. Different services have different durations (e.g., a full detail takes much longer than a basic wash), so passing the correct service_name is critical to avoid scheduling conflicts.`,
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
        required: true,
        description: "REQUIRED: The service being booked (e.g., 'haircut', 'AC repair', 'ceramic coating', 'full detail'). This determines appointment duration. You MUST ask the caller what service they want before checking availability.",
      },
      {
        name: "tenant_id",
        type: "string",
        required: true,
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
      `Get available appointment times. Call when customer asks "What times do you have?", "When can I come in?", or "What's available this week?". Returns up to 5 open slots. IMPORTANT: Ask the caller what service they need first so you can pass service_name. Different services have different durations, which affects which slots are actually available.`,
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
        required: true,
        description: "REQUIRED: The service being booked (e.g., 'haircut', 'ceramic coating', 'AC repair'). Determines how long the appointment needs to be, which affects available slots. Ask the caller what service they want first.",
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
        required: true,
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
      `Book the appointment ONLY after: (1) You called check_availability or suggest_availability to verify the time slot is open, AND (2) the customer explicitly said "yes" to book. NEVER call this without checking availability first. For on-site services (HVAC, plumbing, electrical), include customer_address.`,
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
        name: "customer_address",
        type: "string",
        required: false,
        description: "Customer's address for on-site services (HVAC, plumbing, electrical, etc.). Always collect for home service businesses.",
      },
      {
        name: "vehicle_type",
        type: "string",
        required: false,
        description: "Vehicle type/size: 'sedan', 'suv', 'truck', 'van', 'crossover'. Important for accurate pricing when services have vehicle-based tiers. Ask the customer what they drive.",
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
        required: true,
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
      required: true,
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
      required: true,
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
        name: "urgency",
        type: "string",
        required: false,
        description: "How urgent: 'normal' (default), 'high' (same-day needed), 'urgent' (emergency or on-site customer waiting)",
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
        required: true,
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

/**
 * lookup_active_job - Check status of a customer's active job/vehicle in the shop
 * Used by: Service (capability: job_tracking), callback_only mode
 */
function createLookupActiveJobTool(): AgentTool {
  return {
    name: "lookup_active_job",
    description: `Look up the status of a customer's active job or vehicle in the shop. Use when caller asks: "How's my car?", "Is my car ready?", "What's the status of my repair?", "When will it be done?", or provides a job number. Can search by phone, name, job number, or vehicle description.`,
    url: `${BASE_URL}/elevenlabs-lookup-active-job`,
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
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Customer's phone number for lookup",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "customer_name",
        type: "string",
        required: false,
        description: "Customer's name to match against job records",
      },
      {
        name: "job_number",
        type: "string",
        required: false,
        description: "Job number if the customer provides one (e.g., 'JOB-1234')",
      },
      {
        name: "vehicle_description",
        type: "string",
        required: false,
        description: "Vehicle year/make/model if mentioned (e.g., '2019 Honda Civic')",
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
 * transfer_to_owner - Transfer the live call to the business owner/manager
 * Used by: All agent types (universal)
 */
function createTransferToOwnerTool(): AgentTool {
  return {
    name: "transfer_to_owner",
    description: `Transfer the caller to the business owner or manager.

TRANSFER IMMEDIATELY when:
- Caller explicitly asks: "Let me talk to someone", "Can I speak to the owner?", "Transfer me", "I want to talk to a person", "Get me your manager" — do NOT try to talk them out of it.
- Caller describes a HIGH-VALUE or COMPLEX job AND is ON-SITE or nearby (e.g., "I'm outside your shop", "I'm in the area", "I drove here"). Offer: "This sounds like something [owner name] would want to discuss with you personally. Let me connect you right now."
- Caller is upset, frustrated, or making a complaint about prior work.
- Caller mentions an EMERGENCY or URGENT situation.

USE create_callback INSTEAD when:
- Caller is casually inquiring about pricing or availability.
- Caller is scheduling a routine appointment.
- The call is outside business hours (transfer likely won't be answered).`,
    url: `${BASE_URL}/elevenlabs-transfer-call`,
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
        name: "conversation_id",
        type: "string",
        required: false,
        description: "Conversation tracking for session lookup",
      },
      {
        name: "twilio_call_sid",
        type: "string",
        required: true,
        description: "Twilio Call SID for the active call (required for transfer to work)",
        dynamicValue: "{{twilio_call_sid}}",
      },
      {
        name: "customer_name",
        type: "string",
        required: false,
        description: "Customer's name if collected",
      },
      {
        name: "reason",
        type: "string",
        required: true,
        description: "Why the caller wants to be transferred",
      },
    ],
  };
}

// ============= AGENT CONFIGURATIONS =============

/**
 * SERVICE AGENT (12 Tools)
 * Industries: Salons, spas, HVAC, plumbers, electricians, auto detailing, cleaning services, contractors
 */
export const SERVICE_AGENT_CONFIG: AgentToolsConfig = {
  mode: "service",
  agentName: "Service Agent",
  industries: ["Salons", "spas", "HVAC", "plumbers", "electricians", "auto detailing", "cleaning services", "contractors"],
  toolCount: 12,
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
    createCancelBookingTool(),
    createRescheduleBookingTool(),
    createLookupBookingTool(),
    createAddToWaitlistTool(),
    createLookupActiveJobTool(),
    createTransferToOwnerTool(),
  ],
};

/**
 * DISPATCH AGENT (8 Tools)
 * Industries: Towing, roadside assistance, courier/delivery, mobile mechanics, locksmith
 */
export const DISPATCH_AGENT_CONFIG: AgentToolsConfig = {
  mode: "dispatch",
  agentName: "Dispatch Agent",
  industries: ["Towing", "roadside assistance", "courier/delivery", "mobile mechanics", "locksmith"],
  toolCount: 10,
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
    createCancelDispatchJobTool(),
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
          required: true,
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
 * FOOD AGENT (10 Tools)
 * Industries: Restaurants, pizza, Chinese food, catering, bakeries, food trucks
 */
export const FOOD_AGENT_CONFIG: AgentToolsConfig = {
  mode: "food",
  agentName: "Food Agent",
  industries: ["Restaurants", "pizza", "Chinese food", "catering", "bakeries", "food trucks"],
  toolCount: 10,
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
          required: true,
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
          required: true,
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
          required: true,
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
    createFoodOrderTool(),
    createLookupOrderStatusTool(),
    createTransferToOwnerTool(),
    createAddToWaitlistTool(),
  ],
};

/**
 * MEDICAL AGENT (10 Tools)
 * Industries: Doctor's offices, dental practices, clinics, physical therapy, chiropractic,
 *   optometry, dermatology, mental health, pediatrics, orthodontics, med spas
 * Note: No create_dispatch_job - medical doesn't do emergency dispatch via AI
 */
export const MEDICAL_AGENT_CONFIG: AgentToolsConfig = {
  mode: "medical",
  agentName: "Medical Agent",
  industries: ["Doctor's offices", "dental practices", "clinics", "physical therapy", "chiropractic", "optometry", "dermatology", "mental health", "pediatrics", "orthodontics", "med spas"],
  toolCount: 10,
  tools: [
    createCheckAvailabilityTool(
      `Check if an appointment time is available. Use when patient requests a specific time: "Do you have anything at 2pm Tuesday?" or "Is Dr. Smith available Friday morning?"`
    ),
    createSuggestAvailabilityTool(
      `Get available appointment times. Use when patient asks "When is the soonest appointment?", "What do you have this week?", or "When can I see the doctor?"`
    ),
    createBookingTool(
      `Book the appointment after patient confirms the time. Collect patient name. For new patients, note that in the notes field. HIPAA: Keep notes general — no symptoms, diagnoses, or medical details.`
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
          required: true,
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
    createMedicalIntakeTool(),
    createRescheduleBookingTool(),
    createLookupBookingTool(),
    createTransferToOwnerTool(),
    createAddToWaitlistTool(),
  ],
};

/**
 * GENERAL AGENT (4 Tools)
 * Industries: Any business without specific mode, lead capture, basic information
 * Note: 4 tools - this agent handles simple inquiries, lead capture, and call transfers
 */
export const GENERAL_AGENT_CONFIG: AgentToolsConfig = {
  mode: "general",
  agentName: "General Agent",
  industries: ["Any business", "lead capture", "basic information"],
  toolCount: 4,
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
          required: true,
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
    createTransferToOwnerTool(),
  ],
};

/**
 * search_inventory - Search available inventory by criteria
 * Used by: Sales (capability: sales_inventory)
 */
function createSearchInventoryTool(): AgentTool {
  return {
    name: "search_inventory",
    description: `Search available inventory by criteria. Use when caller asks about specific vehicles, products, or items: "Do you have any SUVs under 25k?", "What Toyotas do you have?", "Any red trucks?". Supports filtering by make, model, year, price range, body style, color, and condition. Returns matching items with details.`,
    url: `${BASE_URL}/elevenlabs-search-inventory`,
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
        name: "query",
        type: "string",
        required: false,
        description: "Free text search query (e.g., 'red SUV under 20k', '3 bed house in Scottsdale')",
      },
      {
        name: "make",
        type: "string",
        required: false,
        description: "Vehicle/product make or brand (e.g., 'Toyota', 'Ford')",
      },
      {
        name: "model",
        type: "string",
        required: false,
        description: "Vehicle/product model (e.g., 'Camry', 'F-150')",
      },
      {
        name: "year_min",
        type: "string",
        required: false,
        description: "Minimum year (e.g., '2020')",
      },
      {
        name: "year_max",
        type: "string",
        required: false,
        description: "Maximum year (e.g., '2024')",
      },
      {
        name: "price_min",
        type: "string",
        required: false,
        description: "Minimum price in dollars (e.g., '15000')",
      },
      {
        name: "price_max",
        type: "string",
        required: false,
        description: "Maximum price in dollars (e.g., '30000')",
      },
      {
        name: "condition",
        type: "string",
        required: false,
        description: "Condition filter: 'new', 'used', or 'certified'",
      },
      {
        name: "body_style",
        type: "string",
        required: false,
        description: "Body style: 'SUV', 'Sedan', 'Truck', 'Coupe', 'Van', etc.",
      },
      {
        name: "color",
        type: "string",
        required: false,
        description: "Exterior color preference",
      },
      {
        name: "max_results",
        type: "string",
        required: false,
        description: "Maximum results to return (default 5, max 10)",
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
 * SALES AGENT (10 Tools)
 * Industries: Car dealerships, RV/boat dealers, real estate, solar, insurance, equipment sales
 * Note: Reuses scheduling tools + callback + inventory search; no dispatch or food tools
 */
export const SALES_AGENT_CONFIG: AgentToolsConfig = {
  mode: "sales",
  agentName: "Sales Agent",
  industries: ["Car dealership", "RV dealer", "Real estate", "Solar", "Insurance", "Equipment sales", "Luxury retail"],
  toolCount: 10,
  tools: [
    createCheckAvailabilityTool(
      `Check if a specific test drive or appointment time is available. Use when customer says "Can I come in Tuesday at 2?" or "Is Saturday morning open?"`
    ),
    createSuggestAvailabilityTool(
      `Get available times for test drives or showroom appointments. Use when customer asks "When can I come in?" or "What times do you have?"`
    ),
    createBookingTool(
      `Book a test drive or sales appointment. Use after confirming a time. ALWAYS include vehicle interest, budget, and trade-in info in the notes field.`
    ),
    createCheckServiceAreaTool(
      `Check if we serve the customer's area. Use for delivery, solar installation, real estate coverage, or service area questions.`
    ),
    createCallbackTool(
      `Create a callback for financing questions, trade-in valuations, manager requests, or when customer won't schedule but wants info. Use department field to route: 'sales', 'finance', 'service', 'manager'.`
    ),
    createCancelBookingTool(),
    createRescheduleBookingTool(),
    createLookupBookingTool(),
    createTransferToOwnerTool(),
    createSearchInventoryTool(),
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

// ============= NEW TOOLS (P0-7) =============

/**
 * create_medical_intake - Create a medical intake record during the call
 * Used by: Medical (capability: medical_intake)
 */
function createMedicalIntakeTool(): AgentTool {
  return {
    name: "create_medical_intake",
    description: `Create a patient intake record. Use for new patients, follow-up requests, or prescription refills. ALWAYS get verbal consent before collecting information. Collect: patient name, reason for visit, preferred date/time, insurance provider (if known). HIPAA: Do NOT include symptoms, diagnoses, or detailed medical info in notes — keep it general.`,
    url: `${BASE_URL}/elevenlabs-create-medical-intake`,
    method: "POST",
    parameters: [
      {
        name: "customer_name",
        type: "string",
        required: true,
        description: "Patient's full name",
      },
      {
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Patient phone number",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "intake_type",
        type: "string",
        required: true,
        description: "'new_patient', 'follow_up', 'prescription_refill', or 'appointment_request'",
      },
      {
        name: "urgency_level",
        type: "string",
        required: false,
        description: "'routine' (default), 'soon' (within a few days), or 'urgent' (needs immediate attention but not 911-level)",
      },
      {
        name: "reason_for_visit",
        type: "string",
        required: false,
        description: "General reason — keep it brief and non-clinical: 'annual checkup', 'follow-up visit', 'not feeling well', 'prescription refill'",
      },
      {
        name: "preferred_date",
        type: "string",
        required: false,
        description: "Patient's preferred appointment date",
      },
      {
        name: "preferred_time_range",
        type: "string",
        required: false,
        description: "Preferred time: 'morning', 'afternoon', 'evening', or specific time",
      },
      {
        name: "insurance_provider",
        type: "string",
        required: false,
        description: "Insurance company name if provided",
      },
      {
        name: "verbal_consent_given",
        type: "boolean",
        required: false,
        description: "Whether patient gave verbal consent to collect information. Must be true before submitting.",
      },
      {
        name: "notes",
        type: "string",
        required: false,
        description: "General notes — NO symptoms, diagnoses, or PHI",
      },
      {
        name: "tenant_id",
        type: "string",
        required: true,
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
 * create_food_order - Place a food order during the call
 * Used by: Food (capability: food_orders)
 */
function createFoodOrderTool(): AgentTool {
  return {
    name: "create_food_order",
    description: `Place a food order during the call. Use when the customer has finished ordering and you have all the items. Confirm the full order back to the customer BEFORE calling this tool. Collect: customer name, order type (pickup/delivery), and items with quantities.`,
    url: `${BASE_URL}/elevenlabs-create-food-order`,
    method: "POST",
    parameters: [
      {
        name: "customer_name",
        type: "string",
        required: true,
        description: "Customer's name for the order",
      },
      {
        name: "order_type",
        type: "string",
        required: true,
        description: "Order type: 'pickup' or 'delivery'",
      },
      {
        name: "items",
        type: "string",
        required: true,
        description: 'JSON array of items, e.g. [{"name":"Pepperoni Pizza","quantity":2},{"name":"Caesar Salad","quantity":1}]',
      },
      {
        name: "delivery_address",
        type: "string",
        required: false,
        description: "Delivery address (required for delivery orders)",
      },
      {
        name: "special_instructions",
        type: "string",
        required: false,
        description: "Special instructions for the order",
      },
      {
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Customer phone number",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "tenant_id",
        type: "string",
        required: true,
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
 * reschedule_booking - Reschedule an existing appointment
 * Used by: Service, Medical, Sales (capability: booking)
 */
function createRescheduleBookingTool(): AgentTool {
  return {
    name: "reschedule_booking",
    description: `Reschedule an existing appointment. Use when caller says "I need to reschedule", "Can I change my appointment time?", "Move my appointment to...". Finds the booking by phone or name, then moves it to the new time.`,
    url: `${BASE_URL}/elevenlabs-reschedule-booking`,
    method: "POST",
    parameters: [
      {
        name: "new_date",
        type: "string",
        required: true,
        description: "New appointment date. Accept 'tomorrow', 'next Monday', 'Friday', or YYYY-MM-DD.",
      },
      {
        name: "new_time",
        type: "string",
        required: true,
        description: "New appointment time. Accept '2pm', '10:30am', or HH:MM.",
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
        description: "Customer's phone number",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "booking_id",
        type: "string",
        required: false,
        description: "Direct booking ID if known",
      },
      {
        name: "tenant_id",
        type: "string",
        required: true,
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
 * cancel_dispatch_job - Cancel an existing dispatch job
 * Used by: Dispatch (capability: dispatch_queue)
 */
function createCancelDispatchJobTool(): AgentTool {
  return {
    name: "cancel_dispatch_job",
    description: `Cancel an existing dispatch job. Use when caller says "Cancel my tow", "I don't need the driver anymore", "Cancel the job". Finds by phone, name, or job number.`,
    url: `${BASE_URL}/elevenlabs-cancel-dispatch-job`,
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
        description: "Customer's name to find the job",
      },
      {
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Customer's phone number",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "job_number",
        type: "string",
        required: false,
        description: "Job number if the customer provides one",
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
 * lookup_booking - Look up an existing booking
 * Used by: Service, Medical, Sales (capability: booking)
 */
function createLookupBookingTool(): AgentTool {
  return {
    name: "lookup_booking",
    description: `Look up an existing appointment. Use when caller asks: "When's my appointment?", "Do I have anything scheduled?", "What time is my appointment?". Searches by phone number or name.`,
    url: `${BASE_URL}/elevenlabs-lookup-booking`,
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
        description: "Customer's phone number",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "booking_id",
        type: "string",
        required: false,
        description: "Direct booking ID if known",
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
 * lookup_order_status - Check food order status
 * Used by: Food (capability: food_orders)
 */
function createLookupOrderStatusTool(): AgentTool {
  return {
    name: "lookup_order_status",
    description: `Check the status of a food order. Use when caller asks: "Where's my food?", "Is my order ready?", "How long for my order?", "Checking on my order", or provides an order number. Searches by phone, name, or order number.`,
    url: `${BASE_URL}/elevenlabs-lookup-order-status`,
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
        description: "Customer's name",
      },
      {
        name: "customer_phone",
        type: "string",
        required: false,
        description: "Customer's phone number",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "order_number",
        type: "string",
        required: false,
        description: "Order number if the customer provides one (e.g., 'ORD-A1B2C')",
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

// ============= REFERRAL NETWORK TOOLS =============

/**
 * search_referral_network — Search for a business on the referral network
 * that can help the caller when this business can't (out of area, wrong service, fully booked).
 *
 * IMPORTANT behavioral rules for the AI:
 * - ONLY call AFTER confirming you can't help (e.g., after check_service_area returns out-of-area,
 *   or the caller needs a service this business doesn't offer).
 * - Ask the caller's permission BEFORE searching: "I might know someone who can help. Mind if I check?"
 * - NEVER say "Flux Receptionist" or "same platform" — say "I work with" or "I know a great..."
 */
function createSearchReferralNetworkTool(): AgentTool {
  return {
    name: "search_referral_network",
    description: `Search for a nearby business that can help the caller when you cannot. Use this ONLY after you've confirmed you can't help — for example, the caller is outside your service area, needs a service you don't offer, or you're fully booked. IMPORTANT: Always ask the caller's permission before searching: "I might know someone who can help. Mind if I check?" Never mention any platform, network, or system — just say you might know someone nearby.`,
    url: `${BASE_URL}/elevenlabs-search-referral-network`,
    method: "POST",
    parameters: [
      {
        name: "caller_location",
        type: "string",
        required: true,
        description: "The caller's location — city/town, ZIP code, or address. Ask if not already known.",
      },
      {
        name: "service_needed",
        type: "string",
        required: true,
        description: "The service the caller needs, in plain English (e.g., 'auto detailing', 'emergency towing', 'haircut').",
      },
      {
        name: "reason",
        type: "string",
        required: true,
        description: "Why you can't help: 'out_of_area', 'service_not_offered', 'fully_booked', or 'closed'.",
      },
      {
        name: "urgency",
        type: "string",
        required: false,
        description: "How urgent the request is: 'low', 'normal', 'high', or 'urgent'.",
      },
      {
        name: "caller_name",
        type: "string",
        required: false,
        description: "The caller's name if they've provided it.",
      },
      {
        name: "caller_phone",
        type: "string",
        required: false,
        description: "The caller's phone number.",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "tenant_id",
        type: "string",
        required: true,
        description: "The current tenant ID.",
        dynamicValue: "{{tenant_id}}",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "The ElevenLabs conversation ID.",
        dynamicValue: "{{conversation_id}}",
      },
    ],
  };
}

/**
 * initiate_referral_transfer — Transfer the live call to a matched business's AI agent.
 *
 * ONLY call this after:
 * 1. search_referral_network found a match
 * 2. The caller explicitly agreed to the transfer
 *
 * Before calling: "Let me connect you now. I've let them know what you need."
 * If the caller declines: use create_callback instead.
 */
function createInitiateReferralTransferTool(): AgentTool {
  return {
    name: "initiate_referral_transfer",
    description: `Transfer the caller to a matched business's AI assistant. ONLY call this after search_referral_network returned a match AND the caller explicitly agreed to be transferred. Before calling, say something like "Let me connect you now, I've let them know what you need." If the caller declines the transfer, use create_callback instead to take their info.`,
    url: `${BASE_URL}/elevenlabs-initiate-referral-transfer`,
    method: "POST",
    parameters: [
      {
        name: "target_tenant_id",
        type: "string",
        required: true,
        description: "The tenant ID of the matched business (from search_referral_network results).",
      },
      {
        name: "transfer_id",
        type: "string",
        required: true,
        description: "The referral transfer ID (from search_referral_network results).",
      },
      {
        name: "service_needed",
        type: "string",
        required: true,
        description: "The service the caller needs.",
      },
      {
        name: "caller_name",
        type: "string",
        required: false,
        description: "The caller's name.",
      },
      {
        name: "caller_phone",
        type: "string",
        required: false,
        description: "The caller's phone number.",
        dynamicValue: "{{caller_phone}}",
      },
      {
        name: "caller_location",
        type: "string",
        required: false,
        description: "The caller's location.",
      },
      {
        name: "urgency",
        type: "string",
        required: false,
        description: "Urgency level: 'low', 'normal', 'high', or 'urgent'.",
      },
      {
        name: "referral_reason",
        type: "string",
        required: false,
        description: "Why the referral was needed.",
      },
      {
        name: "notes",
        type: "string",
        required: false,
        description: "Any additional context about the caller's needs.",
      },
      {
        name: "tenant_id",
        type: "string",
        required: true,
        description: "The current tenant ID.",
        dynamicValue: "{{tenant_id}}",
      },
      {
        name: "twilio_call_sid",
        type: "string",
        required: false,
        description: "The Twilio call SID for the live call.",
        dynamicValue: "{{twilio_call_sid}}",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "The ElevenLabs conversation ID.",
        dynamicValue: "{{conversation_id}}",
      },
    ],
  };
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
    lookup_active_job: () => createLookupActiveJobTool(),
    transfer_to_owner: () => createTransferToOwnerTool(),
    search_referral_network: () => createSearchReferralNetworkTool(),
    initiate_referral_transfer: () => createInitiateReferralTransferTool(),
    search_inventory: () => createSearchInventoryTool(),
    create_food_order: () => createFoodOrderTool(),
    create_medical_intake: () => createMedicalIntakeTool(),
    reschedule_booking: () => createRescheduleBookingTool(),
    cancel_dispatch_job: () => createCancelDispatchJobTool(),
    lookup_booking: () => createLookupBookingTool(),
    lookup_order_status: () => createLookupOrderStatusTool(),
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
