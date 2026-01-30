

# Plan: Update ElevenLabs Webhook Secret

## What's Happening
The HMAC signature verification is failing because the secret stored in the backend doesn't match the one configured in ElevenLabs. You've provided the correct secret value.

---

## Step 1: Update the Secret

I will use the `add_secret` tool to update `ELEVENLABS_CONVAI_WEBHOOK_SECRET` with the value you provided:

```
wsec_74cd0f698489b0c03c11d9f904d41a7fbdb90a45a392d1089387e41844cd46b7
```

This will overwrite the existing secret with the correct one.

---

## Step 2: Verify

After updating:
1. Run another simulator test call
2. Check the logs - should now show "HMAC signature verified successfully" and return 200

---

## Expected Outcome
- `elevenlabs-webhook` will return **200 OK** instead of 401
- Call transcripts and metadata will be processed correctly
- Logs will confirm successful signature verification

