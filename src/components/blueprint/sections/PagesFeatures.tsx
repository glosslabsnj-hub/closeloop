import { ROUTE_CATALOG } from "@/data/blueprintData";

const LAYOUT_LABELS: Record<string, string> = {
  public: "Public Pages",
  standalone: "Standalone Pages",
  app: "App Pages (AppLayout)",
  admin: "Admin Pages (AdminLayout)",
  driver: "Driver Portal (DriverLayout)",
  debug: "Debug Pages (AdminLayout)",
};

const LAYOUT_ORDER = ["public", "standalone", "app", "admin", "driver", "debug"];

export function PagesFeatures() {
  const byLayout = new Map<string, typeof ROUTE_CATALOG>();
  for (const route of ROUTE_CATALOG) {
    if (!byLayout.has(route.layout)) byLayout.set(route.layout, []);
    byLayout.get(route.layout)!.push(route);
  }

  return (
    <section id="pages-features" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-2 print:text-black">4. Pages & Features</h2>
      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        <span className="font-semibold text-foreground print:text-black">{ROUTE_CATALOG.length} routes</span> across{" "}
        {LAYOUT_ORDER.length} layout groups. Module-specific routes are gated by tenant configuration.
      </p>

      {LAYOUT_ORDER.map((layout) => {
        const routes = byLayout.get(layout);
        if (!routes || routes.length === 0) return null;

        return (
          <div key={layout} className="mb-8">
            <h3 className="text-lg font-semibold mb-2">
              {LAYOUT_LABELS[layout]}
              <span className="text-sm font-normal text-muted-foreground ml-2">({routes.length})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 px-3 font-semibold">Route</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Page</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Description</th>
                    {layout === "app" && <th className="text-left py-1.5 px-3 font-semibold">Module</th>}
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.path} className="border-b border-border/50">
                      <td className="py-1.5 px-3 font-mono text-xs">{route.path}</td>
                      <td className="py-1.5 px-3 text-sm">{route.page}</td>
                      <td className="py-1.5 px-3 text-muted-foreground print:text-gray-700 text-xs">{route.description}</td>
                      {layout === "app" && (
                        <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">{route.module || "—"}</td>
                      )}
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
