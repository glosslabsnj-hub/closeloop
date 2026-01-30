

# Enable One-Click Google Calendar Connection

## Current State
The OAuth flow is fully implemented:
- `calendar-oauth-start` generates the Google OAuth URL
- `calendar-oauth-callback` exchanges the code for tokens and stores them
- The UI already has "Connect Google Calendar" buttons

**What's missing:** 3 backend secrets that tell Google who your app is.

## What You Need to Do (One-Time Setup)

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services > Library**
4. Search for and enable **Google Calendar API**
5. Go to **APIs & Services > Credentials**
6. Click **Create Credentials > OAuth client ID**
7. Select **Web application**
8. Add authorized redirect URI:
   ```
   https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/calendar-oauth-callback
   ```
9. Click **Create** and copy your **Client ID** and **Client Secret**

### Step 2: Add Secrets to Your Project

I'll add these 3 secrets to your backend:

| Secret Name | Value |
|-------------|-------|
| `GOOGLE_CALENDAR_CLIENT_ID` | Your Client ID from step 9 |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Your Client Secret from step 9 |
| `GOOGLE_CALENDAR_REDIRECT_URI` | `https://zsqfzluyylzmmjtfxwgr.supabase.co/functions/v1/calendar-oauth-callback` |

### Step 3: Configure OAuth Consent Screen

Before users can connect, you need to configure the consent screen:

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** (unless you have Google Workspace)
3. Fill in:
   - App name: "CloseLoop"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `../auth/calendar.readonly`
   - `../auth/calendar.events`
   - `../auth/calendar.freebusy`
5. Add test users (your email) while in testing mode

## What I'll Implement

Once you provide the Client ID and Secret, I'll:

1. Add the 3 secrets to your backend
2. Redeploy the edge functions (they'll pick up the new secrets)
3. The "Connect Google Calendar" button will work immediately

## End Result

After setup, your users (and you) will:
1. Click "Connect Google Calendar"
2. See Google sign-in popup
3. Select Google account
4. Grant calendar permission
5. Popup closes automatically
6. Calendar appears as "Connected" with a green checkmark

The AI will then see all your real calendar events and block those times automatically.

## Optional: Microsoft Outlook

Same process for Outlook (requires Azure Portal instead of Google Cloud Console). Let me know if you want both.

## Next Steps

When you're ready, I'll prompt you to enter your Google OAuth Client ID and Secret. Would you like to proceed?

