

# Fix Inventory Cover Photos + ElevenLabs Tool Clarification

## Problem 1: Wrong Photos Showing on Inventory Cards

The scraper initially captures the correct cover photo from the listing page. But then during the "deep scrape" enrichment step, it visits each vehicle's detail page and collects ALL photos from that page (lines 184-193 in `scrape-carsforsale`). This replaces the original cover photo array with the full gallery, and the first image in that gallery may not be the same as the listing thumbnail.

### Fix

Preserve the original listing cover photo as the first element in `photo_urls`, and append any additional detail-page photos after it. This ensures `photo_urls[0]` is always the cover photo shown on cards.

**File to modify**: `supabase/functions/scrape-carsforsale/index.ts`

- In the enrichment section (~line 326-331), instead of blindly replacing `photo_urls` with the detail page photos, prepend the original `photo_url` (cover) and deduplicate:

```
Before: if (detail.photo_urls && detail.photo_urls.length > 0) v.photo_urls = detail.photo_urls;

After:  if (detail.photo_urls && detail.photo_urls.length > 0) {
          // Keep original cover photo first, append detail photos
          const cover = v.photo_url || v.photo_urls?.[0];
          const allPhotos = cover
            ? [cover, ...detail.photo_urls.filter(u => u !== cover)]
            : detail.photo_urls;
          v.photo_urls = allPhotos;
        }
```

This is a one-line change in the edge function. The UI code (`SalesInventoryPage.tsx`) already correctly uses `photo_urls[0]` for the card thumbnail -- no frontend changes needed.

---

## Problem 2: ElevenLabs Tools -- Already Universal, No Per-Client Config Needed

Good news: **you do NOT need to configure different endpoints per client.** Here's why:

- All 5 tool edge functions (`elevenlabs-check-availability`, `elevenlabs-create-booking`, etc.) accept `tenant_id` as a parameter
- `tenant_id` is injected as a **Dynamic Variable** (`{{tenant_id}}`) in the ElevenLabs dashboard
- When a call comes in via Twilio, `twilio-inbound` passes `tenant_id` in the `dynamic_variables` payload to ElevenLabs
- ElevenLabs then passes that `tenant_id` to every tool call automatically

So the same agent with the same tool URLs works for DreamDrive, and every future tenant. The tools route to the correct tenant's data based on the `tenant_id` variable.

**What to verify in ElevenLabs dashboard**: Make sure each tool's `tenant_id` parameter is set to type "Dynamic Variable" with value `{{tenant_id}}`, and `customer_phone` (on create_booking and create_callback) is set to `{{caller_phone}}`. If those are configured, every tenant's calls will route correctly through the same agent.

---

## Summary of Code Changes

| File | Change |
|------|--------|
| `supabase/functions/scrape-carsforsale/index.ts` | Preserve original cover photo as first element when merging detail-page photos |

No database changes. No frontend changes. Just one edge function fix + redeploy.
