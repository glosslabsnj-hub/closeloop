/**
 * Shared email sending utility using Resend API.
 * Extracted from send-review-request pattern for reuse across all edge functions.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  businessName?: string;
}

export interface SendEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.log("[sendEmail] RESEND_API_KEY not configured, email skipped");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  if (!params.to) {
    return { success: false, error: "Missing recipient email" };
  }

  const from = params.from || `${params.businessName || "Flux Receptionist"} <notifications@getfluxdata.com>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[sendEmail] Resend error:", errText);
      return { success: false, error: errText };
    }

    const result = await response.json();
    return { success: true, resendId: result.id };
  } catch (err) {
    console.error("[sendEmail] Exception:", err);
    return { success: false, error: String(err) };
  }
}
