import { EDGE_FUNCTION_CATALOG } from "@/data/blueprintData";

const DOMAIN_ORDER = [
  "Voice", "Booking", "Dispatch", "Food", "Recovery",
  "Knowledge", "Calendar", "Telephony", "Intelligence",
  "Integrations", "Admin", "Cron", "Utilities",
];

export function EdgeFunctionsSection() {
  const byDomain = new Map<string, typeof EDGE_FUNCTION_CATALOG>();
  for (const fn of EDGE_FUNCTION_CATALOG) {
    if (!byDomain.has(fn.domain)) byDomain.set(fn.domain, []);
    byDomain.get(fn.domain)!.push(fn);
  }

  return (
    <section id="edge-functions" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-2 print:text-black">7. Edge Functions</h2>
      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        <span className="font-semibold text-foreground print:text-black">{EDGE_FUNCTION_CATALOG.length} Supabase Edge Functions</span> (Deno runtime)
        organized by domain. Each function handles a specific piece of server-side logic.
      </p>

      {DOMAIN_ORDER.map((domain) => {
        const fns = byDomain.get(domain);
        if (!fns || fns.length === 0) return null;

        return (
          <div key={domain} className="mb-8">
            <h3 className="text-lg font-semibold mb-2">
              {domain}
              <span className="text-sm font-normal text-muted-foreground ml-2">({fns.length})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 px-3 font-semibold">Function</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Description</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {fns.map((fn) => (
                    <tr key={fn.name} className="border-b border-border/50">
                      <td className="py-1.5 px-3 font-mono text-xs font-medium whitespace-nowrap">{fn.name}</td>
                      <td className="py-1.5 px-3 text-muted-foreground print:text-gray-700 text-xs">{fn.description}</td>
                      <td className="py-1.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{fn.trigger || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}
