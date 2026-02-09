import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { BusinessFAQ } from "@/types/database";
import { HelpCircle, Loader2 } from "lucide-react";
import { createFAQ, updateFAQ, deleteFAQ } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SuggestedFAQButtons } from "./SuggestedFAQButtons";
import { KnowledgeSection } from "./shared/KnowledgeSection";
import { KnowledgeItem } from "./shared/KnowledgeItem";
import { InlineUploadButton } from "./InlineUploadButton";

export function BusinessFAQEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [faqs, setFaqs] = useState<BusinessFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<BusinessFAQ | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');

  useEffect(() => {
    if (tenant?.id) fetchFAQs();
  }, [tenant?.id]);

  const fetchFAQs = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from('business_faqs')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('priority_weight', { ascending: false });
    if (!error) setFaqs(data || []);
    setLoading(false);
  };

  const openAddDialog = () => {
    setEditingFaq(null);
    setFormQuestion('');
    setFormAnswer('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (faq: BusinessFAQ) => {
    setEditingFaq(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formQuestion.trim() || !formAnswer.trim()) return;

    setSaving(true);
    try {
      if (editingFaq) {
        await updateFAQ(editingFaq.id, tenant.id, {
          question: formQuestion,
          answer: formAnswer,
        });
        toast.success("FAQ saved — Your AI will now use this.");
      } else {
        await createFAQ(tenant.id, {
          question: formQuestion,
          answer: formAnswer,
          priority_weight: faqs.length,
        });
        toast.success("FAQ added — Your AI can now answer this question.");
      }
      setIsDialogOpen(false);
      fetchFAQs();
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to save FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!tenant?.id) return;
    try {
      await deleteFAQ(id, tenant.id);
      setFaqs(faqs.filter(f => f.id !== id));
      toast.success("FAQ removed");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const handleSuggestionClick = (question: string, answer: string) => {
    setEditingFaq(null);
    setFormQuestion(question);
    setFormAnswer(answer);
    setIsDialogOpen(true);
  };

  return (
    <>
      {/* Prominent Upload Banner */}
      <div className="mb-4">
        <InlineUploadButton 
          contentType="faqs" 
          variant="prominent"
          onUploadComplete={() => {
            fetchFAQs();
            queryClient.invalidateQueries({ queryKey: ["business-context"] });
          }}
        />
      </div>

      <KnowledgeSection
        title="FAQs"
        description="Common questions and answers. Your AI will use these to respond to customer inquiries."
        items={faqs}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add FAQ"
        emptyState={{
          icon: HelpCircle,
          title: "No FAQs yet",
          description: "Add the questions your customers ask most so your AI can answer them instantly.",
        }}
        headerActions={
          <SuggestedFAQButtons 
            onAdd={handleSuggestionClick}
            existingQuestions={faqs.map(f => f.question)}
          />
        }
        renderItem={(faq) => (
          <KnowledgeItem
            onEdit={() => openEditDialog(faq)}
            onDelete={() => handleDeleteFAQ(faq.id)}
          >
            <p className="font-medium text-sm">{faq.question}</p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
          </KnowledgeItem>
        )}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
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
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="What do customers ask? (e.g., What are your hours?)"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                placeholder="What should AI say? (Write it how you'd say it on the phone)"
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
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
              disabled={saving || !formQuestion.trim() || !formAnswer.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingFaq ? "Save Changes" : "Add FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
