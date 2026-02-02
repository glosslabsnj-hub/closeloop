

# Plan: Delete Test Accounts (Keep City Roadside Rescue)

## What Will Be Deleted

### Accounts & Phone Numbers
| Business Name | Phone Number | Twilio SID |
|--------------|--------------|------------|
| Blue Boxer Plumbing | +1 (931) 666-6603 | `PN87f239b36755676e1fd34c7f2e21332a` |
| Brothers Pizza | +1 (318) 353-8719 | `PN4d64ae11913102070dffdb175cbe9e91` |
| Brothers Pizza 33 | +1 (458) 309-3057 | `PN2b166c1bab8e20acadf6c094dca8a930` |
| Brothers Pizza Rt 33 | +1 (505) 405-7226 | `PN862b37582086f2aeef611edd8fbe6b8e` |
| Hawks Towing | +1 (920) 481-3421 | `PNe81c3ffeaed2fdd97ac966717180aa77` |
| Bella Italia Ristorante | (demo - no phone) | N/A |

### What Will Be Kept
| Business Name | Phone Number |
|--------------|--------------|
| City Roadside Rescue | +1 (855) 329-7357 |

---

## Technical Implementation

### Option A: Use Existing Cleanup Function
The project already has a `cleanup-test-users` edge function that:
1. Takes your email address (the one you use to log in)
2. Finds the tenant associated with that email
3. Deletes all OTHER tenants and their users
4. Preserves your account and City Roadside Rescue

**Requirement**: I need the email address you use to log in to City Roadside Rescue.

### Option B: Direct Database Cleanup
Run targeted SQL migrations to:
1. Delete `phone_numbers` records for the 5 accounts (cascade cleans up dependent tables)
2. Delete `tenant_users` records for those tenants
3. Delete `tenants` records for those 5 + demo account
4. Delete auth users for those 5 accounts

---

## You Handle: Twilio Number Release
After I delete the database records, you'll need to release these numbers in your Twilio console:
- `PN87f239b36755676e1fd34c7f2e21332a` (Blue Boxer)
- `PN4d64ae11913102070dffdb175cbe9e91` (Brothers Pizza)
- `PN2b166c1bab8e20acadf6c094dca8a930` (Brothers Pizza 33)
- `PN862b37582086f2aeef611edd8fbe6b8e` (Brothers Pizza Rt 33)
- `PNe81c3ffeaed2fdd97ac966717180aa77` (Hawks Towing)

---

## Next Step
Please provide the email address you use to log in to City Roadside Rescue, and I'll run the cleanup to delete all the test accounts.

