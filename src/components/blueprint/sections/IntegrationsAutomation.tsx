import { POPULAR_INTEGRATIONS, INTEGRATION_CATEGORIES } from "@/data/popularIntegrations";
import { AUTOMATION_TEMPLATES, TEMPLATE_CATEGORIES } from "@/data/automationTemplates";

export function IntegrationsAutomation() {
  return (
    <section id="integrations" className="blueprint-section">
      <h2 className="text-3xl font-bold mb-2 print:text-black">8. Integrations & Automation</h2>
      <p className="text-sm text-muted-foreground mb-6 print:text-gray-600">
        <span className="font-semibold text-foreground print:text-black">{POPULAR_INTEGRATIONS.length} integrations</span> across{" "}
        {INTEGRATION_CATEGORIES.length} categories, plus{" "}
        <span className="font-semibold text-foreground print:text-black">{AUTOMATION_TEMPLATES.length} automation templates</span>.
      </p>
      <p className="text-xs text-muted-foreground mb-6 italic print:text-gray-500">
        Auto-generated from popularIntegrations.ts and automationTemplates.ts.
      </p>

      {/* Integrations by Category */}
      <h3 className="text-xl font-semibold mb-3">Available Integrations</h3>
      {INTEGRATION_CATEGORIES.map((cat) => {
        const items = POPULAR_INTEGRATIONS.filter((i) => i.category === cat.id);
        if (items.length === 0) return null;

        return (
          <div key={cat.id} className="mb-6">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {cat.icon} {cat.label} ({items.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 px-3 font-semibold">Integration</th>
                    <th className="text-left py-1.5 px-3 font-semibold">ID</th>
                    <th className="text-left py-1.5 px-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-1.5 px-3 font-medium">
                        <span className="mr-1.5">{item.icon}</span>
                        {item.name}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">{item.id}</td>
                      <td className="py-1.5 px-3 text-muted-foreground print:text-gray-700">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Automation Templates */}
      <h3 className="text-xl font-semibold mb-3 mt-8">Automation Templates</h3>
      <p className="text-sm text-muted-foreground mb-4 print:text-gray-600">
        Pre-built workflow templates that tenants can activate with one click.
        Each template defines a trigger event and a sequence of automated steps.
      </p>

      {TEMPLATE_CATEGORIES.map((cat) => {
        const templates = AUTOMATION_TEMPLATES.filter((t) => t.category === cat.id);
        if (templates.length === 0) return null;

        return (
          <div key={cat.id} className="mb-6">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {cat.icon} {cat.label} ({templates.length})
            </h4>
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-3 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{template.name}</span>
                  {template.recommended && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded print:bg-gray-200 print:text-black">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2 print:text-gray-600">{template.description}</p>
                <div className="flex flex-wrap gap-1">
                  {template.steps.map((step) => (
                    <span key={step.order} className="text-xs bg-muted px-2 py-0.5 rounded print:bg-gray-100">
                      {step.order}. {step.description}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Modes: {template.businessModes.join(", ")}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Workflow System */}
      <h3 className="text-xl font-semibold mb-3 mt-8">Workflow System</h3>
      <p className="text-sm text-muted-foreground mb-3 print:text-gray-600">
        Tenants can build custom workflows or activate templates. Each workflow has:
      </p>
      <ul className="text-sm space-y-1 mb-4">
        <li className="text-muted-foreground print:text-gray-700">• <strong>Trigger:</strong> Event that starts the workflow (booking_created, call_ended, order_placed, etc.)</li>
        <li className="text-muted-foreground print:text-gray-700">• <strong>Steps:</strong> Sequential actions (send_sms, send_webhook, append_sheet_row, create_calendar_event, delay, print_receipt)</li>
        <li className="text-muted-foreground print:text-gray-700">• <strong>Providers:</strong> sms, webhook, google_calendar, google_sheets, printer, system</li>
        <li className="text-muted-foreground print:text-gray-700">• <strong>Execution:</strong> Runs are logged with per-step status for debugging</li>
      </ul>
    </section>
  );
}
