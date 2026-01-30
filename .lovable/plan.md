

# Fix Calendar Connection - Missing OAuth Credentials

## The Problem

When you click "Connect Google Calendar" or "Connect Outlook", the edge function returns a 500 error because **OAuth credentials are not configured**.

The error message from the backend:
> "Google Calendar not configured. Please add GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI secrets."

## Why This Happens

Calendar sync requires OAuth apps registered with Google and Microsoft. Your AI needs permission to read your calendar, and that permission flow requires:

1. **OAuth Client ID** - Identifies your app to Google/Microsoft
2. **OAuth Client Secret** - Authenticates your app
3. **Redirect URI** - Where users return after granting permission

These credentials don't exist in your project yet.

## Two Options to Fix This

### Option A: Set Up Your Own OAuth Credentials (Full Control)

You would need to:

1. **For Google Calendar:**
   - Go to Google Cloud Console
   - Create a new project or use existing
   - Enable the Google Calendar API
   - Create OAuth 2.0 credentials
   - Add these secrets to your project:
     - `GOOGLE_CALENDAR_CLIENT_ID`
     - `GOOGLE_CALENDAR_CLIENT_SECRET`
     - `GOOGLE_CALENDAR_REDIRECT_URI` = `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/calendar-oauth-callback`

2. **For Microsoft/Outlook:**
   - Go to Azure Portal → App Registrations
   - Create new registration
   - Add Calendar permissions
   - Add these secrets:
     - `MS_CALENDAR_CLIENT_ID`
     - `MS_CALENDAR_CLIENT_SECRET`
     - `MS_CALENDAR_REDIRECT_URI` = `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/calendar-oauth-callback`

### Option B: Better UX - Show Clear Setup Instructions (Recommended)

Instead of silently failing, update the UI to:

1. **Show a clear message** when OAuth isn't configured
2. **Provide setup instructions** for admins to add credentials
3. **Fallback to ICS** for users who can't set up OAuth
4. **Hide unconfigured options** gracefully

## Proposed Implementation (Option B)

### Phase 1: Improve Error Handling in UI

Update `CalendarConnectionWizard.tsx` to:
- Catch the specific "not configured" error
- Show a helpful message instead of generic "Connection failed"
- Suggest ICS as an alternative

### Phase 2: Add OAuth Status Check

Create a simple endpoint or use the existing error to detect which providers are configured, then:
- Gray out unavailable options with "Coming soon" or "Setup required"
- Show only configured providers as clickable
- Provide admin instructions for setup

### Phase 3: Emphasize ICS Option

Since ICS doesn't require OAuth setup:
- Move it higher in the list
- Add better instructions for getting ICS URL from Google/Outlook
- Mark it as "Works with any calendar"

### Phase 4: Add Secrets (If You Want OAuth)

If you want to enable direct Google/Outlook OAuth, I can guide you through:
1. Creating Google OAuth credentials
2. Creating Microsoft OAuth credentials
3. Adding the 6 required secrets to your project

---

## Recommended Next Steps

1. **Quick fix**: Update the UI to show a helpful error message instead of generic failure, and highlight ICS as the working alternative

2. **If you want OAuth**: Let me know and I'll walk you through setting up Google Cloud Console and Azure AD credentials

Which approach would you prefer?

