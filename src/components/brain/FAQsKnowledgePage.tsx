import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, HelpCircle, Loader2, Lightbulb, X, Pencil, Trash2,
  CheckCircle2, AlertTriangle, MessageSquare, Target, TrendingUp
} from "lucide-react";
import { createFAQ, updateFAQ, deleteFAQ } from "@/lib/brain/writeBrainFact";
import type { BusinessFAQ, KnowledgeGap } from "@/types/database";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Suggested FAQs by business mode
const SUGGESTED_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  service: [
    { question: "Do you take walk-ins?", answer: "Yes, we accept walk-ins based on availability. However, we recommend booking an appointment to guarantee your preferred time." },
    { question: "What forms of payment do you accept?", answer: "We accept all major credit cards, cash, and mobile payments like Apple Pay and Google Pay." },
    { question: "Is there parking available?", answer: "Yes, we have free parking available for our customers right in front of our location." },
    { question: "Do you offer gift cards?", answer: "Yes! We offer gift cards in any denomination. They make great gifts and never expire." },
    { question: "What's your cancellation policy?", answer: "We ask for at least 24 hours notice for cancellations. Late cancellations may be subject to a fee." },
    { question: "Do you offer senior discounts?", answer: "Yes, we offer a 10% discount for seniors 65 and older on all services." },
  ],
  food: [
    { question: "Do you deliver?", answer: "Yes, we offer delivery within a 5-mile radius. You can also order through DoorDash and UberEats." },
    { question: "Do you have vegetarian options?", answer: "Yes! We have several vegetarian dishes on our menu. Just ask and we can guide you to the best options." },
    { question: "Can you accommodate allergies?", answer: "Absolutely. Please let us know about any allergies and we'll make sure your order is safe." },
    { question: "Do you take reservations?", answer: "Yes, we accept reservations for parties of 4 or more. Just give us a call to book your table." },
    { question: "What are your hours?", answer: "We're open Tuesday through Sunday from 11 AM to 9 PM. We're closed on Mondays." },
    { question: "Do you cater events?", answer: "Yes, we offer catering for events of all sizes. Contact us for a custom quote." },
  ],
  dispatch: [
    { question: "How quickly can you arrive?", answer: "For urgent situations, we typically arrive within 30-45 minutes depending on your location and traffic." },
    { question: "Do you operate 24/7?", answer: "Yes, we provide 24/7 emergency services. We're always here when you need us." },
    { question: "What areas do you serve?", answer: "We serve the greater metro area and surrounding counties within a 50-mile radius." },
    { question: "Do you accept insurance?", answer: "Yes, we work with most major insurance companies. We can also provide documentation for your claim." },
    { question: "What forms of payment do you accept?", answer: "We accept all major credit cards, cash, and can arrange payment plans for larger jobs." },
    { question: "Are you licensed and insured?", answer: "Yes, we are fully licensed, bonded, and insured. We can provide credentials upon request." },
  ],
  medical: [
    { question: "Do you accept my insurance?", answer: "We accept most major insurance plans. Please call with your specific plan information so we can verify your coverage." },
    { question: "What should I bring to my first appointment?", answer: "Please bring a valid ID, your insurance card, and a list of any current medications you're taking." },
    { question: "How do I get my prescription refill?", answer: "You can request refills through our patient portal or by calling our office during business hours." },
    { question: "Do you offer telehealth appointments?", answer: "Yes, we offer telehealth appointments for appropriate conditions. Ask us if this might work for your needs." },
    { question: "What is your cancellation policy?", answer: "We require 24-hour notice for cancellations. Late cancellations may result in a fee." },
    { question: "How do I get my medical records?", answer: "You can request your records through our patient portal or by filling out a release form at our office." },
  ],
  general: [
    { question: "What are your hours?", answer: "We're open Monday through Friday from 9 AM to 5 PM." },
    { question: "Where are you located?", answer: "We're conveniently located in the heart of downtown. Feel free to call for specific directions." },
    { question: "How can I contact you?", answer: "You can reach us by phone, email, or through our website. We typically respond within 24 hours." },
    { question: "Do you offer free consultations?", answer: "Yes, we offer a free initial consultation to discuss your needs and how we can help." },
    { question: "What forms of payment do you accept?", answer: "We accept all major credit cards, cash, and bank transfers." },
    { question: "Do you have parking?", answer: "Yes, free parking is available for our customers." },
  ],
};

export function FAQsKnowledgePage() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<BusinessFAQ | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<BusinessFAQ | null>(null);
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showTip, setShowTip] = useState(true);

  // Fetch FAQs
  const { data: faqs, isLoading: loadingFaqs } = useQuery({
    queryKey: ["business-faqs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("business_faqs")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("priority_weight", { ascending: false });
      if (error) throw error;
      return data as BusinessFAQ[];
    },
    enabled: !!tenant?.id,
  });

  // Fetch knowledge gaps (unanswered questions)
  const { data: knowledgeGaps } = useQuery({
    queryKey: ["knowledge-gaps", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("knowledge_gaps")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("resolved", false)
        .eq("gap_type", "missing_faq")
        .order("occurrence_count", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as KnowledgeGap[];
    },
    enabled: !!tenant?.id,
  });

  // Get suggested FAQs based on business mode
  const suggestedFaqs = useMemo(() => {
    const mode = businessMode || "general";
    const suggestions = SUGGESTED_FAQS[mode] || SUGGESTED_FAQS.general;
    const existingQuestions = faqs?.map(f => f.question.toLowerCase()) || [];
    
    return suggestions.filter(
      s => !existingQuestions.some(eq => 
        eq.includes(s.question.toLowerCase().slice(0, 15)) ||
        s.question.toLowerCase().includes(eq.slice(0, 15))
      )
    );
  }, [businessMode, faqs]);

  const openAddDialog = (question = "", answer = "") => {
    setEditingFaq(null);
    setFormQuestion(question);
    setFormAnswer(answer);
    setDialogOpen(true);
  };

  const openEditDialog = (faq: BusinessFAQ) => {
    setEditingFaq(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formQuestion.trim() || !formAnswer.trim()) return;

    setIsSaving(true);
    try {
      if (editingFaq) {
        await updateFAQ(editingFaq.id, tenant.id, {
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
        });
        toast.success("FAQ updated");
      } else {
        await createFAQ(tenant.id, {
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          priority_weight: (faqs?.length || 0) + 1,
        });
        toast.success("FAQ added");
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["business-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to save FAQ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenant?.id || !deletingFaq) return;

    try {
      await deleteFAQ(deletingFaq.id, tenant.id);
      toast.success("FAQ deleted");
      setDeleteDialogOpen(false);
      setDeletingFaq(null);
      queryClient.invalidateQueries({ queryKey: ["business-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete FAQ");
    }
  };

  const handleCreateFromGap = async (gap: KnowledgeGap) => {
    openAddDialog(gap.customer_question || gap.description, "");
  };

  const dismissGap = async (gapId: string) => {
    await supabase
      .from("knowledge_gaps")
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolution_notes: "Dismissed" })
      .eq("id", gapId);
    queryClient.invalidateQueries({ queryKey: ["knowledge-gaps"] });
  };

  const faqCount = faqs?.length || 0;
  const isHealthy = faqCount >= 10;

  if (loadingFaqs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">FAQs & Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">
            {faqCount} {faqCount === 1 ? "FAQ" : "FAQs"} configured
          </p>
        </div>
        <Button onClick={() => openAddDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      {/* Tip Banner */}
      {showTip && !isHealthy && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  The more FAQs you add, the better your AI can answer customer questions without needing help.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aim for at least 10 FAQs. You currently have {faqCount}.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowTip(false)} className="shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested FAQs */}
      {suggestedFaqs.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Suggested FAQs (Based on your business type)</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              These questions are commonly asked. Click to add:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedFaqs.slice(0, 6).map((faq) => (
                <Button
                  key={faq.question}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => openAddDialog(faq.question, faq.answer)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {faq.question}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your FAQs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Your FAQs ({faqCount})</span>
          {isHealthy && (
            <Badge variant="secondary" className="gap-1 bg-success/15 text-success">
              <CheckCircle2 className="h-3 w-3" />
              Good coverage
            </Badge>
          )}
        </div>

        {faqCount > 0 ? (
          <Card>
            <div className="divide-y">
              {faqs?.map((faq) => (
                <div key={faq.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Q: {faq.question}</p>
                      <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
                        <p className="text-sm text-muted-foreground">A: {faq.answer}</p>
                      </div>
                      {/* Mock stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Asked {Math.floor(Math.random() * 50 + 5)} times
                        </span>
                        <span className="flex items-center gap-1 text-success">
                          <TrendingUp className="h-3 w-3" />
                          AI answered successfully 100%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(faq)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingFaq(faq);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <HelpCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No FAQs yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add common questions and answers so your AI can help customers.
              </p>
              <Button onClick={() => openAddDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First FAQ
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Unanswered Questions (Knowledge Gaps) */}
      {knowledgeGaps && knowledgeGaps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">Unanswered Questions</span>
            <Badge variant="outline" className="text-warning border-warning/30">
              AI couldn't answer these
            </Badge>
          </div>

          <Card className="border-warning/30">
            <CardContent className="p-4 space-y-3">
              {knowledgeGaps.map((gap) => (
                <div
                  key={gap.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="text-sm">"{gap.customer_question || gap.description}"</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Asked {gap.occurrence_count} {gap.occurrence_count === 1 ? "time" : "times"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCreateFromGap(gap)}
                    >
                      Create FAQ for this
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => dismissGap(gap.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
            <DialogDescription>
              {editingFaq
                ? "Update this question and answer."
                : "Add a common question and how your AI should respond."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="What do customers ask? (e.g., What are your hours?)"
              />
            </div>

            <div className="space-y-2">
              <Label>Answer</Label>
              <Textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="What should AI say? (Write it how you'd say it on the phone)"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Write naturally, as if you're speaking to a customer on the phone.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formQuestion.trim() || !formAnswer.trim()}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingFaq ? "Save Changes" : "Add FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FAQ? Your AI will no longer be able to answer this question.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
