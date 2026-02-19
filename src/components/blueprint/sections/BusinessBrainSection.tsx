import { ALL_ITEMS, type NewSectionId } from "@/config/brainSectionRegistry";

const TAB_LABELS: Record<NewSectionId, string> = {
  business: "Business",
  services: "Services",
  operations: "Operations",
  "ai-voice": "AI Voice",
  training: "Training",
  intelligence: "Intelligence",
};

const TAB_ORDER: NewSectionId[] = ["business", "services", "operations", "ai-voice", "training", "intelligence"];

const PRIORITY_LABELS: Record<string, string> = {
  essential: "Essential",
  recommended: "Recommended",
  advanced: "Advanced",
};

export function BusinessBrainSection() {
  // Group items by tab, then by group
  const byTab = new Map<NewSectionId, Map<string, typeof ALL_ITEMS>>();

  for (const item of ALL_ITEMS) {
    if (!byTab.has(item.tab)) byTab.set(item.tab, new Map());
    const tabGroups = byTab.get(item.tab)!;
    if (!tabGroups.has(item.group)) tabGroups.set(item.group, []);
    tabGroups.get(item.group)!.push(item);
  }

  return (
    <section id="business-brain" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-2 print:text-black">5. Business Brain</h2>
      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        The Business Brain is the knowledge editor where tenants train their AI voice agent.
        It contains <span className="font-semibold text-foreground print:text-black">{ALL_ITEMS.length} configurable items</span> across
        {" "}{TAB_ORDER.length} tabs. Items are conditionally visible based on business mode and capabilities.
      </p>
      <p className="text-xs text-muted-foreground mb-6 italic print:text-gray-500">
        Auto-generated from brainSectionRegistry.ts — this count updates automatically.
      </p>

      {TAB_ORDER.map((tab) => {
        const groups = byTab.get(tab);
        if (!groups || groups.size === 0) {
          return (
            <div key={tab} className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{TAB_LABELS[tab]} Tab</h3>
              <p className="text-sm text-muted-foreground italic">No sidebar items — uses custom layout.</p>
            </div>
          );
        }

        const tabItems = ALL_ITEMS.filter((i) => i.tab === tab);

        return (
          <div key={tab} className="mb-8">
            <h3 className="text-lg font-semibold mb-1">
              {TAB_LABELS[tab]} Tab
              <span className="text-sm font-normal text-muted-foreground ml-2">({tabItems.length} items)</span>
            </h3>

            {Array.from(groups.entries()).map(([groupKey, items]) => (
              <div key={groupKey} className="mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                  {items[0].groupLabel}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 px-3 font-semibold">Item</th>
                        <th className="text-left py-1.5 px-3 font-semibold">ID</th>
                        <th className="text-left py-1.5 px-3 font-semibold">Priority</th>
                        <th className="text-left py-1.5 px-3 font-semibold">Conditional</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.sort((a, b) => a.order - b.order).map((item) => (
                        <tr key={item.id} className="border-b border-border/50">
                          <td className="py-1.5 px-3 font-medium">{item.title}</td>
                          <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">{item.id}</td>
                          <td className="py-1.5 px-3 text-xs">
                            {item.isEssential
                              ? "Essential"
                              : item.setupPriority
                                ? PRIORITY_LABELS[item.setupPriority] || item.setupPriority
                                : "—"}
                          </td>
                          <td className="py-1.5 px-3 text-xs text-muted-foreground">
                            {item.isVisible ? "Yes (mode/caps)" : "Always visible"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
