
# Plan: Add ElevenLabs Webhook HMAC Secret

## What This Does
Adds the `ELEVENLABS_CONVAI_WEBHOOK_SECRET` to your backend so the edge functions can verify that incoming webhook requests are actually from ElevenLabs (not spoofed).

---

## Step 1: Add the Secret

I will use the `add_secret` tool to prompt you to enter your ElevenLabs webhook HMAC secret. This secret will be stored securely in your backend and will **never** appear in frontend code.

**Secret Name:** `ELEVENLABS_CONVAI_WEBHOOK_SECRET`  
**Where it comes from:** ElevenLabs dashboard (when you created the webhook, it should have shown an HMAC secret)

---

## Step 2: Update Edge Functions to Verify Signatures

Add HMAC signature verification to both webhook functions:

### elevenlabs-webhook (Post-Call Webhook)
- Read the `x-elevenlabs-signature` header from incoming requests
- Compute HMAC-SHA256 of the raw request body using your secret
- Compare signatures; reject if they don't match
- If secret is not configured, allow requests through (for backwards compatibility)

### elevenlabs-init (Client Data Webhook)
- Already has placeholder for `ELEVENLABS_INIT_SECRET` validation
- Will update to also check `ELEVENLABS_CONVAI_WEBHOOK_SECRET` for consistency

---

## Technical Details

**HMAC Verification Logic (Deno):**
```text
1. Get raw body text
2. Get signature from header: x-elevenlabs-signature
3. Compute: HMAC-SHA256(rawBody, secret)
4. Compare computed signature to provided signature
5. If mismatch and secret is configured: reject with 401
6. If secret not configured: allow (logs warning)
```

**Files to Modify:**
- `supabase/functions/elevenlabs-webhook/index.ts` - Add signature verification
- `supabase/functions/elevenlabs-init/index.ts` - Align signature verification

---

## Security Benefits
- Prevents malicious actors from sending fake call data
- Ensures only ElevenLabs can trigger your webhooks
- Industry standard HMAC verification pattern

---

## What You'll Need to Do
1. Approve this plan
2. Paste your HMAC secret when prompted (I'll request it securely)
3. Test a call to verify everything still works
