/**
 * Set up ElevenLabs post-call webhook using the new workspace webhooks API.
 *
 * The old webhook.url format no longer works. New flow:
 * 1. POST /v1/workspace/webhooks to create webhook -> get webhook_id
 * 2. PATCH /v1/convai/settings with webhooks.post_call_webhook_id
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const WEBHOOK_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1/elevenlabs-webhook";

async function main() {
  console.log("=".repeat(60));
  console.log("SETTING UP POST-CALL WEBHOOK");
  console.log("=".repeat(60));

  // Step 1: Check existing webhooks
  console.log("\n1. Checking existing workspace webhooks...");
  const listRes = await fetch("https://api.elevenlabs.io/v1/workspace/webhooks", {
    headers: { "xi-api-key": API_KEY }
  });

  if (listRes.ok) {
    const webhooks = await listRes.json();
    console.log("  Existing webhooks:", JSON.stringify(webhooks, null, 2));

    // Check if our webhook already exists
    const existing = (webhooks.webhooks || webhooks || []).find(w =>
      w.webhook_url === WEBHOOK_URL || w.settings?.webhook_url === WEBHOOK_URL
    );
    if (existing) {
      console.log(`  Found existing webhook: ${existing.webhook_id}`);
      console.log("  Assigning to ConvAI settings...");
      await assignWebhook(existing.webhook_id);
      return;
    }
  } else {
    console.log(`  List webhooks failed: ${listRes.status}`);
    const body = await listRes.text();
    console.log(`  Response: ${body.substring(0, 300)}`);
  }

  // Step 2: Create new workspace webhook
  console.log("\n2. Creating workspace webhook...");
  const createRes = await fetch("https://api.elevenlabs.io/v1/workspace/webhooks", {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      settings: {
        auth_type: "hmac",
        name: "Flux Receptionist Post-Call",
        webhook_url: WEBHOOK_URL,
      }
    }),
  });

  console.log(`  Create status: ${createRes.status}`);
  const createBody = await createRes.json();
  console.log("  Create response:", JSON.stringify(createBody, null, 2));

  if (createRes.ok) {
    const webhookId = createBody.webhook_id;
    const webhookSecret = createBody.webhook_secret;
    console.log(`\n  Webhook ID: ${webhookId}`);
    console.log(`  Webhook Secret: ${webhookSecret}`);
    console.log("  SAVE THIS SECRET - you need it for HMAC verification!");

    // Step 3: Assign to ConvAI settings
    await assignWebhook(webhookId);
  } else {
    console.log("  FAILED to create webhook. Trying alternative approach...");

    // Try the old-style approach as fallback
    console.log("\n  Trying direct ConvAI settings update...");
    const directRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
      method: "PATCH",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhooks: {
          events: ["transcript"],
        },
        conversation_initiation_client_data_webhook: {
          url: WEBHOOK_URL,
        }
      }),
    });
    console.log(`  Direct update status: ${directRes.status}`);
    const directBody = await directRes.json();
    console.log("  Direct update response:", JSON.stringify(directBody, null, 2));
  }

  // Final verification
  console.log("\n" + "=".repeat(60));
  console.log("FINAL VERIFICATION");
  console.log("=".repeat(60));

  const verifyRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    headers: { "xi-api-key": API_KEY }
  });
  const settings = await verifyRes.json();
  console.log("  ConvAI settings:", JSON.stringify(settings, null, 2));
}

async function assignWebhook(webhookId) {
  console.log(`\n3. Assigning webhook ${webhookId} to ConvAI settings...`);
  const patchRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhooks: {
        post_call_webhook_id: webhookId,
        events: ["transcript"],
      }
    }),
  });

  console.log(`  PATCH status: ${patchRes.status}`);
  const patchBody = await patchRes.json();
  console.log("  PATCH response:", JSON.stringify(patchBody, null, 2));

  if (patchBody.webhooks?.post_call_webhook_id === webhookId) {
    console.log("  SUCCESS - webhook assigned!");
  } else {
    console.log("  WARNING - webhook ID not reflected in response");
  }
}

main().catch(console.error);
