import { HOOK_CATALOG } from "@/data/blueprintData";

const DOMAIN_ORDER = [
  "Auth", "Bookings", "Leads", "Customers", "Calls",
  "Services", "AI", "Dispatch", "Orders", "Medical",
  "Sales", "Operations", "Knowledge", "Automation",
  "Analytics", "Estimates", "Agreements", "Admin",
  "Settings", "Impound",
];

export function HooksStateSection() {
  const byDomain = new Map<string, typeof HOOK_CATALOG>();
  for (const hook of HOOK_CATALOG) {
    if (!byDomain.has(hook.domain)) byDomain.set(hook.domain, []);
    byDomain.get(hook.domain)!.push(hook);
  }

  return (
    <section id="hooks-state" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-2 print:text-black">11. Hooks & State Management</h2>
      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        <span className="font-semibold text-foreground print:text-black">{HOOK_CATALOG.length} custom React hooks</span> organized
        by domain. All server state uses TanStack React Query with automatic cache invalidation.
      </p>

      {/* State Architecture */}
      <h3 className="text-xl font-semibold mb-3">State Architecture</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold">Layer</th>
              <th className="text-left py-2 px-3 font-semibold">Technology</th>
              <th className="text-left py-2 px-3 font-semibold">Usage</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Server State</td>
              <td className="py-2 px-3">TanStack React Query</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">All API data — bookings, leads, customers, settings, etc.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Auth State</td>
              <td className="py-2 px-3">AuthContext (React Context)</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">User session, tenant, role, subscription, admin switching</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Admin Mode</td>
              <td className="py-2 px-3">AdminModeContext (React Context)</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">Admin panel mode switching (super_admin only)</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">Realtime</td>
              <td className="py-2 px-3">Supabase Realtime</td>
              <td className="py-2 px-3 text-muted-foreground print:text-gray-700">postgres_changes subscriptions for live updates</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        No Redux or Zustand — the app uses pure React Context for global state and React Query for server state.
        Realtime subscriptions use Supabase's built-in postgres_changes for bookings, conversations, and dispatch jobs.
      </p>

      {/* Hooks by Domain */}
      <h3 className="text-xl font-semibold mb-3">All Hooks by Domain</h3>
      {DOMAIN_ORDER.map((domain) => {
        const hooks = byDomain.get(domain);
        if (!hooks || hooks.length === 0) return null;

        return (
          <div key={domain} className="mb-6">
            <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
              {domain} ({hooks.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 px-3 font-semibold">Hook</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {hooks.map((hook) => (
                    <tr key={hook.name} className="border-b border-border/50">
                      <td className="py-1.5 px-3 font-mono text-xs font-medium whitespace-nowrap">{hook.name}</td>
                      <td className="py-1.5 px-3 text-muted-foreground print:text-gray-700 text-xs">{hook.description}</td>
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
