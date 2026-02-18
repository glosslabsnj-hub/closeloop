/**
 * Service Mode Extraction Tests
 * 
 * Tests for appointment booking, service types, date/time extraction,
 * callback requests, and vehicle information for service businesses.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractServiceData, userSays, agentSays, type TranscriptEntry } from "./_test-utils/test-helpers.ts";

// ============================================================================
// SERVICE TYPE EXTRACTION
// ============================================================================

Deno.test("Service: 'I need a haircut appointment'", () => {
  const result = extractServiceData([
    userSays("I need a haircut appointment for tomorrow")
  ]);
  
  assertExists(result.service_requested);
  assertEquals(result.service_requested?.toLowerCase().includes("haircut"), true);
});

Deno.test("Service: 'Schedule oil change for my Honda'", () => {
  const result = extractServiceData([
    userSays("Can I schedule an oil change for my Honda Civic?")
  ]);
  
  assertExists(result.service_requested);
  assertEquals(result.service_requested?.toLowerCase().includes("oil change"), true);
  assertExists(result.vehicle);
});

Deno.test("Service: 'Book a car detail'", () => {
  const result = extractServiceData([
    userSays("I'd like to book a car detail")
  ]);
  
  assertExists(result.service_requested);
  assertEquals(result.service_requested?.toLowerCase().includes("detail"), true);
});

Deno.test("Service: 'Need AC repair'", () => {
  const result = extractServiceData([
    userSays("I need AC repair service")
  ]);
  
  assertExists(result.service_requested);
  assertEquals(result.service_requested?.toLowerCase().includes("repair"), true);
});

Deno.test("Service: 'Want a cleaning service'", () => {
  const result = extractServiceData([
    userSays("I want a cleaning service for my house")
  ]);
  
  assertExists(result.service_requested);
  assertEquals(result.service_requested?.toLowerCase().includes("cleaning"), true);
});

Deno.test("Service: 'Looking for tire rotation'", () => {
  const result = extractServiceData([
    userSays("I'm looking for a tire rotation appointment")
  ]);
  
  assertExists(result.service_requested);
  assertEquals(result.service_requested?.toLowerCase().includes("tire rotation"), true);
});

// ============================================================================
// DATE/TIME EXTRACTION
// ============================================================================

Deno.test("Service: Date - 'next Tuesday'", () => {
  const result = extractServiceData([
    userSays("I'd like to come in next Tuesday")
  ]);
  
  assertExists(result.preferred_date);
  assertEquals(result.preferred_date?.toLowerCase(), "tuesday");
});

Deno.test("Service: Date - 'tomorrow'", () => {
  const result = extractServiceData([
    userSays("Can I come in tomorrow?")
  ]);
  
  assertExists(result.preferred_date);
  assertEquals(result.preferred_date?.toLowerCase(), "tomorrow");
});

Deno.test("Service: Date - 'this Friday'", () => {
  const result = extractServiceData([
    userSays("Is this Friday available?")
  ]);
  
  assertExists(result.preferred_date);
  assertEquals(result.preferred_date?.toLowerCase(), "friday");
});

Deno.test("Service: Time - 'at 2pm'", () => {
  const result = extractServiceData([
    userSays("I'd like to come in at 2pm")
  ]);
  
  assertExists(result.preferred_time);
  assertEquals(result.preferred_time?.toLowerCase().includes("2"), true);
});

Deno.test("Service: Time - 'around 10:30'", () => {
  const result = extractServiceData([
    userSays("Can I come around 10:30 in the morning?")
  ]);
  
  assertExists(result.preferred_time);
  assertEquals(result.preferred_time?.includes("10:30"), true);
});

Deno.test("Service: Combined date and time - 'Tuesday at 3pm'", () => {
  const result = extractServiceData([
    userSays("I'd like to schedule for next Tuesday at 3pm")
  ]);
  
  assertExists(result.preferred_date);
  assertExists(result.preferred_time);
  assertEquals(result.preferred_date?.toLowerCase(), "tuesday");
  assertEquals(result.preferred_time?.toLowerCase().includes("3"), true);
});

// ============================================================================
// CALLBACK REQUESTS
// ============================================================================

Deno.test("Service: Callback - 'call me back'", () => {
  const result = extractServiceData([
    userSays("Can someone call me back about pricing?")
  ]);
  
  assertEquals(result.callback_requested, true);
});

Deno.test("Service: Callback - 'give me a call'", () => {
  const result = extractServiceData([
    userSays("Can you give me a call when you have availability?")
  ]);
  
  assertEquals(result.callback_requested, true);
});

Deno.test("Service: No callback when not mentioned", () => {
  const result = extractServiceData([
    userSays("I want to schedule an appointment")
  ]);
  
  assertEquals(result.callback_requested, undefined);
});

// ============================================================================
// VEHICLE INFORMATION
// ============================================================================

Deno.test("Service: Vehicle - 'my Honda Civic'", () => {
  const result = extractServiceData([
    userSays("I need an oil change for my Honda Civic")
  ]);
  
  assertExists(result.vehicle);
  assertEquals(result.vehicle?.toLowerCase().includes("honda"), true);
});

Deno.test("Service: Vehicle - 'have a 2020 Toyota'", () => {
  const result = extractServiceData([
    userSays("I have a 2020 Toyota Camry")
  ]);
  
  assertExists(result.vehicle);
  assertEquals(result.vehicle?.toLowerCase().includes("toyota"), true);
});

Deno.test("Service: Vehicle - 'for my Ford truck'", () => {
  const result = extractServiceData([
    userSays("Need brake service for my Ford truck")
  ]);
  
  assertExists(result.vehicle);
  assertEquals(result.vehicle?.toLowerCase().includes("ford"), true);
});

// ============================================================================
// CUSTOMER NAME EXTRACTION
// ============================================================================

Deno.test("Service: Name - 'my name is John'", () => {
  const result = extractServiceData([
    userSays("Hi, my name is John")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name, "John");
});

Deno.test("Service: Name - 'this is Sarah Smith'", () => {
  const result = extractServiceData([
    userSays("This is Sarah Smith calling about an appointment")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name?.includes("Sarah"), true);
});

Deno.test("Service: Name - 'I'm Mike'", () => {
  const result = extractServiceData([
    userSays("I'm Mike, calling to schedule a service")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name, "Mike");
});

// ============================================================================
// ADDRESS EXTRACTION
// ============================================================================

Deno.test("Service: Address - 'at 123 Main Street'", () => {
  const result = extractServiceData([
    userSays("The property is at 123 Main Street")
  ]);
  
  assertExists(result.address);
  assertEquals(result.address?.includes("123 Main Street"), true);
});

Deno.test("Service: Address - 'located at 456 Oak Avenue'", () => {
  const result = extractServiceData([
    userSays("We're located at 456 Oak Avenue")
  ]);
  
  assertExists(result.address);
  assertEquals(result.address?.includes("456 Oak"), true);
});

// ============================================================================
// COMPLETE BOOKING SCENARIOS
// ============================================================================

Deno.test("Service: Complete - Auto repair booking", () => {
  const result = extractServiceData([
    agentSays("Hi, how can I help you today?"),
    userSays("Hi, my name is David. I need to schedule a brake service for my 2019 Honda Accord"),
    agentSays("Sure, when would you like to come in?"),
    userSays("How about next Tuesday at 9am?"),
    agentSays("We have that slot available. Can I confirm your phone number?"),
    userSays("Yes, it's 555-1234"),
  ]);
  
  assertExists(result.customer_name);
  assertExists(result.service_requested);
  assertExists(result.preferred_date);
  assertExists(result.preferred_time);
  assertExists(result.vehicle);
});

Deno.test("Service: Complete - Salon appointment", () => {
  const result = extractServiceData([
    agentSays("Welcome to the salon, how can I help?"),
    userSays("I'm Lisa and I'd like to schedule a haircut and color"),
    agentSays("When works for you?"),
    userSays("This Saturday around 2pm would be great"),
  ]);
  
  assertExists(result.customer_name);
  assertExists(result.service_requested);
  assertExists(result.preferred_date);
  assertExists(result.preferred_time);
});

Deno.test("Service: Complete - Home cleaning callback", () => {
  const result = extractServiceData([
    agentSays("Thanks for calling ABC Cleaning"),
    userSays("Hi, I need a cleaning service for my home. Can someone call me back to discuss pricing?"),
    agentSays("Absolutely, we'll give you a call back."),
    userSays("Great, my name is Jennifer"),
  ]);
  
  assertExists(result.customer_name);
  assertExists(result.service_requested);
  assertEquals(result.callback_requested, true);
});

// ============================================================================
// EDGE CASES
// ============================================================================

Deno.test("Service: Multiple services mentioned - pick first", () => {
  const result = extractServiceData([
    userSays("I need an oil change and maybe a tire rotation too")
  ]);
  
  assertExists(result.service_requested);
  // Should capture at least one service
  const hasService = result.service_requested?.toLowerCase().includes("oil change") || 
                     result.service_requested?.toLowerCase().includes("tire");
  assertEquals(hasService, true);
});

Deno.test("Service: Vague request", () => {
  const result = extractServiceData([
    userSays("I just need some help with my car")
  ]);
  
  // May or may not extract service, but shouldn't crash
  assertEquals(typeof result, "object");
});

Deno.test("Service: Empty transcript", () => {
  const result = extractServiceData([]);
  
  assertEquals(typeof result, "object");
  assertEquals(result.service_requested, undefined);
});
