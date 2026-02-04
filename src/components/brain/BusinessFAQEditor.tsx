import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessFAQ } from "@/types/database";
import { Plus, Trash2, Loader2, MessageCircle } from "lucide-react";
import { createFAQ, updateFAQ, deleteFAQ } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SuggestedFAQButtons } from "./SuggestedFAQButtons";

export function BusinessFAQEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [faqs, setFaqs] = useState<BusinessFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

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

  const addFAQ = async () => {
    if (!tenant?.id || !newQuestion.trim() || !newAnswer.trim()) return;
    setSaving(true);
    try {
      await createFAQ(tenant.id, {
        question: newQuestion,
        answer: newAnswer,
        priority_weight: faqs.length,
      });
      toast.success("FAQ added");
      setNewQuestion('');
      setNewAnswer('');
      fetchFAQs();
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!tenant?.id) return;
    try {
      await deleteFAQ(id, tenant.id);
      setFaqs(faqs.filter(f => f.id !== id));
      toast.success("FAQ deleted");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Suggested FAQs */}
      <SuggestedFAQButtons 
        onAdd={(q, a) => { setNewQuestion(q); setNewAnswer(a); }}
        existingQuestions={faqs.map(f => f.question)}
      />

      {/* Add new */}
      <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
        <Input
          placeholder="What do customers ask? (e.g., What are your hours?)"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
        />
        <Textarea
          placeholder="What should AI say? (Write it how you'd say it on the phone)"
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          rows={2}
        />
        <Button
          size="sm"
          onClick={addFAQ}
          disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add FAQ
        </Button>
      </div>

      {/* Existing FAQs */}
      {faqs.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">No FAQs yet</p>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="p-3 rounded-lg border flex items-start gap-3">
              <MessageCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{faq.question}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{faq.answer}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteFAQ(faq.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
