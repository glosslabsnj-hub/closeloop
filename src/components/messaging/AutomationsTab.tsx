import { useState } from "react";
import { useMessagingAutomations, AUTOMATION_LABELS } from "@/hooks/useMessagingAutomations";
import { useMessagingTemplates } from "@/hooks/useMessagingTemplates";
import { SectionCard } from "@/components/layout/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Clock, Zap } from "lucide-react";

export function AutomationsTab() {
  const { automations, isLoading, toggleAutomation, updateAutomation } = useMessagingAutomations();
  const { templates } = useMessagingTemplates();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading automations...</div>;
  }

  if (automations.length === 0) {
    return (
      <SectionCard title="Automations">
        <div className="text-center py-8 text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No automations configured yet.</p>
          <p className="text-xs mt-1">Automations are created automatically when you set up your business.</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-3">
      {automations.map((automation) => {
        const meta = AUTOMATION_LABELS[automation.trigger_type] || {
          label: automation.trigger_type,
          description: "",
        };
        const isExpanded = expandedId === automation.id;
        const settings = (automation.settings_json || {}) as Record<string, unknown>;

        return (
          <SectionCard key={automation.id}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium truncate">{meta.label}</h3>
                  <Badge variant={automation.enabled ? "default" : "secondary"} className="text-[10px]">
                    {automation.enabled ? "Active" : "Off"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={automation.enabled ?? false}
                  onCheckedChange={(enabled) =>
                    toggleAutomation.mutate({ id: automation.id, enabled })
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedId(isExpanded ? null : automation.id)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-border/30 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Delay</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min={0}
                        value={automation.delay_minutes ?? 0}
                        onChange={(e) =>
                          updateAutomation.mutate({
                            id: automation.id,
                            delay_minutes: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-24 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        minutes after trigger
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Message Template</Label>
                    <Select
                      value={automation.template_id || "none"}
                      onValueChange={(value) =>
                        updateAutomation.mutate({
                          id: automation.id,
                          template_id: value === "none" ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No template (use custom body)</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {settings.description && (
                  <p className="text-xs text-muted-foreground/60 italic">
                    {String(settings.description)}
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}
