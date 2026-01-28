import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { BusinessFAQ } from "@/types/database";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

export default function LiveFAQList() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  
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
    const { error } = await supabase
      .from('business_faqs')
      .insert({
        tenant_id: tenant.id,
        question: newQuestion,
        answer: newAnswer,
        priority_weight: faqs.length,
      });

    if (error) {
      toast({ variant: "destructive", title: "Failed to add FAQ" });
    } else {
      toast({ title: "FAQ added!" });
      setNewQuestion('');
      setNewAnswer('');
      fetchFAQs();
    }
    setSaving(false);
  };

  const updateFAQ = async (id: string, question: string, answer: string) => {
    const { error } = await supabase
      .from('business_faqs')
      .update({ question, answer })
      .eq('id', id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to update FAQ" });
    }
  };

  const deleteFAQ = async (id: string) => {
    const { error } = await supabase
      .from('business_faqs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to delete FAQ" });
    } else {
      setFaqs(faqs.filter(f => f.id !== id));
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">FAQs</CardTitle>
            <CardDescription>
              Answers the AI will use when customers ask common questions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <p className="text-center text-muted-foreground py-4">
            No FAQs configured. Add some above!
          </p>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FAQItem
                key={faq.id}
                faq={faq}
                onUpdate={updateFAQ}
                onDelete={deleteFAQ}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
      <div className="flex items-start justify-between">
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
