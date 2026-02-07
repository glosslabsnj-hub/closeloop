/**
 * Roadside Knowledge Editor (Dispatch Mode)
 * 
 * Allows towing/roadside companies to configure situation-specific
 * safety scripts, service times, and escalation triggers.
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
import { AlertTriangle, Loader2, Clock, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";

interface RoadsideKnowledge {
  id: string;
  tenant_id: string;
  situation_type: string;
  safety_instructions: string | null;
  estimated_service_time_minutes: number | null;
  tools_required: string[] | null;
  can_be_self_service: boolean;
  self_service_tips: string | null;
  escalation_triggers: string[] | null;
  common_questions: string[] | null;
  ai_script: string | null;
  priority_level: string | null;
  created_at: string;
}

const SITUATION_TYPES = ["Flat Tire", "Dead Battery", "Lockout", "Out of Fuel", "Overheating", "Stuck/Off-Road", "Accident", "Breakdown", "Transmission Issue"];
const PRIORITY_LEVELS = [
  { value: "standard", label: "Standard", color: "bg-blue-100 text-blue-700" },
  { value: "urgent", label: "Urgent", color: "bg-yellow-100 text-yellow-700" },
  { value: "emergency", label: "Emergency", color: "bg-red-100 text-red-700" },
];

export function RoadsideKnowledgeEditor() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<RoadsideKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadsideKnowledge | null>(null);
  
  // Form state
  const [formSituation, setFormSituation] = useState("");
  const [formSafety, setFormSafety] = useState("");
  const [formServiceTime, setFormServiceTime] = useState<number | null>(null);
  const [formTools, setFormTools] = useState("");
  const [formCanSelfService, setFormCanSelfService] = useState(false);
  const [formSelfServiceTips, setFormSelfServiceTips] = useState("");
  const [formEscalation, setFormEscalation] = useState("");
  const [formQuestions, setFormQuestions] = useState("");
  const [formAIScript, setFormAIScript] = useState("");
  const [formPriority, setFormPriority] = useState("standard");

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("roadside_knowledge")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("situation_type");
    if (!error) setItems((data as RoadsideKnowledge[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormSituation("");
    setFormSafety("");
    setFormServiceTime(null);
    setFormTools("");
    setFormCanSelfService(false);
    setFormSelfServiceTips("");
    setFormEscalation("");
    setFormQuestions("");
    setFormAIScript("");
    setFormPriority("standard");
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: RoadsideKnowledge) => {
    setEditingItem(item);
    setFormSituation(item.situation_type);
    setFormSafety(item.safety_instructions || "");
    setFormServiceTime(item.estimated_service_time_minutes);
    setFormTools(item.tools_required?.join(", ") || "");
    setFormCanSelfService(item.can_be_self_service);
    setFormSelfServiceTips(item.self_service_tips || "");
    setFormEscalation(item.escalation_triggers?.join(", ") || "");
    setFormQuestions(item.common_questions?.join(", ") || "");
    setFormAIScript(item.ai_script || "");
    setFormPriority(item.priority_level || "standard");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formSituation.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        situation_type: formSituation.trim(),
        safety_instructions: formSafety.trim() || null,
        estimated_service_time_minutes: formServiceTime,
        tools_required: formTools.split(",").map(s => s.trim()).filter(Boolean),
        can_be_self_service: formCanSelfService,
        self_service_tips: formCanSelfService ? formSelfServiceTips.trim() : null,
        escalation_triggers: formEscalation.split(",").map(s => s.trim()).filter(Boolean),
        common_questions: formQuestions.split(",").map(s => s.trim()).filter(Boolean),
        ai_script: formAIScript.trim() || null,
        priority_level: formPriority,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("roadside_knowledge")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Roadside knowledge updated");
      } else {
        const { error } = await supabase
          .from("roadside_knowledge")
          .insert(payload);
        if (error) throw error;
        toast.success("Roadside knowledge added");
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
        .from("roadside_knowledge")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Roadside knowledge deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const getPriorityConfig = (level: string | null) => {
    return PRIORITY_LEVELS.find(p => p.value === level) || PRIORITY_LEVELS[0];
  };

  const getAIPreview = () => {
    if (!formSituation) return "";
    let preview = "";
    if (formSafety) {
      preview += `First, ${formSafety} `;
    }
    if (formServiceTime) {
      preview += `Our technician can typically resolve ${formSituation.toLowerCase()} in about ${formServiceTime} minutes. `;
    }
    return preview || `I'll dispatch help for your ${formSituation.toLowerCase()} right away.`;
  };

  return (
    <>
      <KnowledgeSection
        title="Roadside Situations"
        description="Configure how your AI handles different roadside emergencies with safety scripts and escalation triggers."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Situation"
        emptyState={{
          icon: AlertTriangle,
          title: "No roadside knowledge yet",
          description: "Add safety scripts and procedures for different roadside situations.",
        }}
        headerActions={
          <div className="flex flex-wrap gap-2">
            {SITUATION_TYPES.filter(s => !items.some(i => i.situation_type === s)).slice(0, 4).map(sit => (
              <Badge
                key={sit}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => {
                  resetForm();
                  setFormSituation(sit);
                  setIsDialogOpen(true);
                }}
              >
                + {sit}
              </Badge>
            ))}
          </div>
        }
        renderItem={(item) => {
          const priority = getPriorityConfig(item.priority_level);
          return (
            <KnowledgeItem
              onEdit={() => openEditDialog(item)}
              onDelete={() => handleDelete(item.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                {item.priority_level === "emergency" ? (
                  <Zap className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">{item.situation_type}</span>
                <Badge className={`text-xs ${priority.color}`}>
                  {priority.label}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                {item.estimated_service_time_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{item.estimated_service_time_minutes} min
                  </span>
                )}
                {item.safety_instructions && (
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Safety script set
                  </span>
                )}
              </div>
            </KnowledgeItem>
          );
        }}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Situation" : "Add Roadside Situation"}</DialogTitle>
            <DialogDescription>
              Configure how your AI handles this type of roadside emergency.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Situation Type *</Label>
                <Input
                  placeholder="e.g., Flat Tire, Dead Battery"
                  value={formSituation}
                  onChange={(e) => setFormSituation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority Level</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                >
                  {PRIORITY_LEVELS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Safety Instructions (AI speaks this first)</Label>
              <Textarea
                placeholder="e.g., First, are you in a safe location away from traffic? If you're on a highway, please turn on your hazards and stay in your vehicle..."
                value={formSafety}
                onChange={(e) => setFormSafety(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                What should the AI tell callers to keep them safe while waiting?
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estimated Service Time (minutes)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 20"
                  value={formServiceTime || ""}
                  onChange={(e) => setFormServiceTime(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tools Required (comma-separated)</Label>
                <Input
                  placeholder="e.g., Jack, spare tire, lug wrench"
                  value={formTools}
                  onChange={(e) => setFormTools(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Escalation Triggers (comma-separated)</Label>
              <Input
                placeholder="e.g., Vehicle on fire, Injury, Highway shoulder"
                value={formEscalation}
                onChange={(e) => setFormEscalation(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Situations where AI should recommend 911 or immediate escalation
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formCanSelfService} onCheckedChange={setFormCanSelfService} />
              <Label className="text-sm">Can be self-serviced (offer tips)</Label>
            </div>

            {formCanSelfService && (
              <div className="space-y-2">
                <Label>Self-Service Tips</Label>
                <Textarea
                  placeholder="e.g., If you have a spare tire and feel comfortable, the jack is typically located..."
                  value={formSelfServiceTips}
                  onChange={(e) => setFormSelfServiceTips(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Common Questions (comma-separated)</Label>
              <Input
                placeholder="e.g., How long will it take, Do you have my size tire"
                value={formQuestions}
                onChange={(e) => setFormQuestions(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>AI Script (optional - exactly what to say)</Label>
              <Textarea
                placeholder="Full script for how AI should handle this situation..."
                value={formAIScript}
                onChange={(e) => setFormAIScript(e.target.value)}
                rows={3}
              />
            </div>

            {formSituation && (
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
            <Button onClick={handleSave} disabled={saving || !formSituation.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Situation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
