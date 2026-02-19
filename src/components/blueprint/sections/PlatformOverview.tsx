import { BRAND } from "@/config/brand";
import { industryCatalog, categoryLabels, type IndustryCategory } from "@/data/industryCatalog";

const BUSINESS_MODES = [
  { mode: "service", label: "Service", description: "Appointment-based businesses (HVAC, plumbing, salons, auto shops)" },
  { mode: "dispatch", label: "Dispatch", description: "Mobile/field service with driver assignment (towing, delivery, field techs)" },
  { mode: "food", label: "Food", description: "Restaurant and food service (dine-in, takeout, delivery, catering)" },
  { mode: "medical", label: "Medical", description: "Healthcare practices with HIPAA compliance (clinics, dentists, vets)" },
  { mode: "general", label: "General", description: "General businesses needing call handling (law, accounting, consulting)" },
  { mode: "sales", label: "Sales", description: "Sales-focused businesses with pipeline management (dealerships, real estate)" },
];

export function PlatformOverview() {
  const categoryKeys = Object.keys(categoryLabels) as IndustryCategory[];

  return (
    <section id="platform-overview" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-6 print:text-black">1. Platform Overview</h2>

      <h3 className="text-xl font-semibold mb-3">What is {BRAND.name}?</h3>
      <p className="text-muted-foreground mb-6 print:text-gray-700">
        {BRAND.name} is an AI-powered voice receptionist platform that answers business phone calls 24/7.
        It qualifies leads, books appointments, dispatches jobs, takes food orders, and handles customer inquiries —
        all through natural voice conversation. Every call is captured, classified, and routed to the right outcome.
        <span className="font-medium text-foreground print:text-black"> {BRAND.tagline}</span>
      </p>

      <h3 className="text-xl font-semibold mb-3">6 Business Modes</h3>
      <p className="text-sm text-muted-foreground mb-3 print:text-gray-600">
        Every tenant operates in one of six modes. The mode determines which modules, tools, and AI behaviors are active.
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Mode</th>
              <th className="text-left py-2 px-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {BUSINESS_MODES.map((m) => (
              <tr key={m.mode} className="border-b border-border/50">
                <td className="py-2 px-3 font-mono text-xs">{m.mode}</td>
                <td className="py-2 px-3 text-muted-foreground print:text-gray-700">{m.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-xl font-semibold mb-3">{categoryKeys.length} Industry Categories</h3>
      <p className="text-sm text-muted-foreground mb-3 print:text-gray-600">
        {industryCatalog.length} industries organized into {categoryKeys.length} categories.
        Each industry includes pre-configured services, FAQs, policies, and AI training data.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
        {categoryKeys.map((key) => {
          const count = industryCatalog.filter((i) => i.category === key).length;
          return (
            <div key={key} className="border rounded-lg px-3 py-2 text-sm">
              <span className="font-medium">{categoryLabels[key]}</span>
              <span className="text-muted-foreground ml-2">({count})</span>
            </div>
          );
        })}
      </div>

      <h3 className="text-xl font-semibold mb-3">Architecture Overview</h3>
      <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto font-mono print:bg-gray-100 print:text-black">
{`┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Customer    │────▶│   Twilio      │────▶│  Edge Function  │
│  Phone Call  │     │  (SIP/PSTN)   │     │  (Deno/Supabase)│
└─────────────┘     └──────────────┘     └───────┬────────┘
                                                  │
                    ┌──────────────┐     ┌────────▼────────┐
                    │  ElevenLabs  │◀───▶│  AI Context      │
                    │  Voice Agent │     │  Builder         │
                    └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────▼───────┐     ┌─────────────────┐
                    │  Agent Tools │────▶│  Supabase DB     │
                    │  (book, etc.)│     │  (Postgres + RLS)│
                    └──────────────┘     └─────────────────┘
                                                  │
                    ┌──────────────┐     ┌────────▼────────┐
                    │  React SPA   │◀───▶│  React Query     │
                    │  Dashboard   │     │  + Realtime Sub  │
                    └──────────────┘     └─────────────────┘`}
      </pre>
    </section>
  );
}
