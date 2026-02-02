/**
 * Input Validators for Required Questions
 *
 * These validators enforce data quality beyond just "non-empty".
 * Each validator returns { valid: boolean, reason?: string }
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Address Validator - For dispatch pickup/dropoff
 *
 * Requirements:
 * - Must include street number OR cross streets (indicated by "&", "and", "corner of", "x")
 * - Must include city OR ZIP code
 *
 * Valid examples:
 * - "123 Main Street, Chicago"
 * - "123 Main St, 60601"
 * - "Corner of Main and Oak, Springfield"
 * - "Main & 5th, 62701"
 * - "Exit 42 on I-94, Detroit"
 *
 * Invalid examples:
 * - "downtown" (no specificity)
 * - "Main Street" (no number or cross street)
 * - "123 Main" (no city or ZIP)
 */
export function validateAddress(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, reason: "Address cannot be empty" };
  }

  const normalized = value.toLowerCase().trim();

  // Check for cross streets indicators
  const hasCrossStreets = /(&|and|corner of|\sx\s|intersection)/i.test(normalized);

  // Check for street number (1-5 digits at start or after common prefixes)
  const hasStreetNumber = /^\d{1,5}\s|^#\d{1,5}|\s\d{1,5}\s/.test(value);

  // Check for exit/mile marker (common on highways)
  const hasExitOrMarker = /exit\s+\d+|mile\s+marker\s+\d+|mm\s+\d+/i.test(normalized);

  // Must have street number, cross streets, or exit/marker
  if (!hasStreetNumber && !hasCrossStreets && !hasExitOrMarker) {
    return {
      valid: false,
      reason: "Address must include a street number (e.g., '123 Main St') OR cross streets (e.g., 'Main & Oak') OR exit number (e.g., 'Exit 42 on I-94')"
    };
  }

  // Check for city name (2+ letters, common city patterns)
  const hasCity = /,\s*[a-z]{2,}(?:\s+[a-z]+)*(?:\s*,|\s*$)/i.test(value) ||
                  /\s(?:in|near)\s+[a-z]{2,}/i.test(normalized);

  // Check for ZIP code (5 digits or 5+4 format)
  const hasZip = /\b\d{5}(?:-\d{4})?\b/.test(value);

  // Must have city or ZIP
  if (!hasCity && !hasZip) {
    return {
      valid: false,
      reason: "Address must include a city (e.g., 'Chicago', 'in Springfield') OR ZIP code (e.g., '60601')"
    };
  }

  return { valid: true };
}

/**
 * Date Validator
 *
 * Accepts various date formats:
 * - "tomorrow", "today", "next Monday"
 * - "12/25", "12/25/2024", "Dec 25", "December 25th"
 * - ISO format "2024-12-25"
 *
 * Invalid:
 * - "soon", "later", "sometime" (too vague)
 */
export function validateDate(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, reason: "Date cannot be empty" };
  }

  const normalized = value.toLowerCase().trim();

  // Relative dates (acceptable)
  const relativePatterns = /^(today|tomorrow|next\s+\w+|this\s+\w+|in\s+\d+\s+days?)$/i;
  if (relativePatterns.test(normalized)) {
    return { valid: true };
  }

  // Too vague
  const vaguePatterns = /^(soon|later|sometime|eventually|whenever)$/i;
  if (vaguePatterns.test(normalized)) {
    return {
      valid: false,
      reason: "Please provide a specific date like 'tomorrow', 'December 25th', or '12/25'"
    };
  }

  // Numeric date formats
  const numericDate = /\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/;
  if (numericDate.test(value)) {
    return { valid: true };
  }

  // Month name formats
  const monthNameDate = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?/i;
  if (monthNameDate.test(normalized)) {
    return { valid: true };
  }

  // ISO format
  const isoDate = /\d{4}-\d{2}-\d{2}/;
  if (isoDate.test(value)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "Please provide a specific date like 'tomorrow', 'December 25th', or '12/25'"
  };
}

/**
 * Time Validator
 *
 * Accepts:
 * - "2pm", "2:30pm", "14:30"
 * - "morning", "afternoon", "evening" (general)
 * - "around 2pm", "before 3pm"
 *
 * Invalid:
 * - "later", "sometime" (too vague)
 */
export function validateTime(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, reason: "Time cannot be empty" };
  }

  const normalized = value.toLowerCase().trim();

  // Too vague
  const vaguePatterns = /^(later|sometime|eventually|whenever|asap)$/i;
  if (vaguePatterns.test(normalized)) {
    return {
      valid: false,
      reason: "Please provide a specific time like '2pm', 'morning', or 'around 3:00'"
    };
  }

  // Specific times (12/24 hour)
  const specificTime = /\d{1,2}(?::\d{2})?\s*(?:am|pm)?|(?:around|before|after|by)\s+\d{1,2}/i;
  if (specificTime.test(normalized)) {
    return { valid: true };
  }

  // General time of day (acceptable for initial booking)
  const generalTime = /^(morning|afternoon|evening|night|midday|noon)$/i;
  if (generalTime.test(normalized)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "Please provide a time like '2pm', 'morning', or 'around 3:00'"
  };
}

/**
 * Miles/Distance Validator
 *
 * Accepts:
 * - "5", "5 miles", "about 10 miles"
 * - "5-10 miles" (range)
 *
 * Invalid:
 * - "not far", "close by" (no number)
 * - "1000 miles" (unreasonable for dispatch)
 */
export function validateMiles(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, reason: "Distance cannot be empty" };
  }

  const normalized = value.toLowerCase().trim();

  // Too vague
  if (/^(close|nearby|not far|short|long)$/i.test(normalized)) {
    return {
      valid: false,
      reason: "Please provide an estimated distance in miles, like '5 miles' or 'about 10'"
    };
  }

  // Extract number(s)
  const numbers = value.match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) {
    return {
      valid: false,
      reason: "Please provide a number of miles, like '5 miles' or 'about 10'"
    };
  }

  // Check if reasonable (1-500 miles)
  const miles = parseFloat(numbers[0]);
  if (miles < 1) {
    return {
      valid: false,
      reason: "Distance must be at least 1 mile"
    };
  }

  if (miles > 500) {
    return {
      valid: false,
      reason: "Distance seems unusually high. Please confirm the distance in miles."
    };
  }

  return { valid: true };
}

/**
 * Email Validator
 *
 * Basic email format validation
 */
export function validateEmail(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, reason: "Email cannot be empty" };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value.trim())) {
    return {
      valid: false,
      reason: "Please provide a valid email address like 'john@example.com'"
    };
  }

  return { valid: true };
}

/**
 * Phone Validator
 *
 * Accepts various phone formats:
 * - "555-1234", "(555) 123-4567", "555.123.4567"
 * - "+1 555 123 4567"
 */
export function validatePhone(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, reason: "Phone number cannot be empty" };
  }

  // Remove common formatting characters
  const cleaned = value.replace(/[\s\-\.\(\)]/g, '');

  // Check if it contains enough digits (at least 7 for local, typically 10+ for full)
  const digits = cleaned.match(/\d/g);
  if (!digits || digits.length < 7) {
    return {
      valid: false,
      reason: "Please provide a complete phone number like '555-123-4567'"
    };
  }

  return { valid: true };
}

/**
 * Party Size Validator
 *
 * Accepts:
 * - Numbers 1-100
 * - "2", "2 people", "party of 4"
 *
 * Invalid:
 * - "a few", "some" (not specific)
 * - 0 or negative
 * - > 100 (likely error)
 */
export function validatePartySize(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, reason: "Party size cannot be empty" };
  }

  const normalized = value.toLowerCase().trim();

  // Too vague
  if (/^(few|some|several|many|couple)$/i.test(normalized)) {
    return {
      valid: false,
      reason: "Please provide a specific number like '2', '4 people', or 'party of 6'"
    };
  }

  // Extract number
  const match = value.match(/\d+/);
  if (!match) {
    return {
      valid: false,
      reason: "Please provide a number like '2' or 'party of 4'"
    };
  }

  const size = parseInt(match[0], 10);

  if (size < 1) {
    return {
      valid: false,
      reason: "Party size must be at least 1"
    };
  }

  if (size > 100) {
    return {
      valid: false,
      reason: "Party size seems unusually large. Please confirm the number of people."
    };
  }

  return { valid: true };
}

/**
 * Numeric Validator (generic)
 *
 * Ensures value contains a number
 */
export function validateNumeric(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, reason: "Value cannot be empty" };
  }

  const hasNumber = /\d+(?:\.\d+)?/.test(value);
  if (!hasNumber) {
    return {
      valid: false,
      reason: "Please provide a number"
    };
  }

  return { valid: true };
}

/**
 * Non-Empty Validator (default)
 *
 * Just checks that value is not empty
 */
export function validateNonEmpty(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, reason: "This field is required" };
  }

  return { valid: true };
}

/**
 * Validate a field based on its key and value
 *
 * This function maps field keys to appropriate validators
 */
export function validateRequiredInput(fieldKey: string, value: string): ValidationResult {
  // Address fields
  if (fieldKey.includes('address') && !fieldKey.includes('email')) {
    return validateAddress(value);
  }

  // Date fields
  if (fieldKey.includes('date')) {
    return validateDate(value);
  }

  // Time fields
  if (fieldKey.includes('time') && !fieldKey.includes('estimated')) {
    return validateTime(value);
  }

  // Miles/distance fields
  if (fieldKey.includes('miles') || fieldKey === 'estimated_miles') {
    return validateMiles(value);
  }

  // Email fields
  if (fieldKey.includes('email')) {
    return validateEmail(value);
  }

  // Phone fields
  if (fieldKey.includes('phone')) {
    return validatePhone(value);
  }

  // Party size
  if (fieldKey === 'party_size') {
    return validatePartySize(value);
  }

  // Numeric fields
  if (fieldKey.includes('quantity') || fieldKey.includes('count') || fieldKey.includes('number')) {
    return validateNumeric(value);
  }

  // Default: just check non-empty
  return validateNonEmpty(value);
}

/**
 * Check if all required inputs are valid
 *
 * Returns array of missing/invalid fields with reasons
 */
export interface MissingInput {
  key: string;
  label: string;
  reason: string;
  ask_prompt: string;
}

export function checkRequiredInputs(
  requiredFields: Array<{ key: string; label: string; ask_prompt: string }>,
  extractedData: Record<string, any>
): MissingInput[] {
  const missing: MissingInput[] = [];

  for (const field of requiredFields) {
    const value = extractedData[field.key];

    // Check if field exists and has a value
    if (value === undefined || value === null || value === '') {
      missing.push({
        key: field.key,
        label: field.label,
        reason: "Not provided",
        ask_prompt: field.ask_prompt
      });
      continue;
    }

    // Validate the value
    const validation = validateRequiredInput(field.key, String(value));
    if (!validation.valid) {
      missing.push({
        key: field.key,
        label: field.label,
        reason: validation.reason || "Invalid format",
        ask_prompt: field.ask_prompt
      });
    }
  }

  return missing;
}
