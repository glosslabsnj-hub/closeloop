import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lightbulb, FileText, Loader2 } from "lucide-react";
import { SuggestedKnowledgeButtons } from "./SuggestedKnowledgeButtons";
import { KnowledgeSection } from "../shared/KnowledgeSection";
import { KnowledgeItem } from "../shared/KnowledgeItem";
import {
  createCustomKnowledge,
  updateCustomKnowledge,
  deleteCustomKnowledge,
} from "@/lib/brain/writeBrainFact";

interface KnowledgeEntry {
  id: string;
  type: "policy" | "upsell";
  title: string;
  content: string;
  priority_weight: number;
  created_at: string;
}

type CategoryType = "policy" | "upsell";

const categoryLabels: Record<CategoryType, { label: string; icon: typeof FileText }> = {
  policy: { label: "Facts AI should know", icon: FileText },
  upsell: { label: "Things AI should mention", icon: Lightbulb },
};

export function CustomKnowledgeEditor() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [category, setCategory] = useState<CategoryType>("policy");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Fetch existing knowledge entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["custom-knowledge", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("ai_knowledge_base")
        .select("*")
        .eq("tenant_id", tenant.id)
        .in("type", ["policy", "upsell"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KnowledgeEntry[];
    },
    enabled: !!tenant?.id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (entry: { type: CategoryType; title: string; content: string }) => {
      if (!tenant?.id) throw new Error("No tenant");
      return createCustomKnowledge(tenant.id, entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-knowledge", tenant?.id] });
      toast({ title: "Knowledge added!", description: "Your AI now knows this information." });
      resetForm();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to add", description: error.message });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { title?: string; content?: string; type?: CategoryType } }) => {
      if (!tenant?.id) throw new Error("No tenant");
      return updateCustomKnowledge(id, tenant.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-knowledge", tenant?.id] });
      toast({ title: "Updated!", description: "Knowledge updated successfully." });
      resetForm();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update", description: error.message });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("No tenant");
      return deleteCustomKnowledge(id, tenant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-knowledge", tenant?.id] });
      toast({ title: "Deleted", description: "Knowledge removed." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete", description: error.message });
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingEntry(null);
    setCategory("policy");
    setTitle("");
    setContent("");
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in both title and details." });
      return;
    }

    if (editingEntry) {
      updateMutation.mutate({
        id: editingEntry.id,
        updates: { title: title.trim(), content: content.trim(), type: category },
      });
    } else {
      createMutation.mutate({
        type: category,
        title: title.trim(),
        content: content.trim(),
      });
    }
  };

  const openAddDialog = () => {
    setEditingEntry(null);
    setCategory("policy");
    setTitle("");
    setContent("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setCategory(entry.type as CategoryType);
    setTitle(entry.title);
    setContent(entry.content);
    setIsDialogOpen(true);
  };

  const handleQuickAdd = (template: { title: string; category: CategoryType; placeholder: string }) => {
    setEditingEntry(null);
    setCategory(template.category);
    setTitle(template.title);
    setContent(template.placeholder);
    setIsDialogOpen(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const existingTitles = entries.map((e) => e.title);

  return (
    <>
      <KnowledgeSection
        title="Custom Knowledge"
        description="Add any information you want your AI to know — from warranties to company history."
        items={entries}
        isLoading={isLoading}
        onAdd={openAddDialog}
        addButtonLabel="Add Knowledge"
        emptyState={{
          icon: Lightbulb,
          title: "No custom knowledge yet",
          description: "Add facts, policies, or promotions that your AI should know about.",
        }}
        headerActions={
          <SuggestedKnowledgeButtons
            onSelect={handleQuickAdd}
            existingTitles={existingTitles}
          />
        }
        renderItem={(entry) => {
          const CategoryIcon = categoryLabels[entry.type as CategoryType]?.icon || FileText;
          return (
            <KnowledgeItem
              onEdit={() => openEditDialog(entry)}
              onDelete={() => deleteMutation.mutate(entry.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm truncate">{entry.title}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {categoryLabels[entry.type as CategoryType]?.label || entry.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{entry.content}</p>
            </KnowledgeItem>
          );
        }}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Knowledge" : "Add Custom Knowledge"}</DialogTitle>
            <DialogDescription>
              {editingEntry
                ? "Update this knowledge entry."
                : "Add information your AI should know about."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as CategoryType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Facts AI should know
                      </span>
                    </SelectItem>
                    <SelectItem value="upsell">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Things AI should mention
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic</Label>
                <Input
                  placeholder="e.g., Warranty Policy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                placeholder="Write it how you'd explain it to a new employee..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Write naturally — your AI will use this when relevant.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim() || !content.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEntry ? "Save Changes" : "Add Knowledge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
