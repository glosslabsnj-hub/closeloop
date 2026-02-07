/**
 * Competitor Knowledge Editor (All Modes)
 * 
 * Allows businesses to configure competitive positioning scripts
 * for when competitors are mentioned during calls.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";

interface CompetitorKnowledge {
  id: string;
  tenant_id: string;
  competitor_name: string;
  our_advantage: string[] | null;
  common_customer_concerns: string[] | null;
  response_script: string | null;
  price_comparison_notes: string | null;
  never_say: string[] | null;
  created_at: string;
}

export function CompetitorKnowledgeEditor() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<CompetitorKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CompetitorKnowledge | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formAdvantages, setFormAdvantages] = useState("");
  const [formConcerns, setFormConcerns] = useState("");
  const [formScript, setFormScript] = useState("");
  const [formPriceNotes, setFormPriceNotes] = useState("");
  const [formNeverSay, setFormNeverSay] = useState("");

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("competitor_knowledge")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("competitor_name");
    if (!error) setItems((data as CompetitorKnowledge[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormName("");
    setFormAdvantages("");
    setFormConcerns("");
    setFormScript("");
    setFormPriceNotes("");
    setFormNeverSay("");
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: CompetitorKnowledge) => {
    setEditingItem(item);
    setFormName(item.competitor_name);
    setFormAdvantages(item.our_advantage?.join("\n") || "");
    setFormConcerns(item.common_customer_concerns?.join("\n") || "");
    setFormScript(item.response_script || "");
    setFormPriceNotes(item.price_comparison_notes || "");
    setFormNeverSay(item.never_say?.join("\n") || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formName.trim()) return;
    setSaving(true);
    try {
      const parseLines = (text: string) => text.split("\n").map(s => s.trim()).filter(Boolean);
      
      const payload = {
        tenant_id: tenant.id,
        competitor_name: formName.trim(),
        our_advantage: parseLines(formAdvantages),
        common_customer_concerns: parseLines(formConcerns),
        response_script: formScript.trim() || null,
        price_comparison_notes: formPriceNotes.trim() || null,
        never_say: parseLines(formNeverSay),
      };

      if (editingItem) {
        const { error } = await supabase
          .from("competitor_knowledge")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Competitor info updated");
      } else {
        const { error } = await supabase
          .from("competitor_knowledge")
          .insert(payload);
        if (error) throw error;
        toast.success("Competitor info added");
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
        .from("competitor_knowledge")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Competitor info deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const getAIPreview = () => {
    if (!formScript) {
      if (!formName) return "";
      const advantages = formAdvantages.split("\n").filter(Boolean);
      if (advantages.length > 0) {
        return `What sets us apart is ${advantages[0].toLowerCase()}. Would you like to hear more about what we offer?`;
      }
      return `I understand you're comparing options. Let me tell you what makes us different...`;
    }
    return formScript;
  };

  return (
    <>
      <KnowledgeSection
        title="Competitor Positioning"
        description="How your AI should respond when customers mention competitors."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Competitor"
        emptyState={{
          icon: Users,
          title: "No competitor info yet",
          description: "Add competitors so your AI knows how to position your business.",
        }}
        renderItem={(item) => (
          <KnowledgeItem
            onEdit={() => openEditDialog(item)}
            onDelete={() => handleDelete(item.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{item.competitor_name}</span>
            </div>
            {item.our_advantage && item.our_advantage.length > 0 && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                Our advantage: {item.our_advantage[0]}
              </p>
            )}
          </KnowledgeItem>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Competitor" : "Add Competitor"}</DialogTitle>
            <DialogDescription>
              Configure how your AI responds when this competitor is mentioned.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Competitor Name *</Label>
              <Input
                placeholder="e.g., Local Competitor, Big Chain Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Our Advantages (one per line)</Label>
              <Textarea
                placeholder="Locally owned and operated&#10;Same-day service available&#10;Certified technicians&#10;Better warranty"
                value={formAdvantages}
                onChange={(e) => setFormAdvantages(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Common Customer Concerns About Them (one per line)</Label>
              <Textarea
                placeholder="Long wait times&#10;Hidden fees&#10;Poor follow-up"
                value={formConcerns}
                onChange={(e) => setFormConcerns(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                What customers typically complain about (helps AI address concerns)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Price Comparison Notes</Label>
              <Input
                placeholder="e.g., Similar pricing but we include warranty, Their base price is lower but add-ons are expensive"
                value={formPriceNotes}
                onChange={(e) => setFormPriceNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Response Script (what AI should say)</Label>
              <Textarea
                placeholder="I appreciate you sharing that. What sets us apart is... Would you like me to explain our approach?"
                value={formScript}
                onChange={(e) => setFormScript(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Never Say (one per line)</Label>
              <Textarea
                placeholder="Anything negative about their quality&#10;Specific pricing claims&#10;Unverifiable statements"
                value={formNeverSay}
                onChange={(e) => setFormNeverSay(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Things your AI should never say about this competitor
              </p>
            </div>

            {formName && (
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
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Competitor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
