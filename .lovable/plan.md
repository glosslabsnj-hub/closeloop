
# Admin Test Phone Number - Universal Testing Line

## Summary

You want the phone number **+1-855-329-7357** to work as a universal admin test line that routes to whichever tenant you've selected in the Admin Tenant Switcher. This way you can test Service, Dispatch, Food, Medical, and General modes all from the same number.

## Current Behavior

| When you call... | What happens |
|------------------|--------------|
| +1-855-329-7357 | Always routes to "Bella Italia Ristorante" (food mode) because that number is assigned to that tenant only |
| Other tenant numbers | Each routes to its own tenant |

## Proposed Behavior

| When you call... | What happens |
|------------------|--------------|
| +1-855-329-7357 from YOUR phone | Routes to whichever tenant you selected in the admin panel |
| +1-855-329-7357 from any other phone | Routes to default tenant (Bella Italia) |
| Other tenant numbers | No change - routes to their assigned tenant |

## How It Works

```text
┌──────────────────────────────────────────────────────────────────┐
│  INBOUND CALL TO +1-855-329-7357                                 │
│                                                                  │
│  1. Is this number marked as admin_test_line?                    │
│     ├─ NO → Normal routing (lookup tenant by number)             │
│     └─ YES → Check caller ID                                     │
│                                                                  │
│  2. Is caller phone registered to a super admin?                 │
│     ├─ NO → Use fallback_tenant_id from phone_numbers            │
│     └─ YES → Look up admin's admin_active_tenant_id              │
│                                                                  │
│  3. Route call to resolved tenant                                │
└──────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Database Changes

**A. Add columns to `admin_settings` table:**
```sql
ALTER TABLE admin_settings 
ADD COLUMN admin_phone_e164 TEXT,
ADD COLUMN admin_phone_verified BOOLEAN DEFAULT false;
```

This stores YOUR personal phone number so we can identify you as the caller.

**B. Add columns to `phone_numbers` table:**
```sql
ALTER TABLE phone_numbers 
ADD COLUMN is_admin_test_line BOOLEAN DEFAULT false,
ADD COLUMN fallback_tenant_id UUID REFERENCES tenants(id);
```

This marks +1-855-329-7357 as an admin test line with a fallback tenant if caller isn't recognized.

**C. Set up the test line:**
```sql
UPDATE phone_numbers 
SET 
  is_admin_test_line = true,
  fallback_tenant_id = 'a0000000-0000-0000-0000-000000000001'  -- Bella Italia
WHERE phone_e164 = '+18553297357';
```

### Phase 2: Edge Function Changes

Update `supabase/functions/twilio-inbound/index.ts` to add admin test line routing:

```typescript
// After looking up phone record...
const phoneRecord = await supabase
  .from("phone_numbers")
  .select("tenant_id, status, location_id, is_admin_test_line, fallback_tenant_id")
  .eq("phone_e164", toNumber)
  .maybeSingle();

let tenantId = phoneRecord.tenant_id;

// ADMIN TEST LINE ROUTING
if (phoneRecord.is_admin_test_line) {
  console.log("Admin test line detected, checking caller for admin routing");
  
  // Look up if caller is a registered admin
  const { data: adminMatch } = await supabase
    .from("admin_settings")
    .select("admin_active_tenant_id, user_id")
    .eq("admin_phone_e164", callerPhoneE164)
    .maybeSingle();
  
  if (adminMatch?.admin_active_tenant_id) {
    // Verify this user is actually a super_admin
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminMatch.user_id)
      .eq("role", "super_admin")
      .maybeSingle();
    
    if (roleCheck) {
      console.log(`Admin caller detected, routing to active tenant: ${adminMatch.admin_active_tenant_id}`);
      tenantId = adminMatch.admin_active_tenant_id;
    }
  } else if (phoneRecord.fallback_tenant_id) {
    console.log(`Non-admin caller, using fallback tenant: ${phoneRecord.fallback_tenant_id}`);
    tenantId = phoneRecord.fallback_tenant_id;
  }
}
```

### Phase 3: Admin Settings UI

**A. Add phone registration to admin settings**

Create a component in the admin area to register your personal phone number:

| Field | Value |
|-------|-------|
| Admin Phone | `+1 (555) 123-4567` (your cell) |
| Verified | Send test SMS to verify |

**B. Update the existing AdminTenantSwitcher**

Show a badge/note that calls to +1-855-329-7357 will route to the selected tenant.

## Files to Modify

| File | Changes |
|------|---------|
| **Database** | Add columns to `admin_settings` and `phone_numbers` |
| `supabase/functions/twilio-inbound/index.ts` | Add admin test line routing logic |
| `src/contexts/AuthContext.tsx` | Fetch `admin_phone_e164` with admin settings |
| `src/components/admin/AdminTenantSwitcher.tsx` | Show test line phone number |
| **New File**: `src/components/admin/AdminPhoneSettings.tsx` | UI to register admin phone |
| `src/pages/admin/AdminSettingsPage.tsx` | Include phone registration section |

## Setup Steps (After Implementation)

1. **Register your phone**: Go to Admin Settings and enter your personal cell phone number
2. **Verify** (optional): Receive a test call/SMS to confirm
3. **Switch tenants**: Use the Admin Tenant Switcher to select any mode
4. **Call**: Dial +1-855-329-7357 from your registered phone
5. **Result**: AI answers as the selected business

## Security Considerations

- Only super_admin users can register admin phones
- Phone verification prevents spoofing (optional but recommended)
- Fallback tenant ensures non-admin callers still get connected
- All admin test calls are logged with `is_admin_test: true` flag

## Testing Flow After Implementation

```text
You (as admin):
1. Open dashboard, select "HAWKS TOWING" (dispatch mode)
2. Call +1-855-329-7357 from your registered phone
3. AI answers: "Thanks for calling Hawks Towing..."

You (switch tenant):
1. Open dashboard, select "Bella Italia" (food mode)  
2. Call same number +1-855-329-7357
3. AI answers: "Thanks for calling Bella Italia Ristorante..."

Non-admin caller:
1. Calls +1-855-329-7357
2. Routes to fallback tenant (Bella Italia)
```

## Summary of Changes

| Category | What's Added |
|----------|--------------|
| **Database** | 2 new columns on `admin_settings`, 2 new columns on `phone_numbers` |
| **Edge Function** | ~30 lines of admin routing logic in `twilio-inbound` |
| **UI** | Admin phone registration form, test line indicator |
| **No changes to** | Existing tenant phone assignments, normal call routing |

This gives you a single test number that follows your admin session across all business modes.
