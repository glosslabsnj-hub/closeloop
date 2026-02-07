/**
 * Symptom Triage Editor (Medical Mode)
 * 
 * Allows medical practices to configure symptom-specific handling,
 * escalation triggers, and pre-visit instructions.
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
import { Stethoscope, Loader2, AlertTriangle, Clock, Video } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";

interface SymptomTriage {
  id: string;
  tenant_id: string;
  symptom_category: string;
  symptom_name: string;
  severity_indicators: string[] | null;
  escalation_action: string | null;
  pre_visit_instructions: string | null;
  questions_to_ask: string[] | null;
  can_be_telehealth: boolean;
  typical_duration_minutes: number | null;
  specialty_referral: string | null;
  hipaa_safe_response: string | null;
  created_at: string;
}

const SYMPTOM_CATEGORIES = ["Pain", "Respiratory", "Digestive", "Skin", "Mental Health", "Cardiac", "Neurological", "Pediatric", "Women's Health", "General"];
const ESCALATION_ACTIONS = ["Recommend ER", "Schedule same-day", "Schedule urgent (48hr)", "Routine appointment", "Telehealth only", "Call 911"];

export function SymptomTriageEditor() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<SymptomTriage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SymptomTriage | null>(null);
  
  // Form state
  const [formCategory, setFormCategory] = useState("");
  const [formSymptom, setFormSymptom] = useState("");
  const [formSeverity, setFormSeverity] = useState("");
  const [formEscalation, setFormEscalation] = useState("");
  const [formPreVisit, setFormPreVisit] = useState("");
  const [formQuestions, setFormQuestions] = useState("");
  const [formCanTelehealth, setFormCanTelehealth] = useState(true);
  const [formDuration, setFormDuration] = useState<number | null>(null);
  const [formReferral, setFormReferral] = useState("");
  const [formHIPAASafe, setFormHIPAASafe] = useState("");

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("symptom_triage")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("symptom_category");
    if (!error) setItems((data as SymptomTriage[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormCategory("");
    setFormSymptom("");
    setFormSeverity("");
    setFormEscalation("");
    setFormPreVisit("");
    setFormQuestions("");
    setFormCanTelehealth(true);
    setFormDuration(null);
    setFormReferral("");
    setFormHIPAASafe("");
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: SymptomTriage) => {
    setEditingItem(item);
    setFormCategory(item.symptom_category);
    setFormSymptom(item.symptom_name);
    setFormSeverity(item.severity_indicators?.join(", ") || "");
    setFormEscalation(item.escalation_action || "");
    setFormPreVisit(item.pre_visit_instructions || "");
    setFormQuestions(item.questions_to_ask?.join(", ") || "");
    setFormCanTelehealth(item.can_be_telehealth);
    setFormDuration(item.typical_duration_minutes);
    setFormReferral(item.specialty_referral || "");
    setFormHIPAASafe(item.hipaa_safe_response || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formSymptom.trim() || !formCategory.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        symptom_category: formCategory.trim(),
        symptom_name: formSymptom.trim(),
        severity_indicators: formSeverity.split(",").map(s => s.trim()).filter(Boolean),
        escalation_action: formEscalation || null,
        pre_visit_instructions: formPreVisit.trim() || null,
        questions_to_ask: formQuestions.split(",").map(s => s.trim()).filter(Boolean),
        can_be_telehealth: formCanTelehealth,
        typical_duration_minutes: formDuration,
        specialty_referral: formReferral.trim() || null,
        hipaa_safe_response: formHIPAASafe.trim() || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("symptom_triage")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Symptom triage updated");
      } else {
        const { error } = await supabase
          .from("symptom_triage")
          .insert(payload);
        if (error) throw error;
        toast.success("Symptom triage added");
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
        .from("symptom_triage")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Symptom triage deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const getAIPreview = () => {
    if (!formHIPAASafe) return formSymptom ? `I can help schedule an appointment for ${formSymptom.toLowerCase()}.` : "";
    return formHIPAASafe;
  };

  return (
    <>
      <KnowledgeSection
        title="Symptom Triage Scripts"
        description="Configure HIPAA-safe responses and escalation rules for different symptoms."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Symptom"
        emptyState={{
          icon: Stethoscope,
          title: "No symptom triage configured",
          description: "Add symptom-specific handling rules and HIPAA-safe scripts.",
        }}
        headerActions={
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_CATEGORIES.filter(c => !items.some(i => i.symptom_category === c)).slice(0, 4).map(cat => (
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
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{item.symptom_name}</span>
              <Badge variant="secondary" className="text-xs">{item.symptom_category}</Badge>
              {item.can_be_telehealth && (
                <Badge variant="outline" className="text-xs">
                  <Video className="h-3 w-3 mr-1" />
                  Telehealth
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
              {item.escalation_action && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {item.escalation_action}
                </span>
              )}
              {item.typical_duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.typical_duration_minutes} min appointment
                </span>
              )}
            </div>
          </KnowledgeItem>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Symptom Triage" : "Add Symptom Triage"}</DialogTitle>
            <DialogDescription>
              Configure how your AI handles calls about this symptom in a HIPAA-compliant way.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="">Select category</option>
                  {SYMPTOM_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Symptom Name *</Label>
                <Input
                  placeholder="e.g., Chest Pain, Headache, Rash"
                  value={formSymptom}
                  onChange={(e) => setFormSymptom(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Severity Indicators (red flags, comma-separated)</Label>
              <Input
                placeholder="e.g., Radiating to arm, Difficulty breathing, Fever over 103"
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                These trigger the escalation action below
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Escalation Action</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formEscalation}
                  onChange={(e) => setFormEscalation(e.target.value)}
                >
                  <option value="">Select action</option>
                  {ESCALATION_ACTIONS.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Typical Appointment Duration (min)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 30"
                  value={formDuration || ""}
                  onChange={(e) => setFormDuration(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formCanTelehealth} onCheckedChange={setFormCanTelehealth} />
              <Label className="text-sm">Can be handled via telehealth</Label>
            </div>

            <div className="space-y-2">
              <Label>Questions AI Should Ask (comma-separated)</Label>
              <Input
                placeholder="e.g., When did it start, On a scale of 1-10, Any medications taken"
                value={formQuestions}
                onChange={(e) => setFormQuestions(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Pre-Visit Instructions</Label>
              <Textarea
                placeholder="e.g., Please don't eat or drink 8 hours before your appointment..."
                value={formPreVisit}
                onChange={(e) => setFormPreVisit(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Specialty Referral (if needed)</Label>
              <Input
                placeholder="e.g., Cardiology, Dermatology"
                value={formReferral}
                onChange={(e) => setFormReferral(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>HIPAA-Safe Response (what AI can say)</Label>
              <Textarea
                placeholder="e.g., I can help schedule an appointment. The doctor will evaluate your symptoms and discuss treatment options during your visit..."
                value={formHIPAASafe}
                onChange={(e) => setFormHIPAASafe(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This is the exact script the AI will use - make sure it doesn't provide medical advice
              </p>
            </div>

            {formSymptom && (
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
            <Button onClick={handleSave} disabled={saving || !formSymptom.trim() || !formCategory.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Symptom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
