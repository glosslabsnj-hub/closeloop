/**
 * Dispatch Mode Extraction Tests
 * 
 * Tests for urgency detection, location extraction, job types,
 * vehicle information, and roadside assistance scenarios.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractDispatchData, userSays, agentSays, type TranscriptEntry } from "./_shared/test-helpers.ts";

// ============================================================================
// JOB TYPE DETECTION
// ============================================================================

Deno.test("Dispatch: Job type - 'car broke down' = tow", () => {
  const result = extractDispatchData([
    userSays("My car broke down on Highway 101 near exit 42")
  ]);
  
  assertEquals(result.job_type, "tow");
});

Deno.test("Dispatch: Job type - 'need a tow'", () => {
  const result = extractDispatchData([
    userSays("I need a tow truck")
  ]);
  
  assertEquals(result.job_type, "tow");
});

Deno.test("Dispatch: Job type - 'won't start' = tow", () => {
  const result = extractDispatchData([
    userSays("My car won't start, I think I need a tow")
  ]);
  
  assertEquals(result.job_type, "tow");
});

Deno.test("Dispatch: Job type - 'locked my keys in' = lockout", () => {
  const result = extractDispatchData([
    userSays("I locked my keys in the car at the Walmart parking lot")
  ]);
  
  assertEquals(result.job_type, "lockout");
});

Deno.test("Dispatch: Job type - 'locked out' = lockout", () => {
  const result = extractDispatchData([
    userSays("I'm locked out of my car")
  ]);
  
  assertEquals(result.job_type, "lockout");
});

Deno.test("Dispatch: Job type - 'dead battery' = jump start", () => {
  const result = extractDispatchData([
    userSays("My battery's dead, I need a jump start")
  ]);
  
  assertEquals(result.job_type, "jump_start");
});

Deno.test("Dispatch: Job type - 'need a jump' = jump start", () => {
  const result = extractDispatchData([
    userSays("Can I get a jump? My car won't turn over")
  ]);
  
  assertEquals(result.job_type, "jump_start");
});

Deno.test("Dispatch: Job type - 'flat tire' = tire change", () => {
  const result = extractDispatchData([
    userSays("I have a flat tire on the highway")
  ]);
  
  assertEquals(result.job_type, "tire_change");
});

Deno.test("Dispatch: Job type - 'tire blowout' = tire change", () => {
  const result = extractDispatchData([
    userSays("Had a tire blowout on I-95")
  ]);
  
  assertEquals(result.job_type, "tire_change");
});

Deno.test("Dispatch: Job type - 'ran out of gas' = fuel delivery", () => {
  const result = extractDispatchData([
    userSays("I ran out of gas on the side of the road")
  ]);
  
  assertEquals(result.job_type, "fuel_delivery");
});

Deno.test("Dispatch: Job type - 'stuck in a ditch' = winch out", () => {
  const result = extractDispatchData([
    userSays("My car is stuck in a ditch")
  ]);
  
  assertEquals(result.job_type, "winch_out");
});

// ============================================================================
// URGENCY DETECTION
// ============================================================================

Deno.test("Dispatch: Urgency - 'emergency' = high", () => {
  const result = extractDispatchData([
    userSays("This is an emergency, I need help ASAP")
  ]);
  
  assertEquals(result.urgency, "high");
});

Deno.test("Dispatch: Urgency - 'ASAP' = high", () => {
  const result = extractDispatchData([
    userSays("I need someone out here ASAP")
  ]);
  
  assertEquals(result.urgency, "high");
});

Deno.test("Dispatch: Urgency - 'stranded' = high", () => {
  const result = extractDispatchData([
    userSays("I'm stranded on the highway")
  ]);
  
  assertEquals(result.urgency, "high");
});

Deno.test("Dispatch: Urgency - 'kids in the car' = high", () => {
  const result = extractDispatchData([
    userSays("I have kids in the car and we're stuck")
  ]);
  
  assertEquals(result.urgency, "high");
});

Deno.test("Dispatch: Urgency - 'side of the road' = high", () => {
  const result = extractDispatchData([
    userSays("I'm on the side of the road in the dark")
  ]);
  
  assertEquals(result.urgency, "high");
});

Deno.test("Dispatch: Urgency - 'right away' = high", () => {
  const result = extractDispatchData([
    userSays("I need help right away please")
  ]);
  
  assertEquals(result.urgency, "high");
});

Deno.test("Dispatch: Urgency - 'when you can' = low", () => {
  const result = extractDispatchData([
    userSays("No rush, just whenever you can")
  ]);
  
  assertEquals(result.urgency, "low");
});

Deno.test("Dispatch: Urgency - 'no rush' = low", () => {
  const result = extractDispatchData([
    userSays("There's no rush, I'm safe at home")
  ]);
  
  assertEquals(result.urgency, "low");
});

Deno.test("Dispatch: Urgency - normal request = normal", () => {
  const result = extractDispatchData([
    userSays("My car broke down, can you send someone?")
  ]);
  
  assertEquals(result.urgency, "normal");
});

// ============================================================================
// LOCATION/ADDRESS EXTRACTION
// ============================================================================

Deno.test("Dispatch: Address - '123 Main Street'", () => {
  const result = extractDispatchData([
    userSays("I'm at 123 Main Street near the gas station")
  ]);
  
  assertExists(result.pickup_address);
  assertEquals(result.pickup_address?.includes("123 Main Street"), true);
});

Deno.test("Dispatch: Address - 'Highway 101 exit 42'", () => {
  const result = extractDispatchData([
    userSays("I'm on Highway 101 near exit 42")
  ]);
  
  assertExists(result.pickup_address);
  const hasHighway = result.pickup_address?.toLowerCase().includes("highway") || 
                     result.pickup_address?.includes("101");
  assertEquals(hasHighway, true);
});

Deno.test("Dispatch: Address - 'Walmart parking lot'", () => {
  const result = extractDispatchData([
    userSays("I'm at the Walmart parking lot on Oak Avenue")
  ]);
  
  assertExists(result.pickup_address);
  assertEquals(result.pickup_address?.toLowerCase().includes("walmart"), true);
});

Deno.test("Dispatch: Address - 'Interstate I-95'", () => {
  const result = extractDispatchData([
    userSays("Stuck on I-95 southbound near mile marker 120")
  ]);
  
  assertExists(result.pickup_address);
  assertEquals(result.pickup_address?.includes("95"), true);
});

Deno.test("Dispatch: Dropoff address", () => {
  const result = extractDispatchData([
    userSays("Can you take it to 456 Oak Street?")
  ]);
  
  assertExists(result.dropoff_address);
  assertEquals(result.dropoff_address?.includes("456 Oak"), true);
});

// ============================================================================
// VEHICLE INFORMATION
// ============================================================================

Deno.test("Dispatch: Vehicle - 'my 2018 Honda Accord'", () => {
  const result = extractDispatchData([
    userSays("It's my 2018 Honda Accord that broke down")
  ]);
  
  assertExists(result.vehicle);
  assertEquals(result.vehicle?.includes("2018"), true);
});

Deno.test("Dispatch: Vehicle - 'blue Toyota truck'", () => {
  const result = extractDispatchData([
    userSays("I have a Toyota truck")
  ]);
  
  assertExists(result.vehicle);
  assertEquals(result.vehicle?.toLowerCase().includes("toyota"), true);
});

Deno.test("Dispatch: Vehicle - 'driving a sedan'", () => {
  const result = extractDispatchData([
    userSays("I'm driving a sedan")
  ]);
  
  assertExists(result.vehicle);
  assertEquals(result.vehicle?.toLowerCase().includes("sedan"), true);
});

// ============================================================================
// DRIVABLE STATUS
// ============================================================================

Deno.test("Dispatch: Drivable - 'won't start' = not drivable", () => {
  const result = extractDispatchData([
    userSays("My car won't start at all")
  ]);
  
  assertEquals(result.is_drivable, false);
});

Deno.test("Dispatch: Drivable - 'can't drive' = not drivable", () => {
  const result = extractDispatchData([
    userSays("I can't drive it, it's making a terrible noise")
  ]);
  
  assertEquals(result.is_drivable, false);
});

Deno.test("Dispatch: Drivable - 'still running' = drivable", () => {
  const result = extractDispatchData([
    userSays("The car is still running but the tire is flat")
  ]);
  
  assertEquals(result.is_drivable, true);
});

Deno.test("Dispatch: Drivable - 'stalled' = not drivable", () => {
  const result = extractDispatchData([
    userSays("My car stalled in the middle of the intersection")
  ]);
  
  assertEquals(result.is_drivable, false);
});

// ============================================================================
// CUSTOMER NAME EXTRACTION
// ============================================================================

Deno.test("Dispatch: Name - 'my name is Robert'", () => {
  const result = extractDispatchData([
    userSays("Hi, my name is Robert")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name, "Robert");
});

Deno.test("Dispatch: Name - 'this is Maria'", () => {
  const result = extractDispatchData([
    userSays("This is Maria, I need a tow")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name, "Maria");
});

// ============================================================================
// COMPLETE DISPATCH SCENARIOS
// ============================================================================

Deno.test("Dispatch: Complete - Highway breakdown", () => {
  const result = extractDispatchData([
    agentSays("ABC Towing, how can we help?"),
    userSays("Hi, my name is Tom. My car broke down on Highway 101 near exit 25"),
    agentSays("What kind of vehicle is it?"),
    userSays("It's a 2020 Ford F-150 truck"),
    agentSays("Is it drivable?"),
    userSays("No, it won't start at all. I need help ASAP, I'm on the side of the road"),
  ]);
  
  assertEquals(result.job_type, "tow");
  assertEquals(result.urgency, "high");
  assertEquals(result.is_drivable, false);
  assertExists(result.customer_name);
  assertExists(result.pickup_address);
  assertExists(result.vehicle);
});

Deno.test("Dispatch: Complete - Lockout in parking lot", () => {
  const result = extractDispatchData([
    agentSays("Thanks for calling, what's the emergency?"),
    userSays("I locked my keys in my car. I'm at the Target parking lot on Main Street"),
    agentSays("What's your name?"),
    userSays("This is Jessica"),
    agentSays("We'll send someone right away"),
    userSays("Great, thank you!"),
  ]);
  
  assertEquals(result.job_type, "lockout");
  assertExists(result.customer_name);
  assertExists(result.pickup_address);
});

Deno.test("Dispatch: Complete - Jump start at home", () => {
  const result = extractDispatchData([
    agentSays("How can we help you today?"),
    userSays("My battery is dead, I need a jump start"),
    agentSays("Where are you located?"),
    userSays("I'm at 789 Elm Street. No rush, whenever you can get here is fine"),
  ]);
  
  assertEquals(result.job_type, "jump_start");
  assertEquals(result.urgency, "low");
  assertExists(result.pickup_address);
});

// ============================================================================
// EDGE CASES
// ============================================================================

Deno.test("Dispatch: Multiple job types mentioned - pick primary", () => {
  const result = extractDispatchData([
    userSays("My car broke down and I'm locked out")
  ]);
  
  // Should pick one job type
  assertExists(result.job_type);
  const validTypes = ["tow", "lockout", "jump_start", "tire_change", "fuel_delivery", "winch_out"];
  assertEquals(validTypes.includes(result.job_type!), true);
});

Deno.test("Dispatch: Vague request", () => {
  const result = extractDispatchData([
    userSays("I need help with my car")
  ]);
  
  // Should still return an object even with vague request
  assertEquals(typeof result, "object");
});

Deno.test("Dispatch: Empty transcript", () => {
  const result = extractDispatchData([]);
  
  assertEquals(typeof result, "object");
  assertEquals(result.job_type, undefined);
});
