import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Lightbulb, FileText, Plus, Pencil, Trash2, MessageSquare, Loader2, Save, X } from "lucide-react";
import { SuggestedKnowledgeButtons } from "./SuggestedKnowledgeButtons";
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
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    setIsAdding(false);
    setEditingId(null);
    setCategory("policy");
    setTitle("");
    setContent("");
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in both title and details." });
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
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

  const startEditing = (entry: KnowledgeEntry) => {
    setEditingId(entry.id);
    setCategory(entry.type as CategoryType);
    setTitle(entry.title);
    setContent(entry.content);
    setIsAdding(true);
  };

  const handleQuickAdd = (template: { title: string; category: CategoryType; placeholder: string }) => {
    setCategory(template.category);
    setTitle(template.title);
    setContent(template.placeholder);
    setIsAdding(true);
  };

  // AI Preview text
  const previewText = entries.length > 0
    ? entries.slice(0, 3).map((e) => e.content.slice(0, 60) + (e.content.length > 60 ? "..." : "")).join(" • ")
    : "Add knowledge above to see how your AI will use it.";

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const existingTitles = entries.map((e) => e.title);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Custom Knowledge
        </CardTitle>
        <CardDescription>
          Add any information you want your AI to know — from warranties to company history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Preview */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">What the AI will say:</p>
              <p className="text-sm text-muted-foreground italic">
                "{previewText}"
              </p>
            </div>
          </div>
        </div>

        {/* Quick Add Suggestions */}
        {!isAdding && (
          <SuggestedKnowledgeButtons
            onSelect={handleQuickAdd}
            existingTitles={existingTitles}
          />
        )}

        {/* Add/Edit Form */}
        {isAdding ? (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{editingId ? "Edit Knowledge" : "Add New Knowledge"}</h4>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>What kind of info is this?</Label>
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
                  placeholder="e.g., Warranty Policy, Special Offer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>What should AI know about this?</Label>
              <Textarea
                placeholder="Write it the way you'd explain it to a new employee..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Write naturally — your AI will use this info when relevant.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingId ? "Update" : "Add Knowledge"}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Knowledge
          </Button>
        )}

        {/* Entries List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Your Custom Knowledge ({entries.length})</p>
            </div>
            {entries.map((entry) => {
              const CategoryIcon = categoryLabels[entry.type as CategoryType]?.icon || FileText;
              return (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{entry.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {categoryLabels[entry.type as CategoryType]?.label || entry.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {entry.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEditing(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this knowledge?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Your AI will no longer know "{entry.title}". This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(entry.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
