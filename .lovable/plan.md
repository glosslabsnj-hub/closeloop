
# Security Hardening: Move Sensitive API Configuration to Backend

## Summary

This plan addresses security vulnerabilities where sensitive configuration data is exposed in the frontend codebase. We'll move these to secure backend storage and create appropriate edge functions to serve them safely.

---

## Issues Identified

| Issue | Severity | Location | Risk |
|-------|----------|----------|------|
| Hardcoded admin secret | Critical | `admin-reset-password/index.ts` | Anyone can reset user passwords |
| Hardcoded ElevenLabs voice IDs | Medium | `VoiceSelector.tsx` | Exposes vendor-specific IDs in client bundle |
| Direct fetch pattern | Low | `VoiceSelector.tsx` | Less maintainable than SDK pattern |

---

## Implementation Plan

### Phase 1: Fix Critical Admin Secret

**File:** `supabase/functions/admin-reset-password/index.ts`

Replace the hardcoded secret with the existing `ADMIN_CLEANUP_SECRET` environment variable:

```text
Before:
  if (admin_secret !== "closeloop-admin-2024")

After:
  const ADMIN_RESET_SECRET = Deno.env.get("ADMIN_CLEANUP_SECRET");
  if (!ADMIN_RESET_SECRET || admin_secret !== ADMIN_RESET_SECRET)
```

This uses the already-configured `ADMIN_CLEANUP_SECRET` from the secrets store.

---

### Phase 2: Move Voice Configuration to Backend

**Step 1: Create new edge function `get-voice-options`**

Create a new edge function that returns available voice options from a secure backend source:

```text
supabase/functions/get-voice-options/index.ts
```

This function will:
- Require authentication via JWT
- Return voice options stored in the database or secrets
- Never expose ElevenLabs voice IDs directly (use friendly IDs like "james", "sarah")

**Step 2: Add voice configuration to database**

Create a new table `voice_options` to store available voices:

| Column | Type | Description |
|--------|------|-------------|
| id | text | Friendly ID (e.g., "james") |
| name | text | Display name |
| description | text | Voice description |
| provider_voice_id | text | Actual ElevenLabs ID |
| is_active | boolean | Whether voice is available |

RLS Policy: Read-only for authenticated users, write for service role only.

**Step 3: Update VoiceSelector component**

Refactor `VoiceSelector.tsx` to:
- Fetch voice options from the new edge function
- Remove hardcoded voice IDs
- Use Supabase client's `functions.invoke()` pattern
- Handle loading and error states

---

### Phase 3: Improve API Call Patterns

**Update TTS preview call**

Replace direct fetch with Supabase SDK pattern:

```text
Before:
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
    { method: "POST", headers: {...}, body: ... }
  );

After:
  const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
    body: { text, voiceId }
  });
```

This centralizes authentication handling and error management.

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/get-voice-options/index.ts` | Secure voice options endpoint |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/admin-reset-password/index.ts` | Use environment secret instead of hardcoded |
| `src/components/ai/VoiceSelector.tsx` | Fetch voices from backend, use SDK pattern |

## Database Changes

| Change | Details |
|--------|---------|
| New table `voice_options` | Stores voice configurations securely |
| RLS policies | Read-only for authenticated users |

---

## Technical Details

### Edge Function: get-voice-options

```text
Flow:
1. Verify JWT authentication
2. Query voice_options table (is_active = true)
3. Return only safe fields (id, name, description)
4. Never return provider_voice_id to frontend
```

### Database Migration

```sql
CREATE TABLE public.voice_options (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  provider_voice_id text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed default voices
INSERT INTO voice_options VALUES 
  ('james', 'James', 'Professional and confident male voice', 'TX3LPaxmHKxFdv7VOQHJ', true),
  ('sarah', 'Sarah', 'Warm and friendly female voice', 'EXAVITQu4vr4xnSDxMaL', true);

-- RLS
ALTER TABLE voice_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read" ON voice_options 
  FOR SELECT TO authenticated USING (is_active = true);
```

### Updated VoiceSelector Flow

```text
1. Component mounts
2. Call supabase.functions.invoke("get-voice-options")
3. Display loading state while fetching
4. Render voice options from response
5. When preview clicked, call elevenlabs-tts with friendly voice ID
6. Edge function resolves friendly ID -> provider ID on backend
```

---

## Security Benefits

- Admin password reset now requires proper secret from Supabase secrets
- Voice provider IDs never exposed in client JavaScript bundle
- All sensitive lookups happen server-side
- Consistent authentication pattern across all API calls

---

## Rollout

1. Deploy edge functions first (they're backwards compatible)
2. Run database migration
3. Deploy frontend changes
4. Verify voice preview still works
5. Test admin password reset with proper secret
