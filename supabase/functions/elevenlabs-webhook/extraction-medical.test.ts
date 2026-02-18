/**
 * Medical Mode Extraction Tests
 * 
 * Tests for HIPAA-aware extraction: new patient detection, appointment types,
 * urgency levels, and verification that PHI is NOT stored.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractMedicalData, userSays, agentSays, type TranscriptEntry } from "./_test-utils/test-helpers.ts";

// ============================================================================
// NEW PATIENT DETECTION
// ============================================================================

Deno.test("Medical: 'I'm a new patient' = true", () => {
  const result = extractMedicalData([
    userSays("Hi, I'm a new patient looking to schedule a checkup")
  ]);
  
  assertEquals(result.is_new_patient, true);
});

Deno.test("Medical: 'first time' = new patient", () => {
  const result = extractMedicalData([
    userSays("This is my first time calling your office")
  ]);
  
  assertEquals(result.is_new_patient, true);
});

Deno.test("Medical: 'never been' = new patient", () => {
  const result = extractMedicalData([
    userSays("I've never been to this practice before")
  ]);
  
  assertEquals(result.is_new_patient, true);
});

Deno.test("Medical: 'new to the area' = new patient", () => {
  const result = extractMedicalData([
    userSays("I'm new to the area and need to find a doctor")
  ]);
  
  assertEquals(result.is_new_patient, true);
});

Deno.test("Medical: 'existing patient' = not new", () => {
  const result = extractMedicalData([
    userSays("I'm an existing patient, calling for a follow-up")
  ]);
  
  assertEquals(result.is_new_patient, false);
});

Deno.test("Medical: 'been before' = returning patient", () => {
  const result = extractMedicalData([
    userSays("I've been to see Dr. Smith before")
  ]);
  
  assertEquals(result.is_new_patient, false);
});

Deno.test("Medical: 'follow up' = returning patient", () => {
  const result = extractMedicalData([
    userSays("I need to schedule a follow-up appointment")
  ]);
  
  assertEquals(result.is_new_patient, false);
});

// ============================================================================
// APPOINTMENT TYPE EXTRACTION
// ============================================================================

Deno.test("Medical: 'annual physical' appointment type", () => {
  const result = extractMedicalData([
    userSays("I need to schedule my annual physical")
  ]);
  
  assertExists(result.appointment_type);
  assertEquals(result.appointment_type?.toLowerCase().includes("physical"), true);
});

Deno.test("Medical: 'checkup' appointment type", () => {
  const result = extractMedicalData([
    userSays("I want to schedule a checkup")
  ]);
  
  assertExists(result.appointment_type);
  assertEquals(result.appointment_type?.toLowerCase().includes("checkup"), true);
});

Deno.test("Medical: 'wellness visit' appointment type", () => {
  const result = extractMedicalData([
    userSays("I'd like to book a wellness visit")
  ]);
  
  assertExists(result.appointment_type);
  assertEquals(result.appointment_type?.toLowerCase().includes("wellness"), true);
});

Deno.test("Medical: 'consultation' appointment type", () => {
  const result = extractMedicalData([
    userSays("I need a consultation with the doctor")
  ]);
  
  assertExists(result.appointment_type);
  assertEquals(result.appointment_type?.toLowerCase().includes("consultation"), true);
});

Deno.test("Medical: 'follow-up' appointment type", () => {
  const result = extractMedicalData([
    userSays("I need to schedule a follow-up appointment")
  ]);
  
  assertExists(result.appointment_type);
  assertEquals(result.appointment_type?.toLowerCase().includes("follow"), true);
});

Deno.test("Medical: 'routine exam' appointment type", () => {
  const result = extractMedicalData([
    userSays("I want to schedule a routine exam")
  ]);
  
  assertExists(result.appointment_type);
  assertEquals(result.appointment_type?.toLowerCase().includes("routine"), true);
});

// ============================================================================
// PREFERRED DATE EXTRACTION
// ============================================================================

Deno.test("Medical: 'next week' date preference", () => {
  const result = extractMedicalData([
    userSays("Do you have anything available next week?")
  ]);
  
  assertExists(result.preferred_date);
  assertEquals(result.preferred_date?.toLowerCase(), "week");
});

Deno.test("Medical: 'this Friday' date preference", () => {
  const result = extractMedicalData([
    userSays("Is this Friday available?")
  ]);
  
  assertExists(result.preferred_date);
  assertEquals(result.preferred_date?.toLowerCase(), "friday");
});

Deno.test("Medical: 'next Monday' date preference", () => {
  const result = extractMedicalData([
    userSays("Can I come in next Monday?")
  ]);
  
  assertExists(result.preferred_date);
  assertEquals(result.preferred_date?.toLowerCase(), "monday");
});

// ============================================================================
// URGENCY DETECTION (based on request language, NOT symptoms)
// ============================================================================

Deno.test("Medical: Urgency - 'ASAP' = urgent", () => {
  const result = extractMedicalData([
    userSays("I need to see the doctor ASAP")
  ]);
  
  assertEquals(result.urgency, "urgent");
});

Deno.test("Medical: Urgency - 'as soon as possible' = urgent", () => {
  const result = extractMedicalData([
    userSays("Is there an appointment available as soon as possible?")
  ]);
  
  assertEquals(result.urgency, "urgent");
});

Deno.test("Medical: Urgency - 'today if possible' = urgent", () => {
  const result = extractMedicalData([
    userSays("I really need to come in today if possible")
  ]);
  
  assertEquals(result.urgency, "urgent");
});

Deno.test("Medical: Urgency - 'urgent' keyword = urgent", () => {
  const result = extractMedicalData([
    userSays("This is quite urgent")
  ]);
  
  assertEquals(result.urgency, "urgent");
});

Deno.test("Medical: Urgency - normal request", () => {
  const result = extractMedicalData([
    userSays("I'd like to schedule my annual physical")
  ]);
  
  // Should NOT be urgent for routine requests
  assertEquals(result.urgency, undefined);
});

// ============================================================================
// CALLBACK REQUESTS
// ============================================================================

Deno.test("Medical: Callback - 'call me back'", () => {
  const result = extractMedicalData([
    userSays("Can someone call me back about my appointment?")
  ]);
  
  assertEquals(result.callback_requested, true);
});

Deno.test("Medical: Callback - 'have someone call'", () => {
  const result = extractMedicalData([
    userSays("Can you have someone call me with availability?")
  ]);
  
  assertEquals(result.callback_requested, true);
});

// ============================================================================
// CUSTOMER NAME EXTRACTION
// ============================================================================

Deno.test("Medical: Name - 'my name is Patricia'", () => {
  const result = extractMedicalData([
    userSays("Hi, my name is Patricia Johnson")
  ]);
  
  assertExists(result.customer_name);
  assertEquals(result.customer_name?.includes("Patricia"), true);
});

// ============================================================================
// HIPAA COMPLIANCE: NO PHI STORAGE
// ============================================================================

Deno.test("Medical: NO PHI - symptoms not stored", () => {
  const result = extractMedicalData([
    userSays("I've been having chest pains and shortness of breath")
  ]);
  
  // Should NOT store symptoms (PHI)
  assertEquals(result.symptoms, undefined);
  assertEquals(result.medical_details, undefined);
});

Deno.test("Medical: NO PHI - conditions not stored", () => {
  const result = extractMedicalData([
    userSays("I have diabetes and high blood pressure")
  ]);
  
  // Should NOT store medical conditions (PHI)
  assertEquals(result.symptoms, undefined);
  assertEquals(result.medical_details, undefined);
});

Deno.test("Medical: NO PHI - medications not stored", () => {
  const result = extractMedicalData([
    userSays("I'm currently taking metformin and lisinopril")
  ]);
  
  // Should NOT store medication info (PHI)
  assertEquals(result.symptoms, undefined);
  assertEquals(result.medical_details, undefined);
});

Deno.test("Medical: NO PHI - detailed symptom description not stored", () => {
  const result = extractMedicalData([
    userSays("I have severe pain in my abdomen that started yesterday. It's a sharp pain that comes and goes.")
  ]);
  
  // Should NOT store symptom details (PHI)
  assertEquals(result.symptoms, undefined);
  assertEquals(result.medical_details, undefined);
  
  // May detect urgency from "severe pain" but shouldn't store the details
  // The urgency field is allowed as it's classification, not PHI
});

Deno.test("Medical: NO PHI - family history not stored", () => {
  const result = extractMedicalData([
    userSays("My mother had breast cancer and my father has heart disease")
  ]);
  
  // Should NOT store family medical history (PHI)
  assertEquals(result.symptoms, undefined);
  assertEquals(result.medical_details, undefined);
});

// ============================================================================
// COMPLETE MEDICAL SCENARIOS
// ============================================================================

Deno.test("Medical: Complete - New patient scheduling", () => {
  const result = extractMedicalData([
    agentSays("Thank you for calling Dr. Smith's office. How can I help you?"),
    userSays("Hi, I'm a new patient and I'd like to schedule an annual physical"),
    agentSays("Welcome! When would you like to come in?"),
    userSays("Do you have anything available next week?"),
    agentSays("We have Tuesday at 10am. Can I get your name?"),
    userSays("Yes, my name is Jennifer Williams"),
  ]);
  
  assertEquals(result.is_new_patient, true);
  assertExists(result.appointment_type);
  assertExists(result.preferred_date);
  assertExists(result.customer_name);
  // Should NOT have any PHI
  assertEquals(result.symptoms, undefined);
  assertEquals(result.medical_details, undefined);
});

Deno.test("Medical: Complete - Urgent request (no PHI stored)", () => {
  const result = extractMedicalData([
    agentSays("Medical office, how can I help?"),
    userSays("I need to see the doctor ASAP. I've been feeling very unwell."),
    agentSays("I understand. Let me check our earliest availability."),
    userSays("Thank you, my name is Robert"),
  ]);
  
  assertEquals(result.urgency, "urgent");
  assertExists(result.customer_name);
  // Should NOT have any PHI even though patient mentioned feeling unwell
  assertEquals(result.symptoms, undefined);
  assertEquals(result.medical_details, undefined);
});

Deno.test("Medical: Complete - Follow-up appointment", () => {
  const result = extractMedicalData([
    agentSays("Dr. Johnson's office, how may I assist you?"),
    userSays("Hi, I'm an existing patient. I need to schedule a follow-up appointment."),
    agentSays("Certainly. What day works for you?"),
    userSays("This Thursday if possible. My name is Michael Chen."),
  ]);
  
  assertEquals(result.is_new_patient, false);
  assertExists(result.appointment_type);
  assertExists(result.preferred_date);
  assertExists(result.customer_name);
});

// ============================================================================
// EDGE CASES
// ============================================================================

Deno.test("Medical: Patient status unknown", () => {
  const result = extractMedicalData([
    userSays("I need to schedule an appointment")
  ]);
  
  // Should not assume new or existing if not specified
  assertEquals(result.is_new_patient, undefined);
});

Deno.test("Medical: Empty transcript", () => {
  const result = extractMedicalData([]);
  
  assertEquals(typeof result, "object");
  assertEquals(result.is_new_patient, undefined);
  assertEquals(result.symptoms, undefined);
});

Deno.test("Medical: Vague request", () => {
  const result = extractMedicalData([
    userSays("Can I talk to someone about my health?")
  ]);
  
  // Should handle vague requests without storing PHI
  assertEquals(typeof result, "object");
  assertEquals(result.symptoms, undefined);
  assertEquals(result.medical_details, undefined);
});
