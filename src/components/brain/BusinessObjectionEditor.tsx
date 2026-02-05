import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2 } from "lucide-react";
import { createObjectionResponse, updateObjectionResponse, deleteObjectionResponse } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KnowledgeSection } from "./shared/KnowledgeSection";
import { KnowledgeItem } from "./shared/KnowledgeItem";

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
  const queryClient = useQueryClient();

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
                placeholder="e.g., That's too expensive"
                value={formObjection}
                onChange={(e) => setFormObjection(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response">AI should respond...</Label>
              <Textarea
                id="response"
                placeholder="Write it how you'd say it on the phone"
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
