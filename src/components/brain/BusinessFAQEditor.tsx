import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessFAQ } from "@/types/database";
import { Plus, Trash2, Save, Loader2, MessageCircle, HelpCircle, Info, Lightbulb } from "lucide-react";
import { createFAQ, updateFAQ, deleteFAQ } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SuggestedFAQButtons } from "./SuggestedFAQButtons";
import { AIPreviewCard } from "./AIPreviewCard";
import { InlineUploadButton } from "./InlineUploadButton";

export function BusinessFAQEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [faqs, setFaqs] = useState<BusinessFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  useEffect(() => {
    if (tenant?.id) {
      fetchFAQs();
    }
  }, [tenant?.id]);

  const fetchFAQs = async () => {
    if (!tenant?.id) return;

    const { data, error } = await supabase
      .from('business_faqs')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('priority_weight', { ascending: false });

    if (error) {
      console.error('Failed to fetch FAQs:', error);
    } else {
      setFaqs(data || []);
    }
    setLoading(false);
  };

  const addFAQ = async () => {
    if (!tenant?.id || !newQuestion.trim() || !newAnswer.trim()) return;

    setSaving(true);
    try {
      await createFAQ(tenant.id, {
        question: newQuestion,
        answer: newAnswer,
        priority_weight: faqs.length,
      });

      toast.success("FAQ added successfully");
      setNewQuestion('');
      setNewAnswer('');
      fetchFAQs();
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to add FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFAQ = async (id: string, question: string, answer: string) => {
    if (!tenant?.id) return;

    try {
      await updateFAQ(id, tenant.id, { question, answer });
      toast.success("FAQ updated successfully");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update FAQ");
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!tenant?.id) return;

    try {
      await deleteFAQ(id, tenant.id);
      setFaqs(faqs.filter(f => f.id !== id));
      toast.success("FAQ deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete FAQ");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading FAQs...</p>
        </CardContent>
      </Card>
    );
  }

  // Build AI preview from first FAQ
  const firstFaq = faqs[0];
  const aiPreview = firstFaq
    ? `When someone asks "${firstFaq.question}", I'll say: "${firstFaq.answer.slice(0, 100)}${firstFaq.answer.length > 100 ? '...' : ''}"`
    : "Add FAQs so I can answer common customer questions.";

  // Handler for suggested FAQ quick-add
  const handleQuickAddFAQ = async (question: string, answer: string) => {
    setNewQuestion(question);
    setNewAnswer(answer);
  };

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      {faqs.length > 0 && (
        <AIPreviewCard
          preview={aiPreview}
          title="How the AI uses FAQs"
          subtitle={`${faqs.length} FAQ${faqs.length !== 1 ? 's' : ''} configured`}
        />
      )}

      {/* Explanation Card */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What are FAQs?</p>
            <p className="text-sm text-muted-foreground">
              Add common questions your customers ask, along with your preferred answers. 
              The AI will use these to respond accurately and consistently.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Have an FAQ document or website? Upload it and we'll extract the Q&As automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                FAQs
              </CardTitle>
              <CardDescription>
                Common questions and answers — the AI uses these to respond to customers
              </CardDescription>
            </div>
            <InlineUploadButton 
              contentType="faqs" 
              variant="compact"
              onUploadComplete={() => fetchFAQs()}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggested FAQs */}
          <SuggestedFAQButtons 
            onAdd={handleQuickAddFAQ}
            existingQuestions={faqs.map(f => f.question)}
          />

          {/* Add new FAQ */}
          <div className="p-4 border rounded-lg bg-secondary/30 space-y-3">
            <p className="font-medium text-sm">Add New FAQ</p>
            <Input
              placeholder="Question (e.g., What are your hours?)"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
            <Textarea
              placeholder="Answer..."
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={2}
            />
            <Button
              size="sm"
              onClick={addFAQ}
              disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add FAQ
            </Button>
          </div>

          {/* Existing FAQs */}
          {faqs.length === 0 ? (
            <div className="text-center py-6">
              <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium">No FAQs yet</p>
              <p className="text-sm text-muted-foreground">
                Add common questions so your AI can answer them
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <FAQItem
                  key={faq.id}
                  faq={faq}
                  onUpdate={handleUpdateFAQ}
                  onDelete={handleDeleteFAQ}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FAQItem({
  faq,
  onUpdate,
  onDelete
}: {
  faq: BusinessFAQ;
  onUpdate: (id: string, question: string, answer: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);

  const handleSave = () => {
    onUpdate(faq.id, question, answer);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-4 rounded-lg border space-y-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Save className="h-3 w-3" />
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-start gap-3">
        <MessageCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <p
            className="font-medium cursor-pointer hover:text-primary"
            onClick={() => setEditing(true)}
          >
            {faq.question}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={() => onDelete(faq.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
