import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
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
  Info
} from "lucide-react";
import { 
  useIntentRules, 
  IntentRule, 
  IntentRuleType,
  ruleTypeLabels,
  ruleTypeDescriptions
} from "@/hooks/useIntentRules";

const ruleTypeIconMap: Record<IntentRuleType, React.ReactNode> = {
  time_preference: <Calendar className="h-4 w-4" />,
  upsell_rule: <Package className="h-4 w-4" />,
  discount_guardrail: <DollarSign className="h-4 w-4" />,
  urgency_handling: <AlertTriangle className="h-4 w-4" />,
  capacity_protection: <BarChart3 className="h-4 w-4" />,
};

interface RuleCardProps {
  rule: IntentRule;
  onToggle: (id: string, isEnabled: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (rule: IntentRule) => void;
}

function RuleCard({ rule, onToggle, onDelete, onEdit }: RuleCardProps) {
  // Format condition for display
  const formatCondition = (condition: Record<string, any>): string => {
    if (condition.time_range) {
      return `Time: ${condition.time_range.start_hour}:00-${condition.time_range.end_hour}:00`;
    }
    if (condition.service_name) {
      return `Service: ${condition.service_name}`;
    }
    if (condition.capacity_threshold) {
      return `Capacity ≥ ${condition.capacity_threshold}%`;
    }
    if (condition.is_same_day) {
      return "Same-day booking";
    }
    if (condition.is_emergency) {
      return "Emergency call";
    }
    return "Always applies";
  };

  // Format action for display
  const formatAction = (action: Record<string, any>): string => {
    if (action.suggest) {
      return action.suggest;
    }
    if (action.behavior) {
      return action.behavior;
    }
    if (action.message) {
      return action.message;
    }
    return JSON.stringify(action);
  };

  return (
    <div className={`p-4 rounded-lg border ${rule.is_enabled ? "bg-card" : "bg-muted/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
            rule.is_enabled ? "bg-primary/15" : "bg-muted"
          }`}>
            {ruleTypeIconMap[rule.rule_type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{rule.name}</span>
              <Badge variant="outline" className="text-xs">
                {ruleTypeLabels[rule.rule_type]}
              </Badge>
            </div>
            {rule.description && (
              <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
            )}
            <div className="text-xs space-y-1">
              <p><span className="text-muted-foreground">When:</span> {formatCondition(rule.condition_json)}</p>
              <p><span className="text-muted-foreground">Then:</span> {formatAction(rule.action_json)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={rule.is_enabled}
            onCheckedChange={(checked) => onToggle(rule.id, checked)}
          />
          <Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{rule.name}". This action cannot be undone.
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Lightbulb className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                Suggested Rule
              </Badge>
              <span className="font-medium">{rule.name}</span>
            </div>
            {rule.description && (
              <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
            )}
            {rule.suggested_reason && (
              <p className="text-xs text-amber-600 italic">
                Reason: {rule.suggested_reason}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => onApprove(rule.id)}>
            <Check className="h-4 w-4 mr-1" />
            Approve
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
  const { 
    activeRules, 
    inactiveRules,
    suggestedRules,
    isLoading, 
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    approveRule,
    dismissRule,
    isCreating 
  } = useIntentRules();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<IntentRule | null>(null);

  // Form state
  const [formType, setFormType] = useState<IntentRuleType>("time_preference");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCondition, setFormCondition] = useState("{}");
  const [formAction, setFormAction] = useState("{}");
  const [formPriority, setFormPriority] = useState(0);

  const resetForm = () => {
    setFormType("time_preference");
    setFormName("");
    setFormDescription("");
    setFormCondition("{}");
    setFormAction("{}");
    setFormPriority(0);
    setEditingRule(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: IntentRule) => {
    setEditingRule(rule);
    setFormType(rule.rule_type);
    setFormName(rule.name);
    setFormDescription(rule.description || "");
    setFormCondition(JSON.stringify(rule.condition_json, null, 2));
    setFormAction(JSON.stringify(rule.action_json, null, 2));
    setFormPriority(rule.priority);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const condition = JSON.parse(formCondition);
      const action = JSON.parse(formAction);

      if (editingRule) {
        await updateRule.mutateAsync({
          ruleId: editingRule.id,
          updates: {
            rule_type: formType,
            name: formName,
            description: formDescription || null,
            condition_json: condition,
            action_json: action,
            priority: formPriority,
          },
        });
      } else {
        await createRule.mutateAsync({
          rule_type: formType,
          name: formName,
          description: formDescription || null,
          condition_json: condition,
          action_json: action,
          priority: formPriority,
          is_enabled: true,
          is_suggested: false,
          suggested_reason: null,
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (e) {
      console.error("Invalid JSON in condition or action");
    }
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

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Negotiation Rules</CardTitle>
              <CardDescription>
                Configure how your AI handles scheduling, upsells, and special situations
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingRule ? "Edit Rule" : "Create New Rule"}</DialogTitle>
                  <DialogDescription>
                    Rules guide AI behavior but never override availability or invent pricing.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select value={formType} onValueChange={(v) => setFormType(v as IntentRuleType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ruleTypeLabels) as IntentRuleType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              {ruleTypeIconMap[type]}
                              <span>{ruleTypeLabels[type]}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {ruleTypeDescriptions[formType]}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input 
                      value={formName} 
                      onChange={(e) => setFormName(e.target.value)} 
                      placeholder="e.g., Peak Hours Preference"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input 
                      value={formDescription} 
                      onChange={(e) => setFormDescription(e.target.value)} 
                      placeholder="Brief description of this rule"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Condition (JSON)</Label>
                    <Textarea 
                      value={formCondition} 
                      onChange={(e) => setFormCondition(e.target.value)}
                      className="font-mono text-sm"
                      rows={3}
                      placeholder='{"time_range": {"start_hour": 15, "end_hour": 18}}'
                    />
                    <p className="text-xs text-muted-foreground">
                      When this condition is met, the action will apply
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Action (JSON)</Label>
                    <Textarea 
                      value={formAction} 
                      onChange={(e) => setFormAction(e.target.value)}
                      className="font-mono text-sm"
                      rows={3}
                      placeholder='{"suggest": "earlier or later alternatives"}'
                    />
                    <p className="text-xs text-muted-foreground">
                      What the AI should do when the condition matches
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority (0-100)</Label>
                    <Input 
                      type="number"
                      value={formPriority} 
                      onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher priority rules are evaluated first
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isCreating || !formName}>
                    {editingRule ? "Save Changes" : "Create Rule"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">How Rules Work</p>
          <ul className="text-muted-foreground mt-1 space-y-1">
            <li>• Rules guide AI behavior — they never override availability or invent pricing</li>
            <li>• AI may negotiate options, NOT outcomes</li>
            <li>• Higher priority rules are checked first</li>
            <li>• Copilot may suggest rules based on patterns (requires your approval)</li>
          </ul>
        </div>
      </div>

      {/* Suggested Rules */}
      {suggestedRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Suggested by Copilot
            </CardTitle>
            <CardDescription>
              Rules recommended based on observed patterns. Review and approve to enable.
            </CardDescription>
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

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Rules</CardTitle>
          <CardDescription>
            These rules are currently influencing AI behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active rules</p>
              <p className="text-sm">Add rules to customize how your AI handles calls</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={(id, isEnabled) => toggleRule.mutate({ ruleId: id, isEnabled })}
                  onDelete={(id) => deleteRule.mutate(id)}
                  onEdit={openEditDialog}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Rules */}
      {inactiveRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">Inactive Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inactiveRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={(id, isEnabled) => toggleRule.mutate({ ruleId: id, isEnabled })}
                onDelete={(id) => deleteRule.mutate(id)}
                onEdit={openEditDialog}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
