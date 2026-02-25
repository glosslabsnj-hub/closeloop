/**
 * Custom Policies Editor
 * 
 * Allows businesses to add freeform custom policies beyond the predefined options.
 * Uses the ai_knowledge_base table with type="policy".
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface CustomPolicy {
  id: string;
  title: string;
  content: string;
  priority_weight: number;
  created_at: string;
}

// Mode-specific policy suggestions
const POLICY_SUGGESTIONS: Record<BusinessMode, Array<{ title: string; placeholder: string }>> = {
  service: [
    { title: "Weather Policy", placeholder: "If severe weather prevents us from arriving, we'll reschedule at no extra charge..." },
    { title: "Late Arrival Policy", placeholder: "If you're not available when we arrive, we wait 15 minutes before..." },
    { title: "Emergency Calls", placeholder: "For after-hours emergencies, we charge an additional..." },
    { title: "Warranty Policy", placeholder: "All work is guaranteed for 90 days..." },
    { title: "Pet Policy", placeholder: "Please secure pets before our arrival..." },
  ],
  dispatch: [
    { title: "Storage Fees", placeholder: "Daily storage rates are $X/day for standard vehicles..." },
    { title: "After-Hours Policy", placeholder: "For calls after 6 PM, there's a $X after-hours fee..." },
    { title: "Release Requirements", placeholder: "To release your vehicle, you'll need valid ID and proof of ownership..." },
    { title: "Mileage Policy", placeholder: "For tows over 20 miles, we charge $X per additional mile..." },
    { title: "Cash vs Card", placeholder: "We prefer card payment, but accept cash with a $X fee..." },
  ],
  food: [
    { title: "Allergy Policy", placeholder: "Please inform us of any allergies. While we take precautions..." },
    { title: "Outside Food", placeholder: "We don't allow outside food, but cakes for celebrations are welcome..." },
    { title: "Wait Time Policy", placeholder: "During peak hours, wait times may be 30-45 minutes..." },
    { title: "Substitutions", placeholder: "We're happy to accommodate substitutions when possible..." },
    { title: "Split Check Policy", placeholder: "We can split checks up to 4 ways..." },
    { title: "Corkage Fee", placeholder: "Corkage fee is $X per bottle..." },
  ],
  medical: [
    { title: "Appointment Reminders", placeholder: "We send reminders 48 hours and 24 hours before appointments..." },
    { title: "Insurance Verification", placeholder: "Please verify your insurance is accepted before your visit..." },
    { title: "Records Request", placeholder: "Medical records can be requested through our patient portal..." },
    { title: "Prescription Refills", placeholder: "Please allow 48 hours for prescription refill requests..." },
    { title: "Minor Consent", placeholder: "Patients under 18 must have a guardian present..." },
  ],
  general: [
    { title: "Response Time", placeholder: "We aim to respond to all inquiries within 24 hours..." },
    { title: "Holiday Hours", placeholder: "We're closed on major holidays including..." },
    { title: "Privacy Policy", placeholder: "We never share your information with third parties..." },
    { title: "Satisfaction Guarantee", placeholder: "We stand behind our work with a 100% satisfaction guarantee..." },
    { title: "Gift Cards", placeholder: "Gift cards are available in any amount and never expire..." },
  ],
  sales: [
    { title: "Return Policy", placeholder: "Items can be returned within 30 days with original receipt..." },
    { title: "Warranty Policy", placeholder: "All products come with a manufacturer warranty..." },
    { title: "Financing Terms", placeholder: "We offer financing options with approved credit..." },
    { title: "Price Match", placeholder: "We match competitor prices on identical items..." },
    { title: "Trade-In Policy", placeholder: "We accept trade-ins and offer fair market value..." },
  ],
};

export function CustomPoliciesEditor() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CustomPolicy | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Fetch custom policies
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["custom-policies", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("ai_knowledge_base")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("type", "policy")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomPolicy[];
    },
    enabled: !!tenant?.id,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (policy: { title: string; content: string }) => {
      if (!tenant?.id) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("ai_knowledge_base")
        .insert({
          tenant_id: tenant.id,
          type: "policy",
          title: policy.title,
          content: policy.content,
          priority_weight: 50,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-policies", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["custom-knowledge", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      toast.success("Policy added! Your AI now knows this.");
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add policy");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { title: string; content: string } }) => {
      if (!tenant?.id) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("ai_knowledge_base")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-policies", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["custom-knowledge", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      toast.success("Policy updated!");
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update policy");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("No tenant");
      const { error } = await supabase
        .from("ai_knowledge_base")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-policies", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["custom-knowledge", tenant?.id] });
      toast.success("Policy removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete policy");
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingPolicy(null);
    setTitle("");
    setContent("");
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and policy details");
      return;
    }

    if (editingPolicy) {
      updateMutation.mutate({
        id: editingPolicy.id,
        updates: { title: title.trim(), content: content.trim() },
      });
    } else {
      createMutation.mutate({
        title: title.trim(),
        content: content.trim(),
      });
    }
  };

  const openAddDialog = () => {
    setEditingPolicy(null);
    setTitle("");
    setContent("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (policy: CustomPolicy) => {
    setEditingPolicy(policy);
    setTitle(policy.title);
    setContent(policy.content);
    setIsDialogOpen(true);
  };

  const handleSuggestionClick = (suggestion: { title: string; placeholder: string }) => {
    setEditingPolicy(null);
    setTitle(suggestion.title);
    setContent(suggestion.placeholder);
    setIsDialogOpen(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const suggestions = POLICY_SUGGESTIONS[businessMode] || POLICY_SUGGESTIONS.general;
  const existingTitles = policies.map((p) => p.title.toLowerCase());
  const availableSuggestions = suggestions.filter(
    (s) => !existingTitles.includes(s.title.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Add Suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Suggested policies for your business:</Label>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.slice(0, 4).map((suggestion) => (
              <Button
                key={suggestion.title}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {suggestion.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Existing Policies */}
      {policies.length > 0 ? (
        <div className="space-y-2">
          {policies.map((policy) => (
            <Card key={policy.id} className="group">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{policy.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{policy.content}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditDialog(policy)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(policy.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed rounded-lg">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No custom policies yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add policies for scenarios not covered by the standard options
          </p>
        </div>
      )}

      {/* Add Button */}
      <Button variant="outline" onClick={openAddDialog} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Custom Policy
      </Button>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? "Edit Policy" : "Add Custom Policy"}</DialogTitle>
            <DialogDescription>
              {editingPolicy
                ? "Update this policy. Changes will be available to your AI immediately."
                : "Add a policy for a specific scenario. Your AI will use this when relevant."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Policy Name</Label>
              <Input
                placeholder="e.g., Weather Policy, Late Arrival, Gift Cards..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Policy Details</Label>
              <Textarea
                placeholder="Explain this policy as you would to a customer calling..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Write naturally — your AI will paraphrase this when explaining to callers.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim() || !content.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPolicy ? "Save Changes" : "Add Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
