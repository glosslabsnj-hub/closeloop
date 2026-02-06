import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EstimateLineItem {
  name: string;
  description?: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface PricingOption {
  name: string;
  description?: string;
  line_items: EstimateLineItem[];
  total_cents: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function generatePdfHtml(
  estimate: {
    estimate_number: string;
    title: string | null;
    status: string;
    line_items: EstimateLineItem[];
    pricing_options: PricingOption[] | null;
    subtotal_cents: number | null;
    tax_rate_percent: number | null;
    tax_cents: number | null;
    discount_cents: number | null;
    total_cents: number | null;
    valid_until: string | null;
    customer_notes: string | null;
    terms_and_conditions: string | null;
    created_at: string;
    signature_data: string | null;
    signed_at: string | null;
  },
  tenant: { business_name: string | null; phone: string | null; email: string | null; address?: string | null },
  customer: { full_name: string | null; email: string | null; phone_e164: string | null; address?: string | null }
): string {
  const lineItemsHtml = estimate.line_items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.name}</strong>
          ${item.description ? `<br><span style="color: #6b7280; font-size: 12px;">${item.description}</span>` : ""}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price_cents)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.total_cents)}</td>
      </tr>
    `
    )
    .join("");

  const pricingOptionsHtml = estimate.pricing_options
    ? `
      <div style="margin: 30px 0; page-break-inside: avoid;">
        <h3 style="color: #374151; margin-bottom: 15px;">Pricing Options</h3>
        <div style="display: flex; gap: 20px;">
          ${estimate.pricing_options
            .map(
              (option, index) => `
              <div style="flex: 1; border: 2px solid ${index === 1 ? "#10b981" : "#e5e7eb"}; border-radius: 8px; padding: 15px; ${index === 1 ? "background: #ecfdf5;" : ""}">
                <h4 style="margin: 0 0 5px 0;">${option.name}</h4>
                ${option.description ? `<p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">${option.description}</p>` : ""}
                <p style="font-size: 24px; font-weight: bold; margin: 0; color: ${index === 1 ? "#059669" : "#374151"};">${formatCurrency(option.total_cents)}</p>
                ${index === 1 ? '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px;">RECOMMENDED</span>' : ""}
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    `
    : "";

  const signatureHtml = estimate.signature_data
    ? `
      <div style="margin-top: 40px; border-top: 2px solid #e5e7eb; padding-top: 20px;">
        <h3 style="color: #374151; margin-bottom: 15px;">Customer Acceptance</h3>
        <div style="display: flex; justify-content: space-between; align-items: end;">
          <div>
            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Signature:</p>
            <img src="${estimate.signature_data}" style="max-width: 200px; max-height: 80px;" />
          </div>
          <div style="text-align: right;">
            <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">Date Signed:</p>
            <p style="margin: 0; font-weight: 500;">${estimate.signed_at ? formatDate(estimate.signed_at) : ""}</p>
          </div>
        </div>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Estimate ${estimate.estimate_number}</title>
  <style>
    @page { margin: 40px; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #374151; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; text-align: left; padding: 10px; font-weight: 600; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company { }
    .estimate-info { text-align: right; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-draft { background: #f3f4f6; color: #6b7280; }
    .status-sent { background: #dbeafe; color: #1d4ed8; }
    .status-accepted { background: #dcfce7; color: #16a34a; }
    .status-declined { background: #fee2e2; color: #dc2626; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="company">
      <h1 style="margin: 0; color: #111827;">${tenant.business_name || "Company Name"}</h1>
      ${tenant.address ? `<p style="margin: 5px 0; color: #6b7280;">${tenant.address}</p>` : ""}
      ${tenant.phone ? `<p style="margin: 5px 0; color: #6b7280;">Phone: ${tenant.phone}</p>` : ""}
      ${tenant.email ? `<p style="margin: 5px 0; color: #6b7280;">Email: ${tenant.email}</p>` : ""}
    </div>
    <div class="estimate-info">
      <h2 style="margin: 0; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Estimate</h2>
      <p style="margin: 10px 0; font-size: 18px; font-weight: 600;">#${estimate.estimate_number}</p>
      <p style="margin: 5px 0; color: #6b7280;">Date: ${formatDate(estimate.created_at)}</p>
      ${estimate.valid_until ? `<p style="margin: 5px 0; color: #6b7280;">Valid Until: ${formatDate(estimate.valid_until)}</p>` : ""}
      <span class="status-badge status-${estimate.status}">${estimate.status}</span>
    </div>
  </div>

  <!-- Customer Info -->
  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
    <h3 style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Bill To</h3>
    <p style="margin: 0; font-size: 16px; font-weight: 600;">${customer.full_name || "Customer"}</p>
    ${customer.address ? `<p style="margin: 5px 0; color: #6b7280;">${customer.address}</p>` : ""}
    ${customer.email ? `<p style="margin: 5px 0; color: #6b7280;">${customer.email}</p>` : ""}
    ${customer.phone_e164 ? `<p style="margin: 5px 0; color: #6b7280;">${customer.phone_e164}</p>` : ""}
  </div>

  <!-- Title -->
  ${estimate.title ? `<h2 style="margin: 0 0 20px 0;">${estimate.title}</h2>` : ""}

  <!-- Line Items -->
  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Description</th>
        <th style="width: 15%; text-align: center;">Qty</th>
        <th style="width: 17.5%; text-align: right;">Unit Price</th>
        <th style="width: 17.5%; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
    <div style="width: 250px;">
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        <span>Subtotal</span>
        <span>${formatCurrency(estimate.subtotal_cents || 0)}</span>
      </div>
      ${(estimate.discount_cents || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #16a34a;">
          <span>Discount</span>
          <span>-${formatCurrency(estimate.discount_cents || 0)}</span>
        </div>
      ` : ""}
      ${(estimate.tax_cents || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span>Tax (${estimate.tax_rate_percent || 0}%)</span>
          <span>${formatCurrency(estimate.tax_cents || 0)}</span>
        </div>
      ` : ""}
      <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: 700;">
        <span>Total</span>
        <span>${formatCurrency(estimate.total_cents || 0)}</span>
      </div>
    </div>
  </div>

  <!-- Pricing Options (if applicable) -->
  ${pricingOptionsHtml}

  <!-- Customer Notes -->
  ${estimate.customer_notes ? `
    <div style="margin-top: 30px;">
      <h3 style="color: #374151; margin-bottom: 10px;">Notes</h3>
      <p style="color: #6b7280; white-space: pre-wrap;">${estimate.customer_notes}</p>
    </div>
  ` : ""}

  <!-- Terms & Conditions -->
  ${estimate.terms_and_conditions ? `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <h3 style="color: #374151; margin-bottom: 10px; font-size: 14px;">Terms & Conditions</h3>
      <p style="color: #6b7280; font-size: 12px; white-space: pre-wrap;">${estimate.terms_and_conditions}</p>
    </div>
  ` : ""}

  <!-- Signature -->
  ${signatureHtml}

  <!-- Footer -->
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>Thank you for your business!</p>
    <p>Generated by CloseLoop</p>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estimate_id, format = "html" } = await req.json();

    if (!estimate_id) {
      return new Response(
        JSON.stringify({ error: "estimate_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch estimate with tenant and customer info
    const { data: estimate, error: fetchError } = await supabase
      .from("estimates")
      .select(`
        *,
        tenant:tenants(business_name, phone, email),
        customer:customers(full_name, email, phone_e164, address)
      `)
      .eq("id", estimate_id)
      .single();

    if (fetchError || !estimate) {
      console.error("Error fetching estimate:", fetchError);
      return new Response(
        JSON.stringify({ error: "Estimate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate HTML
    const html = generatePdfHtml(
      estimate,
      estimate.tenant || { business_name: null, phone: null, email: null },
      estimate.customer || { full_name: null, email: null, phone_e164: null }
    );

    // If format is HTML, return the HTML directly (can be used for printing)
    if (format === "html") {
      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    // For PDF format, use a PDF generation service
    // Option 1: Use PDFShift API
    const pdfshiftApiKey = Deno.env.get("PDFSHIFT_API_KEY");

    if (pdfshiftApiKey) {
      const pdfResponse = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${pdfshiftApiKey}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: html,
          landscape: false,
          use_print: true,
        }),
      });

      if (!pdfResponse.ok) {
        throw new Error("PDF generation failed");
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();

      // Store PDF in Supabase Storage
      const fileName = `estimates/${estimate.tenant_id}/${estimate_id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error uploading PDF:", uploadError);
      } else {
        // Get public URL and update estimate
        const { data: { publicUrl } } = supabase.storage
          .from("documents")
          .getPublicUrl(fileName);

        await supabase
          .from("estimates")
          .update({
            pdf_url: publicUrl,
            pdf_generated_at: new Date().toISOString(),
          })
          .eq("id", estimate_id);
      }

      return new Response(pdfBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Estimate-${estimate.estimate_number}.pdf"`,
        },
      });
    }

    // Fallback: Return HTML with instructions to print as PDF
    return new Response(
      JSON.stringify({
        success: true,
        format: "html",
        message: "PDF service not configured. Use the HTML version and print to PDF.",
        html_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/estimate-generate-pdf?estimate_id=${estimate_id}&format=html`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
