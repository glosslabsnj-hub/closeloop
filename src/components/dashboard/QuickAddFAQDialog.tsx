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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Loader2 } from "lucide-react";

interface QuickAddFAQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddFAQDialog({ open, onOpenChange }: QuickAddFAQDialogProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !question.trim() || !answer.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("business_faqs").insert({
        tenant_id: tenant.id,
        question: question.trim(),
        answer: answer.trim(),
      });

      if (error) throw error;

      toast({
        title: "FAQ added!",
        description: "Your AI now knows this answer.",
      });

      // Reset and close
      setQuestion("");
      setAnswer("");
      onOpenChange(false);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to add FAQ",
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
            <HelpCircle className="h-5 w-5 text-primary" />
            Add FAQ
          </DialogTitle>
          <DialogDescription>
            Add a common question and answer. Your AI will use this to respond to customers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder='e.g., "Do you offer free parking?"'
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Answer</Label>
            <Textarea
              id="answer"
              placeholder="Enter the answer your AI should give..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !question.trim() || !answer.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add FAQ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
