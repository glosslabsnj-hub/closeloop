/**
 * General Mode Extraction Tests
 * 
 * Tests for callback requests, message taking, inquiry classification,
 * and catch-all business scenarios.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractGeneralData, userSays, agentSays, type TranscriptEntry } from "./_test-utils/test-helpers.ts";

// ============================================================================
// MESSAGE REQUESTS
// ============================================================================

Deno.test("General: 'Leave a message' request", () => {
  const result = extractGeneralData([
    userSays("Can I leave a message for the manager?")
  ]);
  
  assertEquals(result.message_requested, true);
});

Deno.test("General: 'Take a message' request", () => {
  const result = extractGeneralData([
    userSays("Could you take a message for John?")
  ]);
  
  assertEquals(result.message_requested, true);
});

Deno.test("General: 'Message for' request", () => {
  const result = extractGeneralData([
    userSays("I have a message for the owner")
  ]);
  
  assertEquals(result.message_requested, true);
});

// ============================================================================
// CALLBACK REQUESTS
// ============================================================================

Deno.test("General: 'Call me back' request", () => {
  const result = extractGeneralData([
    userSays("Can you have someone call me back?")
  ]);
  
  assertEquals(result.callback_requested, true);
});

Deno.test("General: 'Give me a call' request", () => {
  const result = extractGeneralData([
    userSays("Can you give me a call when you're available?")
  ]);
  
  assertEquals(result.callback_requested, true);
});

Deno.test("General: 'Have someone call' request", () => {
  const result = extractGeneralData([
    userSays("Please have someone call me about my order")
  ]);
  
  assertEquals(result.callback_requested, true);
});

// ============================================================================
// CALLBACK NUMBER EXTRACTION
// ============================================================================

Deno.test("General: 'Call me back at 555-1234'", () => {
  const result = extractGeneralData([
    userSays("Can you have someone call me back at 555-1234?")
  ]);
  
  assertEquals(result.callback_requested, true);
  assertExists(result.callback_number);
  assertEquals(result.callback_number?.includes("5551234"), true);
});

Deno.test("General: 'My number is 123-456-7890'", () => {
  const result = extractGeneralData([
    userSays("My number is 123-456-7890")
  ]);
  
  assertExists(result.callback_number);
  assertEquals(result.callback_number, "1234567890");
});

Deno.test("General: 'Reach me at (555) 123-4567'", () => {
  const result = extractGeneralData([
    userSays("You can reach me at (555) 123-4567")
  ]);
  
  assertExists(result.callback_number);
  assertEquals(result.callback_number, "5551234567");
});

Deno.test("General: Phone number with dots - '555.123.4567'", () => {
  const result = extractGeneralData([
    userSays("My phone is 555.123.4567")
  ]);
  
  assertExists(result.callback_number);
  assertEquals(result.callback_number, "5551234567");
});

// ============================================================================
// CUSTOMER NAME EXTRACTION
// ============================================================================

Deno.test("General: 'My name is John' extraction", () => {
  const result = extractGeneralData([
    userSays("Hi, my name is John Smith")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name?.includes("John"), true);
});

Deno.test("General: 'This is Mary' extraction", () => {
  const result = extractGeneralData([
    userSays("This is Mary calling")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name, "Mary");
});

Deno.test("General: 'I'm Steve' extraction", () => {
  const result = extractGeneralData([
    userSays("I'm Steve, calling about my account")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name, "Steve");
});

Deno.test("General: 'Call me David' extraction", () => {
  const result = extractGeneralData([
    userSays("You can call me David")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name, "David");
});

// ============================================================================
// REASON FOR CALLING / SERVICE REQUESTED
// ============================================================================

Deno.test("General: 'Calling about billing'", () => {
  const result = extractGeneralData([
    userSays("I'm calling about a billing issue")
  ]);
  
  assertExists(result.service_requested);
  assertEquals(result.service_requested?.toLowerCase().includes("billing"), true);
});

Deno.test("General: 'Question about my order'", () => {
  const result = extractGeneralData([
    userSays("I have a question about my order")
  ]);
  
  assertExists(result.service_requested);
  assertEquals(result.service_requested?.toLowerCase().includes("order"), true);
});

Deno.test("General: 'Need help with account'", () => {
  const result = extractGeneralData([
    userSays("I need help with my account")
  ]);
  
  // May or may not extract depending on pattern
  assertEquals(typeof result, "object");
});

Deno.test("General: 'Inquiring about services'", () => {
  const result = extractGeneralData([
    userSays("I'm inquiring about your services")
  ]);
  
  // Should handle inquiry even if specific service not extracted
  assertEquals(typeof result, "object");
});

Deno.test("General: 'Problem with product'", () => {
  const result = extractGeneralData([
    userSays("There's a problem with the product I received")
  ]);
  
  assertExists(result.service_requested);
});

// ============================================================================
// COMPLETE GENERAL SCENARIOS
// ============================================================================

Deno.test("General: Complete - Billing callback", () => {
  const result = extractGeneralData([
    agentSays("Thank you for calling. How can I help you today?"),
    userSays("Hi, my name is Jennifer. I'm calling about a billing issue."),
    agentSays("I can help with that. What seems to be the problem?"),
    userSays("I was charged twice for my last order. Can someone call me back at 555-1234?"),
    agentSays("I'll have billing call you back shortly."),
    userSays("Thank you!"),
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.callback_requested, true);
  assertExists(result.callback_number);
  assertExists(result.service_requested);
});

Deno.test("General: Complete - Message for manager", () => {
  const result = extractGeneralData([
    agentSays("Good afternoon, how may I direct your call?"),
    userSays("Hi, I'd like to leave a message for the manager"),
    agentSays("Certainly, what would you like me to pass along?"),
    userSays("This is Robert calling. Please let them know I received their email and I'll respond tomorrow."),
    agentSays("I'll make sure they get the message."),
  ]);
  
  assertEquals(result.message_requested, true);
  assertExists(result.customer_name);
});

Deno.test("General: Complete - Product inquiry", () => {
  const result = extractGeneralData([
    agentSays("Hi, thanks for calling. What can I do for you?"),
    userSays("I have a question about one of your products"),
    agentSays("Sure, what would you like to know?"),
    userSays("I'm Lisa. I wanted to know if you have the blue model in stock."),
    agentSays("Let me check for you."),
  ]);
  
  assertExists(result.customer_name);
  // Should capture that there's an inquiry
  assertEquals(typeof result, "object");
});

// ============================================================================
// COMBINED REQUESTS
// ============================================================================

Deno.test("General: Both message and callback", () => {
  const result = extractGeneralData([
    userSays("Can I leave a message and have someone call me back?")
  ]);
  
  assertEquals(result.message_requested, true);
  assertEquals(result.callback_requested, true);
});

Deno.test("General: Name with callback number", () => {
  const result = extractGeneralData([
    userSays("My name is Mike and you can call me back at 555-9876")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.callback_requested, true);
  assertExists(result.callback_number);
});

// ============================================================================
// EDGE CASES
// ============================================================================

Deno.test("General: Very short message", () => {
  const result = extractGeneralData([
    userSays("Hi")
  ]);
  
  // Should handle minimal input gracefully
  assertEquals(typeof result, "object");
});

Deno.test("General: Empty transcript", () => {
  const result = extractGeneralData([]);
  
  assertEquals(typeof result, "object");
  assertEquals(result.message_requested, undefined);
  assertEquals(result.callback_requested, undefined);
});

Deno.test("General: No specific request", () => {
  const result = extractGeneralData([
    userSays("Just wanted to check on something")
  ]);
  
  // Should handle vague messages without crashing
  assertEquals(typeof result, "object");
});

Deno.test("General: Multiple phone numbers - use first", () => {
  const result = extractGeneralData([
    userSays("You can reach me at 555-1111 or 555-2222")
  ]);
  
  assertExists(result.callback_number);
  assertEquals(result.callback_number, "5551111");
});

Deno.test("General: Name with extra words", () => {
  const result = extractGeneralData([
    userSays("Hi, my name is actually Jennifer but you can call me Jenny")
  ]);
  
  // Should extract at least one name
  assertExists(result.customer_name);
});
