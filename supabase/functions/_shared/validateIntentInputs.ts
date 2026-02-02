/**
 * Intent Input Validation
 *
 * This module validates extracted intent data against required questions configuration.
 * Used in extraction layer and AI response generation to ensure data quality.
 */

import { checkRequiredInputs, MissingInput } from "./inputValidators.ts";
import type { RequiredQuestionsConfig } from "./buildBusinessContext.ts";

export interface IntentValidationResult {
  isComplete: boolean;
  missingInputs: MissingInput[];
  nextPrompt?: string;
}

/**
 * Validate extracted intent data against required questions config
 *
 * Returns validation result with missing/invalid fields and suggested prompt
 *
 * @param intent - The intent type (booking, dispatch, order, etc.)
 * @param extractedData - Data extracted from conversation
 * @param requiredQuestionsConfigs - Array of required questions configurations
 * @returns Validation result with missing inputs and next prompt
 */
export function validateIntentInputs(
  intent: string,
  extractedData: Record<string, any>,
  requiredQuestionsConfigs: RequiredQuestionsConfig[]
): IntentValidationResult {
  // Find config for this intent
  const config = requiredQuestionsConfigs.find(c => c.intent === intent);

  if (!config) {
    // No required questions configured for this intent
    return {
      isComplete: true,
      missingInputs: []
    };
  }

  // Check required inputs
  const missingInputs = checkRequiredInputs(
    config.required_inputs,
    extractedData
  );

  if (missingInputs.length === 0) {
    return {
      isComplete: true,
      missingInputs: []
    };
  }

  // Generate next prompt based on first missing/invalid field
  const firstMissing = missingInputs[0];
  const nextPrompt = generateReAskPrompt(firstMissing);

  return {
    isComplete: false,
    missingInputs,
    nextPrompt
  };
}

/**
 * Generate a re-ask prompt based on missing/invalid input
 *
 * This provides specific guidance based on the validation failure
 */
function generateReAskPrompt(missing: MissingInput): string {
  const isInvalid = missing.reason !== "Not provided";

  if (isInvalid) {
    // Field was provided but invalid - give specific guidance
    return generateValidationGuidance(missing);
  }

  // Field not provided - use original ask_prompt
  return missing.ask_prompt;
}

/**
 * Generate validation-specific guidance for re-asking
 */
function generateValidationGuidance(missing: MissingInput): string {
  const key = missing.key.toLowerCase();

  // Address fields
  if (key.includes('address')) {
    return `I need a more specific address with a street number and city (like "123 Main Street, Chicago") or nearest cross streets (like "Main & Oak in Springfield"). ${missing.ask_prompt}`;
  }

  // Date fields
  if (key.includes('date')) {
    return `I need a specific date like "tomorrow", "December 25th", or "next Monday". ${missing.ask_prompt}`;
  }

  // Time fields
  if (key.includes('time')) {
    return `I need a specific time like "2pm", "morning", or "around 3:00". ${missing.ask_prompt}`;
  }

  // Miles/distance
  if (key.includes('miles')) {
    return `I need an estimated distance in miles, like "5 miles" or "about 10". ${missing.ask_prompt}`;
  }

  // Party size
  if (key === 'party_size') {
    return `I need a specific number of people, like "2" or "party of 4". ${missing.ask_prompt}`;
  }

  // Phone
  if (key.includes('phone')) {
    return `I need a complete phone number with area code, like "555-123-4567". ${missing.ask_prompt}`;
  }

  // Email
  if (key.includes('email')) {
    return `I need a valid email address like "yourname@example.com". ${missing.ask_prompt}`;
  }

  // Generic fallback
  return `${missing.reason}. ${missing.ask_prompt}`;
}

/**
 * Build AI instruction for missing/invalid inputs
 *
 * This can be injected into the AI's system prompt during a conversation
 * to tell it what to ask next
 */
export function buildMissingInputsInstruction(validation: IntentValidationResult): string {
  if (validation.isComplete) {
    return "";
  }

  const count = validation.missingInputs.length;
  const firstMissing = validation.missingInputs[0];

  let instruction = `IMPORTANT: You are missing ${count} required input${count > 1 ? 's' : ''} before you can provide pricing or complete this request.\n\n`;
  instruction += `NEXT REQUIRED INPUT:\n`;
  instruction += `- Field: ${firstMissing.label}\n`;
  instruction += `- Status: ${firstMissing.reason}\n`;
  instruction += `- Ask: "${validation.nextPrompt}"\n\n`;

  if (count > 1) {
    instruction += `REMAINING REQUIRED INPUTS (ask after getting the above):\n`;
    for (let i = 1; i < validation.missingInputs.length; i++) {
      const missing = validation.missingInputs[i];
      instruction += `- ${missing.label}: ${missing.ask_prompt}\n`;
    }
    instruction += `\n`;
  }

  instruction += `Do NOT provide pricing, ETA, or booking confirmation until all required inputs are collected AND validated.`;

  return instruction;
}

/**
 * Example usage in extraction workflow:
 *
 * ```typescript
 * // After extracting data from conversation
 * const extractedData = {
 *   customer_name: "John Smith",
 *   customer_phone: "555-1234",
 *   pickup_address: "downtown", // INVALID - too vague
 *   dropoff_address: "123 Oak St, Chicago" // VALID
 * };
 *
 * // Validate against required questions config
 * const validation = validateIntentInputs(
 *   "dispatch",
 *   extractedData,
 *   requiredQuestionsConfigs
 * );
 *
 * if (!validation.isComplete) {
 *   // Inject missing inputs instruction into AI prompt
 *   const instruction = buildMissingInputsInstruction(validation);
 *   console.log(instruction);
 *   // Output:
 *   // "IMPORTANT: You are missing 1 required input before you can provide pricing...
 *   //  NEXT REQUIRED INPUT:
 *   //  - Field: Pickup Address (Exact)
 *   //  - Status: Address must include a street number OR cross streets
 *   //  - Ask: "I need a more specific address with a street number and city..."
 * }
 * ```
 */
