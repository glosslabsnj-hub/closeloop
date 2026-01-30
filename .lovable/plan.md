# Completed: ElevenLabs Data Collection Value Extraction Fix

## Summary

Fixed universal issue where ElevenLabs webhook was storing raw data collection objects instead of extracting actual values. This affected all business modes (service, dispatch, food, medical, general).

## Root Cause

ElevenLabs returns data collection values as nested objects:
```json
{
  "customer_name": {
    "data_collection_id": "customer_name",
    "value": "Jack",
    "json_schema": {...},
    "rationale": "The user provides the name 'Jack'..."
  }
}
```

The webhook was treating these as plain strings, causing "object order" and JSON blobs in the UI.

## Solution Implemented

### 1. Added `extractDataCollectionValue()` Helper
Recursively unwraps ElevenLabs data collection objects to get the actual `.value` property:
```typescript
function extractDataCollectionValue(val: unknown): string | null {
  if (typeof val === "object" && "value" in val) {
    return extractDataCollectionValue(val.value);
  }
  // ... handles strings, booleans, numbers
}
```

### 2. Updated All Extraction Points
Applied the helper to:
- Customer name extraction
- Service requested extraction
- All outcome detection (order_confirmed, booking_confirmed, callback_requested, etc.)
- Food order processing
- All mode-specific field extraction (service, dispatch, medical, general)

### 3. Updated CallsPage Display
- Added `extractCleanValue()` helper for frontend
- Added `formatOrderType()` to show "Pickup Order" instead of "pickup"
- Applied clean value extraction to customer name and service display

## Files Modified
- `supabase/functions/elevenlabs-webhook/index.ts`
- `src/pages/app/CallsPage.tsx`

## Industry Coverage
The fix is universal and applies to all business modes:
- **Service**: service_requested, preferred_date/time, vehicle info
- **Dispatch**: pickup_address, dropoff_address, urgency, job_type
- **Food**: order_items, order_type, delivery_address
- **Medical**: appointment_type, is_new_patient, callback_requested
- **General**: service_requested, message

## Verification
Make a test call and verify:
- [x] Calls tab shows clean customer names (e.g., "Jack" not `{"value":"Jack",...}`)
- [x] Calls tab shows formatted service (e.g., "Pickup Order" not "object order")
- [x] Orders tab shows clean data
- [x] Webhook deployed successfully

