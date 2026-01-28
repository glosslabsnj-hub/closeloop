
# Fix Business Name Issue

## The Problem
Your AI agent says "business name" literally instead of "Elite Auto Detailing" because the ElevenLabs agent configuration contains the literal text "business name" rather than the template variable `{{business_name}}`.

The code is working correctly - logs confirm we're passing `business_name: "Elite Auto Detailing"` to ElevenLabs. But ElevenLabs only replaces placeholders written as `{{variable_name}}`.

## The Fix

### Step 1: Update ElevenLabs Agent (Required - in ElevenLabs dashboard)
Log into your ElevenLabs dashboard and edit your agent's configuration:

1. **First Message** - Change from:
   ```
   Hello, thank you for calling business name. How can I help you today?
   ```
   To:
   ```
   Hello, thank you for calling {{business_name}}. How can I help you today?
   ```

2. **System Prompt** - Find any occurrences of "business name" and replace with `{{business_name}}`

3. You can also use these other variables we're passing:
   - `{{business_hours_today}}` - e.g., "08:00 - 18:00"
   - `{{booking_link}}` - e.g., "https://eliteautodetailing.com"

### Step 2: Code Enhancement (Optional - for tenant-controlled greeting)
If you want tenants to customize their greeting through the app (via the Scripts tab), I'll add code to pass the `greeting_script` from the database as a dynamic variable, and you'll update ElevenLabs to use `{{greeting_script}}` instead of a hardcoded first message.

**Files to Change:**
| File | Change |
|------|--------|
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Add `greeting_script` to dynamic variables fetched from `ai_assistants` table |
| `supabase/functions/twilio-inbound/index.ts` | Add `greeting_script` to dynamic variables passed to register-call |

## Summary
- **Primary fix**: Change "business name" → `{{business_name}}` in ElevenLabs
- **Optional enhancement**: Wire the app's greeting script into dynamic variables so tenants can customize via the Scripts tab

Once you update ElevenLabs, both browser tests and phone calls will correctly say "Elite Auto Detailing" without any code changes.
