import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2 } from "lucide-react";

interface QuickAddPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POLICY_TYPES = [
  { value: "cancellation", label: "Cancellation Policy" },
  { value: "refund", label: "Refund Policy" },
  { value: "deposit", label: "Deposit Policy" },
  { value: "late", label: "Late Arrival Policy" },
  { value: "reschedule", label: "Rescheduling Policy" },
  { value: "other", label: "Other Policy" },
];

export function QuickAddPolicyDialog({ open, onOpenChange }: QuickAddPolicyDialogProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [policyType, setPolicyType] = useState("cancellation");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !content.trim()) return;

    setIsSubmitting(true);

    try {
      const policyLabel = POLICY_TYPES.find(p => p.value === policyType)?.label || "Policy";
      
      // Map policy type to the correct tenant column
      // Core policies go directly to tenants table for AI context builder
      const policyColumnMap: Record<string, string> = {
        cancellation: "cancellation_policy",
        refund: "refund_policy",
        deposit: "deposit_policy",
      };
      
      const tenantColumn = policyColumnMap[policyType];
      
      if (tenantColumn) {
        // Update the tenant's policy column directly (this is what AI reads)
        const { error } = await supabase
          .from("tenants")
          .update({ [tenantColumn]: content.trim() })
          .eq("id", tenant.id);

        if (error) throw error;
      } else {
        // For other policy types, store in ai_knowledge_base as supplementary knowledge
        const { error } = await supabase.from("ai_knowledge_base").insert({
          tenant_id: tenant.id,
          type: "policy",
          title: policyLabel,
          content: content.trim(),
          priority_weight: 10,
        });

        if (error) throw error;
      }

      toast({
        title: "Policy added!",
        description: `Your AI now knows your ${policyLabel.toLowerCase()}.`,
      });

      // Reset and close
      setPolicyType("cancellation");
      setContent("");
      onOpenChange(false);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to add policy",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Add Policy
          </DialogTitle>
          <DialogDescription>
            Add a business policy. Your AI will reference this when customers ask about your policies.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="policy-type">Policy Type</Label>
            <Select value={policyType} onValueChange={setPolicyType}>
              <SelectTrigger id="policy-type">
                <SelectValue placeholder="Select policy type" />
              </SelectTrigger>
              <SelectContent>
                {POLICY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Policy Details</Label>
            <Textarea
              id="content"
              placeholder={
                policyType === "cancellation"
                  ? 'e.g., "Cancellations must be made at least 24 hours in advance. Late cancellations may be subject to a 50% fee."'
                  : "Enter your policy details..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !content.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Policy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
