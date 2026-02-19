
# Fix Agency Login, Application Submission, and User Cleanup

## Problems Identified

1. **Agency login goes to onboarding instead of agency dashboard**: The LoginPage always redirects to `/app/dashboard` after sign-in (for non-admins). Since the agency user has no tenant, AppLayout then redirects them to `/app/onboarding`. The login flow never checks if the user is an agency user.

2. **Agency application submission fails with error**: The `agency_applications` table does not exist in the database. The migration files are present in the codebase but were never actually applied. The edge function `submit-agency-application` tries to insert into a non-existent table and returns a 500 error.

3. **Old test users cluttering the system**: 19 users exist in auth.users. Only 2 should remain: your admin account (`jackangelini@icloud.com`) and the agency test account (`agency-test@closeloop.ai`).

---

## Implementation Plan

### Step 1: Create the `agency_applications` table

Run the SQL from the existing migration files to create the table, add RLS policies, and the `user_id` column. This will fix the application submission error.

### Step 2: Delete old test users

Remove all 17 test/junk users from `auth.users`, keeping only:
- `jackangelini@icloud.com` (admin)
- `agency-test@closeloop.ai` (agency test)

Also clean up any orphaned data in `tenant_users`, `profiles`, or other user-linked tables.

### Step 3: Fix LoginPage to detect agency users and redirect properly

After successful sign-in, add a check for `agency_accounts` before defaulting to `/app/dashboard`. The flow will be:

1. Sign in
2. Check `user_roles` for `super_admin` -- if yes, go to `/admin/dashboard`
3. Check `agency_accounts` for a matching `user_id` -- if yes, go to `/app/agency`
4. Otherwise, go to `/app/dashboard`

### Step 4: Fix AppLayout onboarding redirect for agency users

The current redirect at line 112-114 sends users without a tenant to `/app/onboarding`. Agency users may not have a tenant, so this redirect needs to also check for agency status and skip the onboarding redirect for agency users.

---

## Technical Details

### Files Modified
- `src/pages/public/LoginPage.tsx` -- Add agency_accounts check after login
- `src/components/layouts/AppLayout.tsx` -- Skip onboarding redirect for agency users

### Database Changes
- Create `agency_applications` table with all columns, indexes, and RLS policies
- Delete 17 test users from `auth.users`

### No New Dependencies Required
