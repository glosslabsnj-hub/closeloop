import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, MessageCircle } from "lucide-react";

export interface FAQ {
  question: string;
  answer: string;
}

interface FAQEditorProps {
  faqs: FAQ[];
  onChange: (faqs: FAQ[]) => void;
}

export default function FAQEditor({ faqs, onChange }: FAQEditorProps) {
  const updateFAQ = (index: number, field: keyof FAQ, value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeFAQ = (index: number) => {
    const updated = faqs.filter((_, i) => i !== index);
    onChange(updated);
  };

  const addFAQ = () => {
    onChange([...faqs, { question: '', answer: '' }]);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Add questions your customers frequently ask. The AI will use these to answer calls intelligently.
      </p>
      
      {faqs.map((faq, index) => (
        <div key={index} className="p-3 rounded-lg border bg-card space-y-3">
          <div className="flex items-start gap-2">
            <MessageCircle className="h-4 w-4 text-primary mt-2.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <Input
                value={faq.question}
                onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                placeholder="Customer question (e.g., What are your hours?)"
                className="text-sm font-medium"
              />
              <Textarea
                value={faq.answer}
                onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                placeholder="Your answer..."
                rows={2}
                className="text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFAQ(index)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      
      <Button
        variant="outline"
        onClick={addFAQ}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add FAQ
      </Button>
    </div>
  );
}
