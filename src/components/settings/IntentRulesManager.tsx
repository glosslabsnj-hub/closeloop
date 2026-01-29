import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Lightbulb, 
  Calendar, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  BarChart3,
  Check,
  X,
  RefreshCw,
  Clock,
  Percent,
  Phone,
  Zap
} from "lucide-react";
import { 
  useIntentRules, 
  IntentRule, 
  IntentRuleType,
  ruleTypeLabels,
} from "@/hooks/useIntentRules";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";

// Pre-built rule templates that business owners can understand
interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rule_type: IntentRuleType;
  fields: TemplateField[];
  buildCondition: (values: Record<string, any>) => Record<string, any>;
  buildAction: (values: Record<string, any>) => Record<string, any>;
}

interface TemplateField {
  key: string;
  label: string;
  type: "time" | "number" | "text" | "select" | "service";
  placeholder?: string;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  suffix?: string;
}

const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "peak_hours",
    name: "Protect Peak Hours",
    description: "When callers want peak times, AI suggests earlier or later alternatives first",
    icon: <Clock className="h-5 w-5" />,
    rule_type: "time_preference",
    fields: [
      { key: "start_hour", label: "Peak starts at", type: "time", defaultValue: "17:00" },
      { key: "end_hour", label: "Peak ends at", type: "time", defaultValue: "19:00" },
    ],
    buildCondition: (values) => ({
      time_range: {
        start_hour: parseInt(values.start_hour?.split(":")[0] || "17"),
        end_hour: parseInt(values.end_hour?.split(":")[0] || "19"),
      },
    }),
    buildAction: () => ({
      suggest: "earlier or later alternatives before offering peak times",
      behavior: "negotiate_time",
    }),
  },
  {
    id: "same_day_protection",
    name: "Discourage Same-Day Bookings",
    description: "When you're busy, AI suggests tomorrow or later for non-urgent requests",
    icon: <Calendar className="h-5 w-5" />,
    rule_type: "capacity_protection",
    fields: [
      { 
        key: "capacity_threshold", 
        label: "When capacity is above", 
        type: "number", 
        defaultValue: 70,
        suffix: "%" 
      },
    ],
    buildCondition: (values) => ({
      is_same_day: true,
      capacity_threshold: values.capacity_threshold || 70,
    }),
    buildAction: () => ({
      suggest: "tomorrow or next available day",
      behavior: "discourage_same_day",
    }),
  },
  {
    id: "upsell_addon",
    name: "Suggest Add-On Services",
    description: "When a caller books a service, AI offers a relevant add-on",
    icon: <Package className="h-5 w-5" />,
    rule_type: "upsell_rule",
    fields: [
      { key: "service_name", label: "When booking", type: "service", defaultValue: "" },
      { key: "addon_name", label: "Suggest adding", type: "text", placeholder: "e.g., Deep conditioning treatment" },
    ],
    buildCondition: (values) => ({
      service_name: values.service_name,
    }),
    buildAction: (values) => ({
      suggest: values.addon_name || "an add-on service",
      behavior: "upsell",
    }),
  },
  {
    id: "no_discounts",
    name: "No Discounts Without Approval",
    description: "AI never offers discounts and directs callers to call back for special requests",
    icon: <DollarSign className="h-5 w-5" />,
    rule_type: "discount_guardrail",
    fields: [],
    buildCondition: () => ({
      always: true,
    }),
    buildAction: () => ({
      behavior: "never_discount",
      message: "I can't offer discounts, but I can have the owner call you back to discuss options.",
    }),
  },
  {
    id: "loyalty_discount",
    name: "Mention Loyalty Program",
    description: "When callers ask about discounts, AI mentions your loyalty or referral program",
    icon: <Percent className="h-5 w-5" />,
    rule_type: "discount_guardrail",
    fields: [
      { key: "program_name", label: "Program name", type: "text", placeholder: "e.g., VIP rewards program", defaultValue: "loyalty program" },
    ],
    buildCondition: () => ({
      mentions_discount: true,
    }),
    buildAction: (values) => ({
      suggest: `our ${values.program_name || "loyalty program"}`,
      behavior: "redirect_to_loyalty",
    }),
  },
  {
    id: "emergency_handling",
    name: "Priority for Emergencies",
    description: "When caller describes an emergency, AI tries to fit them in ASAP",
    icon: <AlertTriangle className="h-5 w-5" />,
    rule_type: "urgency_handling",
    fields: [],
    buildCondition: () => ({
      is_emergency: true,
    }),
    buildAction: () => ({
      behavior: "prioritize",
      message: "I understand this is urgent. Let me find the soonest available time for you.",
    }),
  },
  {
    id: "callback_after_hours",
    name: "After-Hours Callback",
    description: "When callers want times outside your hours, AI offers to have you call back",
    icon: <Phone className="h-5 w-5" />,
    rule_type: "time_preference",
    fields: [],
    buildCondition: () => ({
      outside_hours: true,
    }),
    buildAction: () => ({
      behavior: "offer_callback",
      message: "That time is outside our regular hours. I can have someone call you back to discuss availability.",
    }),
  },
];

interface RuleCardProps {
  rule: IntentRule;
  onToggle: (id: string, isEnabled: boolean) => void;
  onDelete: (id: string) => void;
}

function RuleCard({ rule, onToggle, onDelete }: RuleCardProps) {
  const getIcon = () => {
    const iconMap: Record<IntentRuleType, React.ReactNode> = {
      time_preference: <Calendar className="h-4 w-4" />,
      upsell_rule: <Package className="h-4 w-4" />,
      discount_guardrail: <DollarSign className="h-4 w-4" />,
      urgency_handling: <AlertTriangle className="h-4 w-4" />,
      capacity_protection: <BarChart3 className="h-4 w-4" />,
    };
    return iconMap[rule.rule_type] || <Zap className="h-4 w-4" />;
  };

  // Format condition/action for human-readable display
  const getReadableDescription = (): string => {
    const condition = rule.condition_json;
    const action = rule.action_json;
    
    let when = "";
    let then = "";

    // Parse condition
    if (condition.time_range) {
      when = `Peak hours (${condition.time_range.start_hour}:00–${condition.time_range.end_hour}:00)`;
    } else if (condition.is_same_day && condition.capacity_threshold) {
      when = `Same-day booking when ${condition.capacity_threshold}%+ full`;
    } else if (condition.service_name) {
      when = `Booking "${condition.service_name}"`;
    } else if (condition.always) {
      when = "Any discount request";
    } else if (condition.mentions_discount) {
      when = "Caller asks about discounts";
    } else if (condition.is_emergency) {
      when = "Emergency situation";
    } else if (condition.outside_hours) {
      when = "Request outside business hours";
    } else {
      when = "Always";
    }

    // Parse action
    if (action.suggest) {
      then = `Suggest ${action.suggest}`;
    } else if (action.message) {
      then = action.message;
    } else if (action.behavior) {
      const behaviors: Record<string, string> = {
        negotiate_time: "Negotiate alternatives",
        discourage_same_day: "Suggest later date",
        upsell: "Offer add-on",
        never_discount: "Decline & offer callback",
        redirect_to_loyalty: "Mention loyalty program",
        prioritize: "Prioritize booking",
        offer_callback: "Offer callback",
      };
      then = behaviors[action.behavior] || action.behavior;
    } else {
      then = "Apply rule";
    }

    return `${when} → ${then}`;
  };

  return (
    <div className={`p-4 rounded-lg border transition-colors ${rule.is_enabled ? "bg-card" : "bg-muted/50 opacity-75"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
            rule.is_enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium truncate">{rule.name}</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {getReadableDescription()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={rule.is_enabled}
            onCheckedChange={(checked) => onToggle(rule.id, checked)}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{rule.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(rule.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

interface SuggestedRuleCardProps {
  rule: IntentRule;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

function SuggestedRuleCard({ rule, onApprove, onDismiss }: SuggestedRuleCardProps) {
  return (
    <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Lightbulb className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium">{rule.name}</span>
            {rule.suggested_reason && (
              <p className="text-sm text-amber-600">{rule.suggested_reason}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => onApprove(rule.id)}>
            <Check className="h-4 w-4 mr-1" />
            Enable
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDismiss(rule.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function IntentRulesManager() {
  const { tenant } = useAuth();
  const { 
    activeRules, 
    inactiveRules,
    suggestedRules,
    isLoading, 
    createRule,
    deleteRule,
    toggleRule,
    approveRule,
    dismissRule,
    isCreating 
  } = useIntentRules();
  const { services } = useServices();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  const openTemplateDialog = (template: RuleTemplate) => {
    setSelectedTemplate(template);
    // Initialize with default values
    const defaults: Record<string, any> = {};
    template.fields.forEach(f => {
      if (f.defaultValue !== undefined) {
        defaults[f.key] = f.defaultValue;
      }
    });
    setFieldValues(defaults);
    setIsDialogOpen(true);
  };

  const handleCreateRule = async () => {
    if (!selectedTemplate) return;

    const condition = selectedTemplate.buildCondition(fieldValues);
    const action = selectedTemplate.buildAction(fieldValues);

    await createRule.mutateAsync({
      rule_type: selectedTemplate.rule_type,
      name: selectedTemplate.name,
      description: selectedTemplate.description,
      condition_json: condition,
      action_json: action,
      priority: 50,
      is_enabled: true,
      is_suggested: false,
      suggested_reason: null,
    });

    setIsDialogOpen(false);
    setSelectedTemplate(null);
    setFieldValues({});
  };

  const updateFieldValue = (key: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const allRules = [...activeRules, ...inactiveRules];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>AI Negotiation Rules</CardTitle>
          <CardDescription>
            Tell your AI how to handle common situations. These rules guide behavior — they never override your availability or pricing.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Suggested Rules */}
      {suggestedRules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Suggested for You
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedRules.map((rule) => (
              <SuggestedRuleCard
                key={rule.id}
                rule={rule}
                onApprove={(id) => approveRule.mutate(id)}
                onDismiss={(id) => dismissRule.mutate(id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active/Inactive Rules */}
      {allRules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={(id, isEnabled) => toggleRule.mutate({ ruleId: id, isEnabled })}
                onDelete={(id) => deleteRule.mutate(id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add New Rule - Template Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add a Rule
          </CardTitle>
          <CardDescription>
            Choose a rule type to get started. We'll handle the technical details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {RULE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => openTemplateDialog(template)}
                className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate?.icon}
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              {selectedTemplate.fields.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Check className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p>No configuration needed — just enable it!</p>
                </div>
              ) : (
                selectedTemplate.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    {field.type === "time" && (
                      <Input
                        type="time"
                        value={fieldValues[field.key] || field.defaultValue || ""}
                        onChange={(e) => updateFieldValue(field.key, e.target.value)}
                      />
                    )}
                    {field.type === "number" && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={fieldValues[field.key] || field.defaultValue || ""}
                          onChange={(e) => updateFieldValue(field.key, parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                        {field.suffix && (
                          <span className="text-sm text-muted-foreground">{field.suffix}</span>
                        )}
                      </div>
                    )}
                    {field.type === "text" && (
                      <Input
                        value={fieldValues[field.key] || ""}
                        onChange={(e) => updateFieldValue(field.key, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.type === "service" && (
                      <Select
                        value={fieldValues[field.key] || ""}
                        onValueChange={(v) => updateFieldValue(field.key, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.name}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === "select" && field.options && (
                      <Select
                        value={fieldValues[field.key] || ""}
                        onValueChange={(v) => updateFieldValue(field.key, v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule} disabled={isCreating}>
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
