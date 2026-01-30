

# Provision New 931 (Tullahoma, TN) Number for blueboxer@test.com

## Summary

Replace the existing toll-free number for blueboxer tenant with a new local number from the 931 (Tullahoma, TN) area code.

---

## Current State

| Field | Value |
|-------|-------|
| Tenant ID | `aa96d3c3-25f8-48d1-9cfa-a906a6122c44` |
| Current Number | `+18553297357` (toll-free) |
| Twilio SID | `PNa0af00def24562ad1a1b809b6530c20b` |
| Status | `provisioned` |

---

## Implementation Steps

### Step 1: Deactivate Existing Number Assignment

Update the `phone_numbers` table to mark the current toll-free number as inactive for this tenant:

```sql
UPDATE phone_numbers 
SET status = 'replaced', 
    updated_at = now()
WHERE tenant_id = 'aa96d3c3-25f8-48d1-9cfa-a906a6122c44'
  AND phone_e164 = '+18553297357';
```

Also clear the assistant_settings so provisioning can proceed:

```sql
UPDATE assistant_settings
SET closeloop_number = NULL,
    twilio_phone_sid = NULL,
    twilio_provisioned_at = NULL,
    connect_status = 'not_connected',
    updated_at = now()
WHERE tenant_id = 'aa96d3c3-25f8-48d1-9cfa-a906a6122c44';
```

### Step 2: Call Provision Function

Call the `provision-twilio-number` edge function with:

```json
{
  "tenant_id": "aa96d3c3-25f8-48d1-9cfa-a906a6122c44",
  "area_code": "931",
  "number_type": "local"
}
```

This will:
1. Search Twilio for available 931 numbers with voice + SMS enabled
2. Purchase the first available number
3. Configure webhook to point to `twilio-inbound`
4. Insert new row in `phone_numbers`
5. Update `assistant_settings` with new number

### Step 3: Verify Assignment

Confirm the new number is properly assigned:

```sql
SELECT pn.phone_e164, pn.status, ast.closeloop_number
FROM phone_numbers pn
JOIN assistant_settings ast ON pn.tenant_id = ast.tenant_id
WHERE pn.tenant_id = 'aa96d3c3-25f8-48d1-9cfa-a906a6122c44'
  AND pn.status = 'provisioned';
```

---

## Optional: Release Old Twilio Number

If you want to stop paying for the old toll-free number, it can be released from Twilio. This is a separate operation that would be done via Twilio API or dashboard. The old number would no longer work after release.

---

## Expected Outcome

| Field | Before | After |
|-------|--------|-------|
| Phone Number | `+18553297357` (toll-free) | `+1931XXXXXXX` (local) |
| Area Code | 855 | 931 |
| Status | provisioned | provisioned |

---

## Technical Notes

- The existing toll-free number will remain in Twilio account (billed monthly) until explicitly released
- The new 931 number will be configured with the same webhook URL for inbound calls
- No code changes required - this is a data operation + API call

