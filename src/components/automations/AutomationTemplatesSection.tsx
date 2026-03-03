import { useState } from "react";
import { Plus, Sparkles, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAutomationRuleMutations, useAutomationRules } from "@/hooks/useIntegrations";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface AutomationTemplatesSectionProps {
  tenantId: string;
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  trigger_event: string;
  action_type: string;
  destination_provider: string;
  icon: string;
  modes: BusinessMode[];
}

const TEMPLATES: AutomationTemplate[] = [
  // Food mode templates
  {
    id: "food-order-print",
    name: "Print Order Ticket",
    description: "Automatically print kitchen tickets when orders come in",
    trigger_event: "order.created",
    action_type: "print_receipt",
    destination_provider: "printer",
    icon: "🖨️",
    modes: ["food"],
  },
  {
    id: "food-order-sms",
    name: "Order Confirmation SMS",
    description: "Text customers when their order is confirmed",
    trigger_event: "order.confirmed",
    action_type: "send_sms",
    destination_provider: "sms",
    icon: "💬",
    modes: ["food"],
  },
  {
    id: "food-ready-sms",
    name: "Ready for Pickup SMS",
    description: "Text customers when their order is ready",
    trigger_event: "order.ready",
    action_type: "send_sms",
    destination_provider: "sms",
    icon: "✅",
    modes: ["food"],
  },
  // Service mode templates
  {
    id: "service-booking-calendar",
    name: "Add Booking to Calendar",
    description: "Create calendar events for new bookings",
    trigger_event: "booking.created",
    action_type: "create_event",
    destination_provider: "google_calendar",
    icon: "📅",
    modes: ["service", "medical"],
  },
  {
    id: "service-booking-sms",
    name: "Booking Confirmation SMS",
    description: "Text customers when their booking is confirmed",
    trigger_event: "booking.confirmed",
    action_type: "send_sms",
    destination_provider: "sms",
    icon: "💬",
    modes: ["service", "medical"],
  },
  {
    id: "service-lead-sheet",
    name: "Log Leads to Spreadsheet",
    description: "Append new leads to a Google Sheet",
    trigger_event: "lead.captured",
    action_type: "append_row",
    destination_provider: "google_sheets",
    icon: "📊",
    modes: ["service", "medical", "general"],
  },
  // Dispatch mode templates
  {
    id: "dispatch-job-sms",
    name: "Job Created SMS",
    description: "Text customers when their job is received",
    trigger_event: "dispatch_job.created",
    action_type: "send_sms",
    destination_provider: "sms",
    icon: "🚗",
    modes: ["dispatch"],
  },
  {
    id: "dispatch-job-webhook",
    name: "Push Job to Dispatch System",
    description: "Send job data to your dispatch software",
    trigger_event: "dispatch_job.created",
    action_type: "send_webhook",
    destination_provider: "webhook",
    icon: "🔗",
    modes: ["dispatch"],
  },
  // Universal templates
  {
    id: "universal-missed-call",
    name: "Missed Call Auto-Reply",
    description: "Text callers when you miss their call",
    trigger_event: "missed_call",
    action_type: "send_sms",
    destination_provider: "sms",
    icon: "📱",
    modes: ["service", "food", "dispatch", "medical", "general"],
  },
  {
    id: "universal-call-webhook",
    name: "Push Call Summary to CRM",
    description: "Automatically send call data to your CRM",
    trigger_event: "call.ended",
    action_type: "send_webhook",
    destination_provider: "webhook",
    icon: "🔗",
    modes: ["service", "food", "dispatch", "medical", "general"],
  },
];

export function AutomationTemplatesSection({ tenantId }: AutomationTemplatesSectionProps) {
  const { businessMode } = useTenantConfig();
  const { terms } = useIndustryContext();
  const { data: existingRules } = useAutomationRules(tenantId);
  const { createRule } = useAutomationRuleMutations(tenantId);
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null);

  // Capitalize helper
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Filter templates by business mode and apply dynamic terminology
  const availableTemplates = TEMPLATES.filter((t) => t.modes.includes(businessMode)).map((t) => {
    if (t.trigger_event.startsWith("booking.")) {
      return {
        ...t,
        name: t.name.replace(/Booking/g, cap(terms.booking)),
        description: t.description.replace(/booking/g, terms.booking),
      };
    }
    return t;
  });

  // Check which templates are already applied (by trigger + action combo)
  const appliedTemplateIds = new Set(
    existingRules
      ?.map((r) => {
        const matchingTemplate = TEMPLATES.find(
          (t) => t.trigger_event === r.trigger_event && t.action_type === r.action_type
        );
        return matchingTemplate?.id;
      })
      .filter(Boolean) || []
  );

  const handleAddTemplate = async (template: AutomationTemplate) => {
    setAddingTemplate(template.id);
    try {
      await createRule.mutateAsync({
        name: template.name,
        description: template.description,
        trigger_event: template.trigger_event,
        action_type: template.action_type,
        destination_provider: template.destination_provider,
      });
    } catch (e) {
      // Error handled by mutation
    } finally {
      setAddingTemplate(null);
    }
  };

  if (availableTemplates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended for Your Business
        </h2>
        <p className="text-sm text-muted-foreground">
          Quick-start templates based on your business type
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableTemplates.map((template) => {
          const isApplied = appliedTemplateIds.has(template.id);
          const isAdding = addingTemplate === template.id;

          return (
            <Card
              key={template.id}
              className={`relative transition-all ${
                isApplied ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{template.icon}</span>
                  {isApplied && (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Applied
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {!isApplied && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAddTemplate(template)}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      "Adding..."
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Use Template
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
