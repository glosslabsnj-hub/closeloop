import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2, Plus, Lightbulb } from "lucide-react";
import { createObjectionResponse, updateObjectionResponse, deleteObjectionResponse } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KnowledgeSection } from "../shared/KnowledgeSection";
import { KnowledgeItem } from "../shared/KnowledgeItem";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { getObjectionExamples } from "@/lib/industryExamples";

interface ObjectionResponse {
  id: string;
  tenant_id: string;
  objection: string;
  response: string;
  priority_weight?: number;
  created_at?: string;
}

export function BusinessObjectionEditor() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();
  
  const examples = getObjectionExamples(businessMode);

  const [objections, setObjections] = useState<ObjectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ObjectionResponse | null>(null);
  const [formObjection, setFormObjection] = useState('');
  const [formResponse, setFormResponse] = useState('');

  useEffect(() => {
    if (tenant?.id) {
      fetchObjections();
    }
  }, [tenant?.id]);

  const fetchObjections = async () => {
    if (!tenant?.id) return;

    const { data, error } = await supabase
      .from('objection_responses')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('priority_weight', { ascending: false });

    if (error) {
      console.error('Failed to fetch objections:', error);
    } else {
      setObjections(data || []);
    }
    setLoading(false);
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormObjection('');
    setFormResponse('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: ObjectionResponse) => {
    setEditingItem(item);
    setFormObjection(item.objection);
    setFormResponse(item.response);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formObjection.trim() || !formResponse.trim()) return;

    setSaving(true);
    try {
      if (editingItem) {
        await updateObjectionResponse(editingItem.id, tenant.id, {
          objection: formObjection,
          response: formResponse,
        });
        toast.success("Response updated");
      } else {
        await createObjectionResponse(tenant.id, {
          objection: formObjection,
          response: formResponse,
          priority_weight: objections.length,
        });
        toast.success("Response added");
      }
      setIsDialogOpen(false);
      fetchObjections();
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteObjection = async (id: string) => {
    if (!tenant?.id) return;

    try {
      await deleteObjectionResponse(id, tenant.id);
      setObjections(objections.filter(o => o.id !== id));
      toast.success("Response deleted");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  // Suggested objection buttons for quick add
  const SuggestedObjectionButtons = () => {
    const availableSuggestions = examples.commonObjections.filter(
      suggestion => !objections.some(o => o.objection.toLowerCase().includes(suggestion.objection.toLowerCase().slice(0, 15)))
    );
    
    if (availableSuggestions.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lightbulb className="h-3 w-3 shrink-0" />
          <span className="truncate">Quick add:</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
          {availableSuggestions.slice(0, 3).map((suggestion) => (
            <button
              key={suggestion.objection}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-border bg-background hover:bg-muted/50 transition-colors whitespace-nowrap shrink-0"
              onClick={() => {
                setEditingItem(null);
                setFormObjection(suggestion.objection);
                setFormResponse(suggestion.response);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3" />
              {suggestion.objection}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <KnowledgeSection
        title="Objection Handling"
        description="When customers have doubts or push back, here's how your AI responds."
        items={objections}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Response"
        emptyState={{
          icon: MessageSquare,
          title: "No objection responses",
          description: "Add responses to common customer objections to help your AI close more leads.",
        }}
        headerActions={<SuggestedObjectionButtons />}
        renderItem={(item) => (
          <KnowledgeItem
            onEdit={() => openEditDialog(item)}
            onDelete={() => handleDeleteObjection(item.id)}
          >
            <p className="font-medium text-sm">{item.objection}</p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.response}</p>
          </KnowledgeItem>
        )}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Response" : "Add Objection Response"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update how your AI handles this objection."
                : "Add a common objection and how your AI should respond."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="objection">When customer says...</Label>
              <Input
                id="objection"
                placeholder={examples.objectionPlaceholder}
                value={formObjection}
                onChange={(e) => setFormObjection(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response">AI should respond...</Label>
              <Textarea
                id="response"
                placeholder={examples.responsePlaceholder}
                value={formResponse}
                onChange={(e) => setFormResponse(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formObjection.trim() || !formResponse.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
