/**
 * Vehicle Knowledge Editor (Dispatch Mode)
 * 
 * Allows towing companies to configure vehicle-specific requirements,
 * equipment needs, and pricing considerations.
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
import { Truck, Loader2, AlertTriangle, Wrench, Scale } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";

interface VehicleKnowledge {
  id: string;
  tenant_id: string;
  vehicle_category: string;
  equipment_required: string[] | null;
  weight_class: string | null;
  max_weight_lbs: number | null;
  special_instructions: string | null;
  common_issues: string[] | null;
  estimated_hookup_minutes: number | null;
  requires_special_permit: boolean;
  additional_fees_apply: boolean;
  fee_notes: string | null;
  created_at: string;
}

const VEHICLE_CATEGORIES = ["Sedan", "SUV", "Pickup", "Motorcycle", "Semi/Tractor", "RV/Motorhome", "Box Truck", "Classic/Antique", "Electric Vehicle", "AWD/4WD"];
const EQUIPMENT_OPTIONS = ["Flatbed", "Wheel-lift", "Dollies", "Chains", "Straps", "Winch", "Go-Jacks", "Battery Pack", "Fuel Can"];
const WEIGHT_CLASSES = ["Light (<5,000 lbs)", "Medium (5,000-10,000 lbs)", "Heavy (10,000-26,000 lbs)", "Super Heavy (26,000+ lbs)"];

export function VehicleKnowledgeEditor() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<VehicleKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VehicleKnowledge | null>(null);
  
  // Form state
  const [formCategory, setFormCategory] = useState("");
  const [formEquipment, setFormEquipment] = useState<string[]>([]);
  const [formWeightClass, setFormWeightClass] = useState("");
  const [formMaxWeight, setFormMaxWeight] = useState<number | null>(null);
  const [formInstructions, setFormInstructions] = useState("");
  const [formIssues, setFormIssues] = useState("");
  const [formHookupTime, setFormHookupTime] = useState<number | null>(null);
  const [formPermitRequired, setFormPermitRequired] = useState(false);
  const [formExtraFees, setFormExtraFees] = useState(false);
  const [formFeeNotes, setFormFeeNotes] = useState("");

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("vehicle_knowledge")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("vehicle_category");
    if (!error) setItems((data as VehicleKnowledge[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormCategory("");
    setFormEquipment([]);
    setFormWeightClass("");
    setFormMaxWeight(null);
    setFormInstructions("");
    setFormIssues("");
    setFormHookupTime(null);
    setFormPermitRequired(false);
    setFormExtraFees(false);
    setFormFeeNotes("");
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: VehicleKnowledge) => {
    setEditingItem(item);
    setFormCategory(item.vehicle_category);
    setFormEquipment(item.equipment_required || []);
    setFormWeightClass(item.weight_class || "");
    setFormMaxWeight(item.max_weight_lbs);
    setFormInstructions(item.special_instructions || "");
    setFormIssues(item.common_issues?.join(", ") || "");
    setFormHookupTime(item.estimated_hookup_minutes);
    setFormPermitRequired(item.requires_special_permit);
    setFormExtraFees(item.additional_fees_apply);
    setFormFeeNotes(item.fee_notes || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formCategory.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        vehicle_category: formCategory.trim(),
        equipment_required: formEquipment,
        weight_class: formWeightClass || null,
        max_weight_lbs: formMaxWeight,
        special_instructions: formInstructions.trim() || null,
        common_issues: formIssues.split(",").map(s => s.trim()).filter(Boolean),
        estimated_hookup_minutes: formHookupTime,
        requires_special_permit: formPermitRequired,
        additional_fees_apply: formExtraFees,
        fee_notes: formExtraFees ? formFeeNotes.trim() : null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("vehicle_knowledge")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Vehicle knowledge updated");
      } else {
        const { error } = await supabase
          .from("vehicle_knowledge")
          .insert(payload);
        if (error) throw error;
        toast.success("Vehicle knowledge added");
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
        .from("vehicle_knowledge")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Vehicle knowledge deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const toggleEquipment = (eq: string) => {
    if (formEquipment.includes(eq)) {
      setFormEquipment(formEquipment.filter(e => e !== eq));
    } else {
      setFormEquipment([...formEquipment, eq]);
    }
  };

  const getAIPreview = () => {
    if (!formCategory) return "";
    let preview = `For ${formCategory.toLowerCase()} towing, `;
    if (formEquipment.length > 0) {
      preview += `we'll use ${formEquipment.join(" and ").toLowerCase()}. `;
    }
    if (formHookupTime) {
      preview += `Hookup takes about ${formHookupTime} minutes. `;
    }
    if (formExtraFees && formFeeNotes) {
      preview += formFeeNotes;
    }
    return preview;
  };

  return (
    <>
      <KnowledgeSection
        title="Vehicle Towing Requirements"
        description="Configure equipment and procedures for different vehicle types so your AI quotes accurately."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Vehicle Type"
        emptyState={{
          icon: Truck,
          title: "No vehicle knowledge yet",
          description: "Add towing requirements for different vehicle categories.",
        }}
        headerActions={
          <div className="flex flex-wrap gap-2">
            {VEHICLE_CATEGORIES.filter(c => !items.some(i => i.vehicle_category === c)).slice(0, 4).map(cat => (
              <Badge
                key={cat}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => {
                  resetForm();
                  setFormCategory(cat);
                  setIsDialogOpen(true);
                }}
              >
                + {cat}
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
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{item.vehicle_category}</span>
              {item.requires_special_permit && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Permit
                </Badge>
              )}
              {item.additional_fees_apply && (
                <Badge variant="secondary" className="text-xs">Extra fees</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {item.equipment_required?.map(eq => (
                <Badge key={eq} variant="outline" className="text-xs">
                  <Wrench className="h-3 w-3 mr-1" />
                  {eq}
                </Badge>
              ))}
              {item.weight_class && (
                <Badge variant="secondary" className="text-xs">
                  <Scale className="h-3 w-3 mr-1" />
                  {item.weight_class}
                </Badge>
              )}
            </div>
          </KnowledgeItem>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Vehicle Type" : "Add Vehicle Type"}</DialogTitle>
            <DialogDescription>
              Configure towing requirements for this vehicle category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vehicle Category *</Label>
              <Input
                placeholder="e.g., Motorcycle, Semi, RV"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Equipment Required</Label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map(eq => (
                  <Badge
                    key={eq}
                    variant={formEquipment.includes(eq) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleEquipment(eq)}
                  >
                    <Wrench className="h-3 w-3 mr-1" />
                    {eq}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Weight Class</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formWeightClass}
                  onChange={(e) => setFormWeightClass(e.target.value)}
                >
                  <option value="">Select weight class</option>
                  {WEIGHT_CLASSES.map(wc => (
                    <option key={wc} value={wc}>{wc}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Max Weight (lbs)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 10000"
                  value={formMaxWeight || ""}
                  onChange={(e) => setFormMaxWeight(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estimated Hookup Time (minutes)</Label>
              <Input
                type="number"
                placeholder="e.g., 15"
                value={formHookupTime || ""}
                onChange={(e) => setFormHookupTime(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                placeholder="e.g., Always use flatbed for AWD vehicles to prevent transmission damage..."
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Common Issues (comma-separated)</Label>
              <Input
                placeholder="e.g., Locked steering, parking brake stuck, transmission in gear"
                value={formIssues}
                onChange={(e) => setFormIssues(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={formPermitRequired} onCheckedChange={setFormPermitRequired} />
                <Label className="text-sm">Requires Special Permit</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formExtraFees} onCheckedChange={setFormExtraFees} />
                <Label className="text-sm">Additional Fees Apply</Label>
              </div>
            </div>

            {formExtraFees && (
              <div className="space-y-2">
                <Label>Fee Notes (what AI should say)</Label>
                <Textarea
                  placeholder="e.g., There's an additional $50 charge for motorcycles due to specialized equipment..."
                  value={formFeeNotes}
                  onChange={(e) => setFormFeeNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {formCategory && (
              <AIPreviewCard 
                title="AI Preview" 
                preview={getAIPreview()} 
                className="mt-4"
                compact 
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formCategory.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Vehicle Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
