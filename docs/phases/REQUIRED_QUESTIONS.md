# Required Questions V1

## Overview

The **Required Questions** feature allows business owners to configure what information the AI must collect for each intent type (booking, dispatch, order, reservation, callback). This ensures the AI always gathers necessary inputs before completing a transaction.

## Implementation

### Database Schema

Uses existing `business_intent_rules` table with new enum value:

```sql
-- Migration: 20260202000000_add_required_inputs_rule_type.sql
ALTER TYPE intent_rule_type ADD VALUE IF NOT EXISTS 'required_inputs';
```

**Table Structure:**
```sql
CREATE TABLE business_intent_rules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  rule_type intent_rule_type NOT NULL, -- now includes 'required_inputs'
  name TEXT NOT NULL,
  description TEXT,
  condition_json JSONB NOT NULL DEFAULT '{}',
  action_json JSONB NOT NULL DEFAULT '{}', -- stores config
  priority INT DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  is_suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### JSON Configuration Structure

Each rule stores configuration in `action_json` with this shape:

```typescript
interface IntentRequiredInputsConfig {
  intent: "booking" | "dispatch" | "order" | "reservation" | "callback";
  required_inputs: InputField[];
  optional_inputs: InputField[];
}

interface InputField {
  key: string;          // Unique identifier (e.g., "customer_name", "custom_123")
  label: string;        // Display name (e.g., "Customer Name")
  ask_prompt: string;   // How AI should ask (e.g., "May I have your name please?")
  why_needed: string;   // Explanation (e.g., "Required to identify the booking")
}
```

**Example Stored Data:**

```json
{
  "intent": "booking",
  "required_inputs": [
    {
      "key": "customer_name",
      "label": "Customer Name",
      "ask_prompt": "May I have your name please?",
      "why_needed": "Required to identify the booking"
    },
    {
      "key": "customer_phone",
      "label": "Phone Number",
      "ask_prompt": "What's the best phone number to reach you at?",
      "why_needed": "Required for booking confirmation and updates"
    },
    {
      "key": "service_requested",
      "label": "Service",
      "ask_prompt": "Which service are you interested in?",
      "why_needed": "Required to schedule the appropriate service"
    }
  ],
  "optional_inputs": [
    {
      "key": "preferred_time",
      "label": "Preferred Time",
      "ask_prompt": "What time would you prefer?",
      "why_needed": "Helps schedule at your convenience"
    }
  ]
}
```

## Components

### 1. RequiredQuestionsEditor

**Location:** `src/components/settings/RequiredQuestionsEditor.tsx`

**Features:**
- Tab navigation for each intent type (booking, dispatch, order, reservation, callback)
- Mode-aware: Only shows relevant intents based on business_mode
  - Food mode: order, reservation, callback
  - Dispatch mode: dispatch, callback
  - Service mode: booking, callback
  - Medical mode: booking, callback
- Standard fields library with smart defaults
- Custom field creation
- Toggle fields between required and optional
- Edit field properties (label, ask_prompt, why_needed)
- Save all configs to `business_intent_rules` table

**UI Components:**
- Info banner explaining how required questions work
- Intent tabs with badge showing required count
- Required fields section (rose-colored, AlertCircle icon)
- Optional fields section (blue-colored, CheckCircle2 icon)
- Field editor with:
  - Switch to toggle required/optional
  - Input for field label
  - Textarea for ask prompt
  - Textarea for why needed
  - Delete button for custom fields

### 2. FieldEditor Subcomponent

Inline editor for each field with:
- Switch to toggle required state
- Delete button (custom fields only)
- Three text inputs:
  - **Field Label:** Display name
  - **How AI Should Ask:** Conversational prompt
  - **Why It's Needed:** Internal explanation

## Standard Fields Library

Pre-configured fields with sensible defaults for each intent:

### Booking Intent
- customer_name
- customer_phone
- service_requested
- preferred_date
- preferred_time
- address

### Dispatch Intent
- customer_name
- customer_phone
- pickup_address
- dropoff_address
- urgency
- vehicle_type

### Order Intent
- customer_name
- customer_phone
- order_type (pickup/delivery)
- delivery_address

### Reservation Intent
- customer_name
- customer_phone
- party_size
- reservation_date
- reservation_time

### Callback Intent
- customer_name
- customer_phone
- best_time
- reason

## Navigation

**Path:** Settings → AI & Privacy → Required Questions

**Sidebar Location:** AI & Privacy section
- AI Learning
- **Required Questions** ← NEW
- Data & Privacy
- HIPAA Compliance (conditional)

## User Workflows

### Initial Setup

1. User navigates to Settings → Required Questions
2. Sees tabs for relevant intents (based on business_mode)
3. Default configuration loaded:
   - First 3 standard fields marked as required
   - Remaining standard fields marked as optional
4. User can toggle fields between required/optional
5. User can edit prompts to match their business tone
6. User can add custom fields (e.g., "Preferred technician", "Special equipment needed")
7. Click "Save Changes" to persist to database

### Adding Custom Field

1. Click "Add Custom" button (in required or optional section)
2. New field appears with default values:
   - Label: "New Custom Question"
   - Ask: "Please provide..."
   - Why: "Required for processing"
3. User edits all three fields
4. Field gets unique key: `custom_<timestamp>`
5. Saves with configuration

### Removing Custom Field

1. Click trash icon on custom field
2. Field removed from configuration
3. Only custom fields can be deleted (standard fields can only be toggled)

### Toggling Required/Optional

1. Use switch on any field
2. Field moves between required_inputs and optional_inputs arrays
3. Visual indicator updates (rose for required, blue for optional)

## Technical Details

### Mode-Driven Intent Selection

```typescript
const relevantIntents: Intent[] = (() => {
  switch (businessMode) {
    case "food":
      return ["order", "reservation", "callback"];
    case "dispatch":
      return ["dispatch", "callback"];
    case "service":
      return ["booking", "callback"];
    case "medical":
      return ["booking", "callback"];
    case "general":
      return ["booking", "callback"];
    default:
      return ["booking", "callback"];
  }
})();
```

### Data Loading

On component mount:
1. Fetch all `business_intent_rules` where `rule_type = 'required_inputs'`
2. For each relevant intent:
   - If rule exists, load from `action_json`
   - If no rule, initialize with defaults (first 3 standard fields required)
3. Store in state keyed by intent

### Data Saving

On "Save Changes":
1. Delete all existing `required_inputs` rules for tenant
2. Insert new rules for each relevant intent
3. Each rule contains:
   - `rule_type: 'required_inputs'`
   - `name: 'Required Questions: Booking'` (auto-generated)
   - `description: 'Input requirements for booking intent'`
   - `action_json: { intent, required_inputs, optional_inputs }`
   - `is_enabled: true`

### Change Detection

- `hasChanges` state tracks unsaved modifications
- "Save Changes" button only appears when `hasChanges === true`
- Button shows loading state during save

## Integration with AI

The AI retrieves required questions via:

```typescript
// In buildBusinessContext or similar
const { data: rules } = await supabase
  .from("business_intent_rules")
  .select("*")
  .eq("tenant_id", tenantId)
  .eq("rule_type", "required_inputs")
  .eq("is_enabled", true);

const bookingRules = rules?.find(r => r.action_json.intent === "booking");
if (bookingRules) {
  const { required_inputs, optional_inputs } = bookingRules.action_json;

  // AI uses required_inputs to ensure all are collected
  // AI uses optional_inputs when context allows
  // AI uses ask_prompt for each field
  // AI references why_needed for error messages
}
```

## Example Configurations

### Service Business (Plumbing)

**Booking Intent - Required:**
- Customer Name: "May I have your name?"
- Phone Number: "What's the best number to reach you?"
- Service: "What plumbing issue can we help with?"
- Address: "What's the property address?"
- Preferred Date: "What day works best?"

**Booking Intent - Optional:**
- Preferred Time: "Do you have a time preference?"
- Custom: "Is this an emergency?" (custom field)

### Food Business (Restaurant)

**Order Intent - Required:**
- Customer Name: "Name for the order?"
- Phone: "Phone number please?"
- Order Type: "Pickup or delivery?"

**Order Intent - Optional:**
- Delivery Address: "Delivery address?" (required if delivery)
- Special Instructions: "Any special requests?"

**Reservation Intent - Required:**
- Customer Name: "Name for the reservation?"
- Party Size: "How many in your party?"
- Date: "What date?"
- Time: "What time?"

### Dispatch Business (Towing)

**Dispatch Intent - Required:**
- Customer Name: "Your name please?"
- Phone: "Best number to reach you?"
- Pickup Location: "Where's the vehicle?"
- Vehicle Type: "What type of vehicle?"
- Urgency: "Is this an emergency?"

**Dispatch Intent - Optional:**
- Dropoff Location: "Where should we tow it?"
- Custom: "Is the vehicle drivable?" (custom field)

## Benefits

### For Business Owners

1. **Consistency:** AI always asks the same questions in the same way
2. **Completeness:** Never miss critical information
3. **Customization:** Add business-specific questions
4. **Control:** Edit prompts to match brand voice
5. **Flexibility:** Toggle fields between required/optional easily

### For AI

1. **Clear Instructions:** Knows exactly what to collect
2. **Validation:** Can check if all required fields are filled
3. **Error Handling:** Can reference why_needed when user doesn't provide info
4. **Context-Aware:** Uses optional fields when appropriate
5. **Structured Output:** Maps collected data to CanonicalPayload fields

## Non-Negotiables Met

✅ **No demo data** - All data is real from `business_intent_rules` table
✅ **Use existing schema** - Reuses `business_intent_rules` table with new enum value
✅ **Mode-driven** - Intent selection based on business_mode
✅ **No new tables** - Only added enum value to existing table
✅ **JSON storage** - Configuration stored in existing `action_json` JSONB column

## Files Created

1. **Migration:** `supabase/migrations/20260202000000_add_required_inputs_rule_type.sql`
2. **Component:** `src/components/settings/RequiredQuestionsEditor.tsx`
3. **Documentation:** `REQUIRED_QUESTIONS.md` (this file)

## Files Modified

1. **`src/components/settings/SettingsSidebar.tsx`** - Added "Required Questions" nav item
2. **`src/pages/app/SettingsPage.tsx`** - Added route and section rendering
3. **`src/hooks/useIntentRules.ts`** - Added "required_inputs" to type definitions

## Future Enhancements (V2+)

1. **Conditional Fields:** Show field based on previous answers (e.g., "delivery_address" only if "order_type" is "delivery")
2. **Field Types:** Specify input type (text, phone, address, date, dropdown)
3. **Validation Rules:** Add regex, min/max length, required format
4. **Multi-Language:** Support different ask_prompts per language
5. **AI-Generated Prompts:** Suggest conversational prompts based on field label
6. **Templates:** Pre-built templates for common industries
7. **Field Reordering:** Drag-and-drop to change question order
8. **Branching Logic:** "If X, then ask Y"
9. **Analytics:** Track which questions users struggle to answer
10. **Import/Export:** Share configs between tenants

## Testing Checklist

- [ ] Navigate to Settings → Required Questions
- [ ] Verify tabs show only relevant intents for business_mode
- [ ] Toggle field from required to optional
- [ ] Toggle field from optional to required
- [ ] Edit field label, ask_prompt, why_needed
- [ ] Add custom required field
- [ ] Add custom optional field
- [ ] Delete custom field (verify delete button only on custom fields)
- [ ] Save configuration
- [ ] Reload page, verify configuration persists
- [ ] Change business_mode, verify relevant intents update
- [ ] Test with food mode (order, reservation, callback)
- [ ] Test with dispatch mode (dispatch, callback)
- [ ] Test with service mode (booking, callback)
- [ ] Verify no changes alert on navigation away (if implemented)
- [ ] Verify database writes to business_intent_rules table
- [ ] Verify action_json structure matches TypeScript interface

## Success Metrics

- Business owners can configure required questions in <5 minutes
- AI consistently collects all required fields before completing intents
- Reduced incomplete bookings/orders due to missing information
- Improved data quality in CanonicalPayload extraction
- Owners can add custom business-specific questions without developer help
