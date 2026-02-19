import { industryCatalog, categoryLabels, type IndustryCategory } from "@/data/industryCatalog";

export function IndustrySupport() {
  // Group by category
  const byCategory = new Map<IndustryCategory, typeof industryCatalog>();
  for (const entry of industryCatalog) {
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
    byCategory.get(entry.category)!.push(entry);
  }

  const categoryKeys = Object.keys(categoryLabels) as IndustryCategory[];

  return (
    <section id="industry-support" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-2 print:text-black">10. Industry Support</h2>
      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        <span className="font-semibold text-foreground print:text-black">{industryCatalog.length} industries</span> across{" "}
        {categoryKeys.length} categories. Each includes pre-configured services, FAQs, objection responses, and policies.
      </p>
      <p className="text-xs text-muted-foreground mb-6 italic print:text-gray-500">
        Auto-generated from industryCatalog.ts — counts update automatically.
      </p>

      {categoryKeys.map((catKey) => {
        const entries = byCategory.get(catKey);
        if (!entries || entries.length === 0) return null;

        return (
          <div key={catKey} className="mb-8">
            <h3 className="text-lg font-semibold mb-2">
              {categoryLabels[catKey]}
              <span className="text-sm font-normal text-muted-foreground ml-2">({entries.length})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 px-3 font-semibold">Industry</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Slug</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Mode</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Modules</th>
                    <th className="text-right py-1.5 px-3 font-semibold">Services</th>
                    <th className="text-right py-1.5 px-3 font-semibold">FAQs</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.slug} className="border-b border-border/50">
                      <td className="py-1.5 px-3">
                        <span className="mr-1.5">{entry.icon}</span>
                        {entry.name}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">{entry.slug}</td>
                      <td className="py-1.5 px-3 font-mono text-xs">{entry.businessMode}</td>
                      <td className="py-1.5 px-3 text-xs text-muted-foreground">{entry.enabledModules.join(", ")}</td>
                      <td className="py-1.5 px-3 text-right">{entry.services.length}</td>
                      <td className="py-1.5 px-3 text-right">{entry.faqs.length}</td>
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
