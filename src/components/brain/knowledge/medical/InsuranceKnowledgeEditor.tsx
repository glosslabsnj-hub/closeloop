/**
 * Insurance Knowledge Editor (Medical Mode)
 * 
 * Allows medical practices to configure carrier-specific scripts
 * and verification processes.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";

interface InsuranceKnowledge {
  id: string;
  tenant_id: string;
  carrier_name: string;
  plan_types: string[] | null;
  is_accepted: boolean;
  verification_process: string | null;
  common_coverage_notes: string | null;
  copay_typical_range: string | null;
  pre_authorization_required: string[] | null;
  billing_notes: string | null;
  patient_script: string | null;
  created_at: string;
}

const COMMON_CARRIERS = ["Blue Cross Blue Shield", "Aetna", "Cigna", "UnitedHealthcare", "Humana", "Medicare", "Medicaid", "Kaiser Permanente", "Anthem"];
const PLAN_TYPES = ["HMO", "PPO", "EPO", "POS", "Medicare Advantage", "Medicare Part B", "Medicaid", "High Deductible", "Self-funded"];

export function InsuranceKnowledgeEditor() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<InsuranceKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InsuranceKnowledge | null>(null);
  
  // Form state
  const [formCarrier, setFormCarrier] = useState("");
  const [formPlanTypes, setFormPlanTypes] = useState<string[]>([]);
  const [formIsAccepted, setFormIsAccepted] = useState(true);
  const [formVerification, setFormVerification] = useState("");
  const [formCoverage, setFormCoverage] = useState("");
  const [formCopay, setFormCopay] = useState("");
  const [formPreAuth, setFormPreAuth] = useState("");
  const [formBilling, setFormBilling] = useState("");
  const [formScript, setFormScript] = useState("");

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("insurance_knowledge")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("carrier_name");
    if (!error) setItems((data as InsuranceKnowledge[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormCarrier("");
    setFormPlanTypes([]);
    setFormIsAccepted(true);
    setFormVerification("");
    setFormCoverage("");
    setFormCopay("");
    setFormPreAuth("");
    setFormBilling("");
    setFormScript("");
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: InsuranceKnowledge) => {
    setEditingItem(item);
    setFormCarrier(item.carrier_name);
    setFormPlanTypes(item.plan_types || []);
    setFormIsAccepted(item.is_accepted);
    setFormVerification(item.verification_process || "");
    setFormCoverage(item.common_coverage_notes || "");
    setFormCopay(item.copay_typical_range || "");
    setFormPreAuth(item.pre_authorization_required?.join(", ") || "");
    setFormBilling(item.billing_notes || "");
    setFormScript(item.patient_script || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formCarrier.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        carrier_name: formCarrier.trim(),
        plan_types: formPlanTypes,
        is_accepted: formIsAccepted,
        verification_process: formVerification.trim() || null,
        common_coverage_notes: formCoverage.trim() || null,
        copay_typical_range: formCopay.trim() || null,
        pre_authorization_required: formPreAuth.split(",").map(s => s.trim()).filter(Boolean),
        billing_notes: formBilling.trim() || null,
        patient_script: formScript.trim() || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("insurance_knowledge")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Insurance info updated");
      } else {
        const { error } = await supabase
          .from("insurance_knowledge")
          .insert(payload);
        if (error) throw error;
        toast.success("Insurance info added");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant?.id) return;
    try {
      const { error } = await supabase
        .from("insurance_knowledge")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Insurance info deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const togglePlanType = (type: string) => {
    if (formPlanTypes.includes(type)) {
      setFormPlanTypes(formPlanTypes.filter(t => t !== type));
    } else {
      setFormPlanTypes([...formPlanTypes, type]);
    }
  };

  const getAIPreview = () => {
    if (!formCarrier) return "";
    if (!formIsAccepted) {
      return `Unfortunately, we don't currently accept ${formCarrier}. Would you like information about our self-pay rates?`;
    }
    let preview = `Yes, we accept ${formCarrier}`;
    if (formPlanTypes.length > 0) {
      preview += ` including ${formPlanTypes.join(", ")} plans`;
    }
    preview += ".";
    if (formCopay) {
      preview += ` Typical copays range from ${formCopay}.`;
    }
    return preview;
  };

  return (
    <>
      <KnowledgeSection
        title="Insurance Carrier Info"
        description="Configure what your AI says about each insurance carrier you work with."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Carrier"
        emptyState={{
          icon: Shield,
          title: "No insurance info configured",
          description: "Add carriers you accept and scripts for handling insurance questions.",
        }}
        headerActions={
          <div className="flex flex-wrap gap-2">
            {COMMON_CARRIERS.filter(c => !items.some(i => i.carrier_name === c)).slice(0, 4).map(carrier => (
              <Badge
                key={carrier}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => {
                  resetForm();
                  setFormCarrier(carrier);
                  setIsDialogOpen(true);
                }}
              >
                + {carrier}
              </Badge>
            ))}
          </div>
        }
        renderItem={(item) => (
          <KnowledgeItem
            onEdit={() => openEditDialog(item)}
            onDelete={() => handleDelete(item.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{item.carrier_name}</span>
              {item.is_accepted ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  <Check className="h-3 w-3 mr-1" />
                  Accepted
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                  <X className="h-3 w-3 mr-1" />
                  Not Accepted
                </Badge>
              )}
            </div>
            {item.plan_types && item.plan_types.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.plan_types.map(type => (
                  <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                ))}
              </div>
            )}
          </KnowledgeItem>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Insurance Carrier" : "Add Insurance Carrier"}</DialogTitle>
            <DialogDescription>
              Configure what your AI should say about this insurance carrier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Carrier Name *</Label>
                <Input
                  placeholder="e.g., Blue Cross Blue Shield"
                  value={formCarrier}
                  onChange={(e) => setFormCarrier(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formIsAccepted} onCheckedChange={setFormIsAccepted} />
                <Label className="text-sm">We accept this carrier</Label>
              </div>
            </div>

            {formIsAccepted && (
              <>
                <div className="space-y-2">
                  <Label>Plan Types Accepted</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLAN_TYPES.map(type => (
                      <Badge
                        key={type}
                        variant={formPlanTypes.includes(type) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => togglePlanType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Typical Copay Range</Label>
                  <Input
                    placeholder="e.g., $25-$50"
                    value={formCopay}
                    onChange={(e) => setFormCopay(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Verification Process</Label>
                  <Textarea
                    placeholder="e.g., We verify benefits before your appointment. Please have your member ID ready..."
                    value={formVerification}
                    onChange={(e) => setFormVerification(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Coverage Notes</Label>
                  <Textarea
                    placeholder="e.g., Most plans cover preventive visits at 100%. Specialty visits may require referral..."
                    value={formCoverage}
                    onChange={(e) => setFormCoverage(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Services Requiring Pre-Authorization (comma-separated)</Label>
                  <Input
                    placeholder="e.g., MRI, CT Scan, Surgery"
                    value={formPreAuth}
                    onChange={(e) => setFormPreAuth(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Billing Notes (internal)</Label>
                  <Input
                    placeholder="e.g., Uses Naviguard for out-of-network appeals"
                    value={formBilling}
                    onChange={(e) => setFormBilling(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Patient Script (what AI says)</Label>
              <Textarea
                placeholder={formIsAccepted 
                  ? "e.g., Yes, we're in-network with [Carrier]. Copays typically range from..."
                  : "e.g., We don't currently accept [Carrier], but we offer competitive self-pay rates..."}
                value={formScript}
                onChange={(e) => setFormScript(e.target.value)}
                rows={3}
              />
            </div>

            {formCarrier && (
              <AIPreviewCard 
                title="AI Preview" 
                preview={formScript || getAIPreview()} 
                className="mt-4"
                compact 
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formCarrier.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Carrier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
