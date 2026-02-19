import { DB_TABLE_CATALOG, DB_ENUM_CATALOG, RPC_CATALOG } from "@/data/blueprintData";

const DOMAIN_ORDER = ["Identity", "AI/Voice", "Entities", "Knowledge", "Services", "Automation", "Intelligence", "Admin"];

export function DatabaseSchemaSection() {
  const byDomain = new Map<string, typeof DB_TABLE_CATALOG>();
  for (const table of DB_TABLE_CATALOG) {
    if (!byDomain.has(table.domain)) byDomain.set(table.domain, []);
    byDomain.get(table.domain)!.push(table);
  }

  return (
    <section id="database-schema" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-2 print:text-black">6. Database Schema</h2>
      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        <span className="font-semibold text-foreground print:text-black">{DB_TABLE_CATALOG.length} tables</span>,{" "}
        <span className="font-semibold text-foreground print:text-black">{DB_ENUM_CATALOG.length} enums</span>, and{" "}
        <span className="font-semibold text-foreground print:text-black">{RPC_CATALOG.length} RPC functions</span> in Supabase (Postgres).
        All tables use Row-Level Security (RLS) for tenant isolation.
      </p>

      {/* Tables by Domain */}
      {DOMAIN_ORDER.map((domain) => {
        const tables = byDomain.get(domain);
        if (!tables || tables.length === 0) return null;

        return (
          <div key={domain} className="mb-8">
            <h3 className="text-lg font-semibold mb-2">
              {domain}
              <span className="text-sm font-normal text-muted-foreground ml-2">({tables.length} tables)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 px-3 font-semibold">Table</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Purpose</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Key Columns</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table) => (
                    <tr key={table.name} className="border-b border-border/50">
                      <td className="py-1.5 px-3 font-mono text-xs font-medium">{table.name}</td>
                      <td className="py-1.5 px-3 text-muted-foreground print:text-gray-700 text-xs">{table.description}</td>
                      <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">{table.keyColumns.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Enums */}
      <h3 className="text-xl font-semibold mb-3 mt-8">Database Enums</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1.5 px-3 font-semibold">Enum</th>
              <th className="text-left py-1.5 px-3 font-semibold">Values</th>
            </tr>
          </thead>
          <tbody>
            {DB_ENUM_CATALOG.map((e) => (
              <tr key={e.name} className="border-b border-border/50">
                <td className="py-1.5 px-3 font-mono text-xs font-medium">{e.name}</td>
                <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">{e.values.join(" | ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RPC Functions */}
      <h3 className="text-xl font-semibold mb-3">RPC Functions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1.5 px-3 font-semibold">Function</th>
              <th className="text-left py-1.5 px-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {RPC_CATALOG.map((rpc) => (
              <tr key={rpc.name} className="border-b border-border/50">
                <td className="py-1.5 px-3 font-mono text-xs font-medium">{rpc.name}</td>
                <td className="py-1.5 px-3 text-muted-foreground print:text-gray-700 text-xs">{rpc.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
