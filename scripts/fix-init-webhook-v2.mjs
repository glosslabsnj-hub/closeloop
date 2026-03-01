/**
 * Set the conversation initiation client data webhook at the workspace level.
 * This webhook fires when any call starts and provides dynamic variables.
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const INIT_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1/elevenlabs-init";

async function main() {
  // Check current
  console.log("Current settings:");
  let res = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    headers: { "xi-api-key": API_KEY }
  });
  let settings = await res.json();
  console.log("  Init webhook:", JSON.stringify(settings.conversation_initiation_client_data_webhook));

  // Set with proper format including request_headers
  console.log("\nSetting init webhook...");
  res = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
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
    }),
  });

  console.log(`Status: ${res.status}`);
  const body = await res.json();
  console.log("Response:", JSON.stringify(body, null, 2));

  // Verify
  console.log("\nVerification:");
  res = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
    headers: { "xi-api-key": API_KEY }
  });
  settings = await res.json();
  console.log("  Init webhook:", JSON.stringify(settings.conversation_initiation_client_data_webhook));
  console.log("  Post-call webhook:", settings.webhooks?.post_call_webhook_id);
}

main().catch(console.error);
