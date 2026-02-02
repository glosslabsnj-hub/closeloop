
# Plan: Complete Business Brain to ElevenLabs Variable Alignment

## Problem Statement

The voice agent cannot answer fundamental questions about:
- **Business location/address** ("Where are you located?")
- **Phone number** ("What's your phone number?")  
- **Website** ("What's your website?")
- **Service area** ("Do you come to my area?")
- **Business identity** (tagline, years in business)
- **Objection responses** (pre-defined responses to common objections)
- **Full weekly hours** (only `hours_today` is sent, not the full schedule)

**Root cause**: The `buildDynamicVariables()` function in `buildBusinessContext.ts` only flattens ~40% of the Business Brain data. Many fields exist in the database and the `BusinessContext` interface but are never added to the `dynamicVariables` payload sent to ElevenLabs.

## Current State vs Required State

### Data in BusinessContext (available) but NOT in dynamicVariables (missing):

| Business Brain Field | DB Column | In BusinessContext | In dynamicVariables | Status |
|---------------------|-----------|-------------------|---------------------|--------|
| Address | `address` | `ctx.tenant.address` | MISSING | FIX |
| Phone | `phone_public` | `ctx.tenant.phone_e164` | MISSING | FIX |
| Website | `website_url` | `ctx.tenant.website` | MISSING | FIX |
| Tagline | `tagline` | `ctx.tenant.tagline` | MISSING | FIX |
| Years in Business | `years_in_business` | `ctx.tenant.years_in_business` | MISSING | FIX |
| Service Area | `service_area_json` | `ctx.tenant.service_area` | MISSING | FIX |
| Full Weekly Hours | `hours_json` | `ctx.tenant.hours` | Only `hours_today` | FIX |
| Industry | `industry` | `ctx.tenant.industry_slug` | MISSING | FIX |
| Objection Responses | `objection_responses` table | `ctx.knowledge.objections` | MISSING | FIX |
| AI Never Promise | `ai_never_promise` | `ctx.policies.ai_never_promise` | MISSING | FIX |
| Refund Policy | `refund_policy` | `ctx.policies.refund` | MISSING | FIX |
| Booking Mode | - | `ctx.operations.availability.booking_mode` | MISSING | FIX |
| Medical Intake Fields | `intake_required_fields_json` | `ctx.intake.required_fields` | MISSING | FIX |
| Catering Settings | `food_settings` | `ctx.food_settings.catering_*` | MISSING | FIX |

## Solution: Comprehensive Variable Mapping

### File: `supabase/functions/_shared/buildBusinessContext.ts`

Update `buildDynamicVariables()` (starting around line 1593) to include ALL Business Brain data.

### New Variables to Add

```typescript
// === BUSINESS IDENTITY ===
address: ctx.tenant.address || "",
phone: ctx.tenant.phone_e164 || "",
website: ctx.tenant.website || "",
tagline: ctx.tenant.tagline || "",
years_in_business: String(ctx.tenant.years_in_business || ""),
industry: ctx.tenant.industry_slug || "",

// === SERVICE AREA (formatted for voice) ===
service_area_description: formatServiceAreaForVoice(ctx.tenant.service_area),
service_area_mode: ctx.tenant.service_area?.type || "",
service_area_radius_miles: String(ctx.tenant.service_area?.miles || ""),

// === FULL WEEKLY HOURS ===
hours_weekly: formatWeeklyHoursForVoice(ctx.tenant.hours),

// === POLICIES (complete) ===
refund_policy: ctx.policies.refund || "",
cancellation_policy: ctx.policies.cancellation || "",
deposit_policy: ctx.policies.deposit || "",
ai_never_promise: ctx.policies.ai_never_promise?.join("; ") || "",

// === OBJECTION RESPONSES ===
objections_summary: formatObjectionsForVoice(ctx.knowledge.objections),

// === BOOKING/AVAILABILITY ===
booking_mode: ctx.operations.availability.booking_mode || "",
min_lead_hours: String(ctx.operations.availability.min_lead_hours || ""),
max_advance_days: String(ctx.operations.availability.max_advance_days || ""),

// === FOOD MODE (complete) ===
catering_min_guests: String(ctx.food_settings?.catering_min_guests || ""),
catering_lead_days: String(ctx.food_settings?.catering_lead_days || ""),

// === MEDICAL MODE ===
intake_fields_summary: formatIntakeFieldsForVoice(ctx.intake.required_fields),
```

### Helper Functions to Add

```typescript
/**
 * Formats service area config into a speakable description
 * Example outputs:
 * - "within 50 miles of our location"
 * - "the following ZIP codes: 08610, 08620, 08638"
 * - "Mercer County, NJ"
 * - "nationwide"
 */
function formatServiceAreaForVoice(
  serviceArea: { type: string; miles?: number; zip_codes?: string[] } | null
): string {
  if (!serviceArea) return "";
  
  const mode = serviceArea.type || "";
  
  if (mode === "radius" && serviceArea.miles) {
    return `within ${serviceArea.miles} miles of our location`;
  }
  
  if (mode === "zips" && serviceArea.zip_codes?.length) {
    const count = serviceArea.zip_codes.length;
    if (count <= 5) {
      return `the following ZIP codes: ${serviceArea.zip_codes.join(", ")}`;
    }
    return `${count} specific ZIP code areas`;
  }
  
  if (mode === "counties") {
    return "specific county areas";
  }
  
  if (mode === "unlimited" || mode === "nationwide") {
    return "nationwide";
  }
  
  return "";
}

/**
 * Formats weekly hours into a speakable summary
 * Example: "Monday through Friday 9 AM to 5 PM, Saturday 10 AM to 2 PM, closed Sunday"
 */
function formatWeeklyHoursForVoice(
  hours: Record<string, { open: string; close: string; is_open: boolean }>
): string {
  if (!hours || Object.keys(hours).length === 0) return "";
  
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const parts: string[] = [];
  
  for (const day of dayOrder) {
    const h = hours[day];
    if (!h) continue;
    
    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    if (!h.is_open) {
      parts.push(`${dayName}: Closed`);
    } else {
      parts.push(`${dayName}: ${h.open} - ${h.close}`);
    }
  }
  
  return parts.join(", ");
}

/**
 * Formats objection responses for AI context
 * Example: "When customer says 'too expensive': 'We offer flexible payment plans...'"
 */
function formatObjectionsForVoice(
  objections: Array<{ objection: string; response: string }>
): string {
  if (!objections || objections.length === 0) return "";
  
  return objections
    .map(o => `When customer says "${o.objection}": "${truncate(o.response, 150)}"`)
    .join(" | ");
}

/**
 * Formats intake fields for medical mode
 * Example: "Please collect: insurance provider, date of birth, current medications"
 */
function formatIntakeFieldsForVoice(fields: IntakeField[]): string {
  if (!fields || fields.length === 0) return "";
  
  const required = fields.filter(f => f.required);
  if (required.length === 0) return "";
  
  return `Please collect: ${required.map(f => f.label).join(", ")}`;
}
```

### Complete Updated `buildDynamicVariables()` Function

The function will grow from ~70 variables to ~95 variables, covering 100% of Business Brain data.

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/_shared/buildBusinessContext.ts` | Add 4 helper functions + ~25 new variables to `buildDynamicVariables()` |

## Variable Categories After Implementation

### Core Identity (9 variables)
- `tenant_id`, `location_id`, `business_name`, `businessname`, `business_mode`
- `address`, `phone`, `website`, `tagline`, `years_in_business`, `industry`

### Hours & Availability (5 variables)
- `hours_today`, `hours_weekly`, `calendar_connected`, `booking_link`, `booking_mode`

### Services & Menu (10 variables)
- `service_summary`, `services_pricing`, `menu_summary`, `pricing_rules_summary`
- `menu_has_more`, `menu_top_categories`, `menu_summary_length`
- `context_has_services`, `context_services_count`, etc.

### Policies (7 variables)
- `policies_summary`, `cancellation_policy`, `deposit_policy`, `refund_policy`
- `payment_methods` (implicit in policies_summary), `ai_never_promise`

### Location & Service Area (4 variables)
- `service_area_description`, `service_area_mode`, `service_area_radius_miles`, `timezone`

### Knowledge (3 variables)
- `faqs_summary`, `objections_summary`, `tone`

### Food Mode (10 variables)
- All existing + `catering_min_guests`, `catering_lead_days`

### Medical Mode (4 variables)
- `hipaa_mode`, `intake_fields_summary`, `memory_enabled` (restricted in HIPAA)

### Intelligence (5 variables)
- `intent_rules_summary`, `required_questions_summary`, `memory_hints_summary`, `memory_enabled`

## Testing Verification

After deployment, the Debug Panel should show ALL these new variables:

```json
{
  "tenant_id": "a0000000-...",
  "business_name": "City Roadside Rescue",
  "address": "zzzz-street",
  "phone": "6097318641",
  "website": "https://eliteautodetailing.com",
  "tagline": "Premium Mobile Detailing That Comes to You",
  "years_in_business": "5",
  "service_area_description": "within 50 miles of our location",
  "hours_weekly": "Monday: 08:00 - 18:00, Tuesday: 08:00 - 18:00, ...",
  "objections_summary": "When customer says 'too expensive': '...'",
  ...
}
```

And the voice agent should now correctly answer:
- "Where are you located?" → "We're at zzzz-street"
- "What's your phone number?" → "Our number is 609-731-8641"
- "Do you come to my area?" → "We serve customers within 50 miles of our location"
- "What are your hours?" → Full weekly schedule

## Technical Notes

1. **All variables default to empty string** - ElevenLabs requires non-null strings
2. **Truncation for voice** - Long text fields are truncated to prevent prompt bloat
3. **Mode-specific variables** - Food/medical/dispatch specific vars are still included but empty for non-applicable modes
4. **Backward compatible** - All existing variables remain unchanged; only additions

## Risks & Mitigations

- **Prompt size increase**: Adding ~25 variables increases payload. Mitigation: truncate long text fields
- **ElevenLabs variable limits**: Unknown if there's a max. Mitigation: test with full payload
- **Performance**: Minimal impact - just string formatting
