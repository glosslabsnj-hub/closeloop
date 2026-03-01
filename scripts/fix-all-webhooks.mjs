/**
 * Set BOTH webhooks in a single PATCH to avoid overwriting each other.
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const INIT_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1/elevenlabs-init";
const POST_CALL_WEBHOOK_ID = "64239813d7204643a7c853d38d7492ac";

async function main() {
  console.log("Setting both webhooks in single PATCH...\n");

  const res = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_initiation_client_data_webhook: {
        url: INIT_URL,
        request_headers: {
          "content-type": "application/json",
        },
      },
      webhooks: {
        post_call_webhook_id: POST_CALL_WEBHOOK_ID,
        events: ["transcript"],
      },
    }),
  });

  console.log(`Status: ${res.status}`);
  const body = await res.json();
  console.log("Response:", JSON.stringify(body, null, 2));

  // Verify
  const verifyRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    headers: { "xi-api-key": API_KEY }
  });
  const settings = await verifyRes.json();
  console.log("\nFinal state:");
  console.log("  Init webhook:", settings.conversation_initiation_client_data_webhook?.url || "NOT SET");
  console.log("  Post-call webhook:", settings.webhooks?.post_call_webhook_id || "NOT SET");
  console.log("  Events:", JSON.stringify(settings.webhooks?.events || []));
}

main().catch(console.error);
