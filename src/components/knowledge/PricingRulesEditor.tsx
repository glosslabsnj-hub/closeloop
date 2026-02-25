import { useState } from "react";
import { usePricingRules, PricingRule } from "@/hooks/usePricingRules";
import { useServices } from "@/hooks/useServices";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Pencil, Trash2, DollarSign, Percent, Tag, Loader2, Globe, Briefcase } from "lucide-react";

interface RuleFormData {
  name: string;
  description: string;
  type: "surcharge" | "discount" | "fee";
  amount: number;
  amount_type: "percent" | "fixed";
  scope: "all" | "specific";
  service_id: string | null;
  is_active: boolean;
}

const defaultFormData: RuleFormData = {
  name: "",
  description: "",
  type: "fee",
  amount: 0,
  amount_type: "fixed",
  scope: "all",
  service_id: null,
  is_active: true,
};

export function PricingRulesEditor() {
  const { rules, isLoading, isSaving, addRule, updateRule, deleteRule, toggleRuleActive } = usePricingRules();
  const { services } = useServices();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<PricingRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);

  const openCreateDialog = () => {
    setEditingRule(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (rule: PricingRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      type: rule.type,
      amount: rule.amount,
      amount_type: rule.amount_type,
      scope: rule.service_id ? "specific" : "all",
      service_id: rule.service_id,
      is_active: rule.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    const ruleData = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
      amount: formData.amount,
      amount_type: formData.amount_type,
      service_id: formData.scope === "all" ? null : formData.service_id,
      is_active: formData.is_active,
    };

    if (editingRule) {
      await updateRule(editingRule.id, ruleData);
    } else {
      await addRule(ruleData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deletingRule) return;
    await deleteRule(deletingRule.id);
    setDeleteDialogOpen(false);
    setDeletingRule(null);
  };

  const getServiceName = (serviceId: string | null): string => {
    if (!serviceId) return "All services";
    const service = services.find((s) => s.id === serviceId);
    return service?.name || "Unknown service";
  };

  const formatAmount = (rule: PricingRule): string => {
    if (rule.amount_type === "percent") {
      return `${rule.amount}%`;
    }
    return `$${rule.amount.toFixed(2)}`;
  };

  const getTypeLabel = (type: PricingRule["type"]): string => {
    switch (type) {
      case "surcharge":
        return "Surcharge";
      case "discount":
        return "Discount";
      case "fee":
        return "Fee";
    }
  };

  const getTypeBadgeVariant = (type: PricingRule["type"]): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "surcharge":
        return "default";
      case "discount":
        return "secondary";
      case "fee":
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Pricing Rules</h3>
          <p className="text-sm text-muted-foreground">
            Add surcharges, discounts, or fees that apply globally or to specific services.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Price Rule
        </Button>
      </div>

      {rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant={getTypeBadgeVariant(rule.type)}>
                        {getTypeLabel(rule.type)}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        {rule.amount_type === "percent" ? (
                          <Percent className="h-3 w-3" />
                        ) : (
                          <DollarSign className="h-3 w-3" />
                        )}
                        {formatAmount(rule)}
                      </Badge>
                      {/* Scope Badge */}
                      <Badge
                        variant="secondary"
                        className={`gap-1 ${rule.service_id ? "bg-blue-500/15 text-blue-600" : "bg-emerald-500/15 text-emerald-600"}`}
                      >
                        {rule.service_id ? (
                          <>
                            <Briefcase className="h-3 w-3" />
                            Service: {getServiceName(rule.service_id)}
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3" />
                            All services
                          </>
                        )}
                      </Badge>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleRuleActive(rule.id, checked)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingRule(rule);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Tag}
              title="No pricing rules yet"
              description="Add surcharges, discounts, or fees to customize your pricing."
              action={{
                label: "Add Price Rule",
                onClick: openCreateDialog,
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Price Rule" : "Add Price Rule"}</DialogTitle>
            <DialogDescription>
              Configure a pricing rule to apply surcharges, discounts, or fees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekend Surcharge"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Applied to weekend appointments"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as RuleFormData["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fee">Fee</SelectItem>
                    <SelectItem value="surcharge">Surcharge</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount Type</Label>
                <Select
                  value={formData.amount_type}
                  onValueChange={(v) => setFormData({ ...formData, amount_type: v as RuleFormData["amount_type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder={formData.amount_type === "percent" ? "10" : "25.00"}
                step={formData.amount_type === "percent" ? "1" : "0.01"}
              />
            </div>

            <div className="space-y-3">
              <Label>Applies To</Label>
              <RadioGroup
                value={formData.scope}
                onValueChange={(v) => {
                  const scope = v as "all" | "specific";
                  setFormData({
                    ...formData,
                    scope,
                    service_id: scope === "all" ? null : formData.service_id,
                  });
                }}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all" className="font-normal cursor-pointer">
                    All services (global rule)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="scope-specific" />
                  <Label htmlFor="scope-specific" className="font-normal cursor-pointer">
                    Specific service
                  </Label>
                </div>
              </RadioGroup>

              {formData.scope === "specific" && (
                <Select
                  value={formData.service_id || ""}
                  onValueChange={(v) => setFormData({ ...formData, service_id: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-active">Active</Label>
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || isSaving || (formData.scope === "specific" && !formData.service_id)}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRule ? "Save Changes" : "Add Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricing Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRule?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
