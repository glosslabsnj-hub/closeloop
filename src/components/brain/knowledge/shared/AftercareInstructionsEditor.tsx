/**
 * Aftercare Instructions Editor (Service + Medical Mode)
 * 
 * Allows businesses to configure post-service instructions
 * that the AI can provide to customers.
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
import { Heart, Loader2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";

interface AftercareInstruction {
  id: string;
  tenant_id: string;
  service_id: string | null;
  service_name: string;
  immediate_care: string[] | null;
  ongoing_care: string[] | null;
  things_to_avoid: string[] | null;
  warning_signs: string[] | null;
  follow_up_recommended: boolean;
  follow_up_timeframe: string | null;
  ai_verbatim_script: string | null;
  created_at: string;
}

export function AftercareInstructionsEditor() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<AftercareInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AftercareInstruction | null>(null);
  
  // Form state
  const [formServiceName, setFormServiceName] = useState("");
  const [formImmediateCare, setFormImmediateCare] = useState("");
  const [formOngoingCare, setFormOngoingCare] = useState("");
  const [formAvoid, setFormAvoid] = useState("");
  const [formWarnings, setFormWarnings] = useState("");
  const [formFollowUp, setFormFollowUp] = useState(false);
  const [formFollowUpTime, setFormFollowUpTime] = useState("");
  const [formAIScript, setFormAIScript] = useState("");

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("aftercare_instructions")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("service_name");
    if (!error) setItems((data as AftercareInstruction[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormServiceName("");
    setFormImmediateCare("");
    setFormOngoingCare("");
    setFormAvoid("");
    setFormWarnings("");
    setFormFollowUp(false);
    setFormFollowUpTime("");
    setFormAIScript("");
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: AftercareInstruction) => {
    setEditingItem(item);
    setFormServiceName(item.service_name);
    setFormImmediateCare(item.immediate_care?.join("\n") || "");
    setFormOngoingCare(item.ongoing_care?.join("\n") || "");
    setFormAvoid(item.things_to_avoid?.join("\n") || "");
    setFormWarnings(item.warning_signs?.join("\n") || "");
    setFormFollowUp(item.follow_up_recommended);
    setFormFollowUpTime(item.follow_up_timeframe || "");
    setFormAIScript(item.ai_verbatim_script || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formServiceName.trim()) return;
    setSaving(true);
    try {
      const parseLines = (text: string) => text.split("\n").map(s => s.trim()).filter(Boolean);
      
      const payload = {
        tenant_id: tenant.id,
        service_name: formServiceName.trim(),
        immediate_care: parseLines(formImmediateCare),
        ongoing_care: parseLines(formOngoingCare),
        things_to_avoid: parseLines(formAvoid),
        warning_signs: parseLines(formWarnings),
        follow_up_recommended: formFollowUp,
        follow_up_timeframe: formFollowUp ? formFollowUpTime.trim() : null,
        ai_verbatim_script: formAIScript.trim() || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("aftercare_instructions")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Aftercare instructions updated");
      } else {
        const { error } = await supabase
          .from("aftercare_instructions")
          .insert(payload);
        if (error) throw error;
        toast.success("Aftercare instructions added");
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
        .from("aftercare_instructions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Aftercare instructions deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const getAIPreview = () => {
    if (!formServiceName) return "";
    let preview = `After your ${formServiceName.toLowerCase()}, `;
    const immediate = formImmediateCare.split("\n").filter(Boolean);
    if (immediate.length > 0) {
      preview += immediate[0].toLowerCase();
    }
    if (formFollowUp && formFollowUpTime) {
      preview += ` We recommend scheduling a follow-up in ${formFollowUpTime}.`;
    }
    return preview;
  };

  return (
    <>
      <KnowledgeSection
        title="Aftercare Instructions"
        description="Post-service care instructions your AI can share with customers."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Instructions"
        emptyState={{
          icon: Heart,
          title: "No aftercare instructions yet",
          description: "Add post-service care instructions for each of your services.",
        }}
        renderItem={(item) => (
          <KnowledgeItem
            onEdit={() => openEditDialog(item)}
            onDelete={() => handleDelete(item.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{item.service_name}</span>
              {item.follow_up_recommended && item.follow_up_timeframe && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Follow-up: {item.follow_up_timeframe}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
              {item.immediate_care && item.immediate_care.length > 0 && (
                <span>{item.immediate_care.length} immediate care steps</span>
              )}
              {item.warning_signs && item.warning_signs.length > 0 && (
                <span className="flex items-center gap-1 text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  {item.warning_signs.length} warning signs
                </span>
              )}
            </div>
          </KnowledgeItem>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Aftercare" : "Add Aftercare Instructions"}</DialogTitle>
            <DialogDescription>
              Configure post-service instructions that your AI will share with customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                placeholder="e.g., Hair Coloring, Dental Cleaning, Full Detail"
                value={formServiceName}
                onChange={(e) => setFormServiceName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Immediate Care (first 24-48 hours, one per line)</Label>
              <Textarea
                placeholder="Wait 24 hours before washing&#10;Avoid direct sunlight&#10;Keep the area dry"
                value={formImmediateCare}
                onChange={(e) => setFormImmediateCare(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Ongoing Care (one per line)</Label>
              <Textarea
                placeholder="Use gentle, color-safe shampoo&#10;Apply provided ointment twice daily&#10;Avoid harsh chemicals"
                value={formOngoingCare}
                onChange={(e) => setFormOngoingCare(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Things to Avoid (one per line)</Label>
              <Textarea
                placeholder="Swimming pools&#10;Hot tubs&#10;Excessive sun exposure"
                value={formAvoid}
                onChange={(e) => setFormAvoid(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Warning Signs - When to Call Back (one per line)</Label>
              <Textarea
                placeholder="Excessive swelling&#10;Signs of infection&#10;Unusual pain after 48 hours"
                value={formWarnings}
                onChange={(e) => setFormWarnings(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formFollowUp} onCheckedChange={setFormFollowUp} />
              <Label className="text-sm">Follow-up appointment recommended</Label>
            </div>

            {formFollowUp && (
              <div className="space-y-2">
                <Label>Follow-up Timeframe</Label>
                <Input
                  placeholder="e.g., 2 weeks, 1 month, 6 months"
                  value={formFollowUpTime}
                  onChange={(e) => setFormFollowUpTime(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>AI Verbatim Script (optional - exactly what to say)</Label>
              <Textarea
                placeholder="After your appointment today, you'll want to..."
                value={formAIScript}
                onChange={(e) => setFormAIScript(e.target.value)}
                rows={3}
              />
            </div>

            {formServiceName && (
              <AIPreviewCard 
                title="AI Preview" 
                preview={formAIScript || getAIPreview()} 
                className="mt-4"
                compact 
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formServiceName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Instructions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
