import { Button } from "@/components/ui/button";
import { Plus, Lightbulb } from "lucide-react";

interface SuggestedFAQ {
  question: string;
  answer: string;
}

interface SuggestedFAQButtonsProps {
  onAdd: (question: string, answer: string) => void;
  existingQuestions?: string[];
}

const SUGGESTED_FAQS: SuggestedFAQ[] = [
  {
    question: "What are your hours?",
    answer: "We're open Monday through Friday from 9 AM to 5 PM, and Saturday from 10 AM to 2 PM. We're closed on Sundays."
  },
  {
    question: "Where are you located?",
    answer: "We're located at [your address]. You can find us easily by [landmark or directions]."
  },
  {
    question: "Do you take insurance?",
    answer: "Yes, we accept most major insurance providers. Please call us with your specific plan and we can verify coverage."
  },
  {
    question: "How much does it cost?",
    answer: "Our pricing depends on the specific service you need. We'd be happy to provide a quote once we understand your requirements."
  },
  {
    question: "Do you offer free estimates?",
    answer: "Yes, we offer free estimates for most services. We can schedule a time that works for you."
  },
  {
    question: "How long does it take?",
    answer: "The time varies depending on the specific service. We'll give you an accurate estimate when we assess your needs."
  },
  {
    question: "Do you offer payment plans?",
    answer: "Yes, we offer flexible payment options. We can discuss what works best for your situation."
  },
  {
    question: "Are you licensed and insured?",
    answer: "Yes, we are fully licensed and insured. We'd be happy to provide our credentials upon request."
  },
];

export function SuggestedFAQButtons({ onAdd, existingQuestions = [] }: SuggestedFAQButtonsProps) {
  // Filter out already-added FAQs
  const availableFAQs = SUGGESTED_FAQS.filter(
    faq => !existingQuestions.some(q => q.toLowerCase().includes(faq.question.toLowerCase().slice(0, 20)))
  );

  if (availableFAQs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="h-3 w-3 shrink-0" />
        <span className="truncate">Quick add:</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
        {availableFAQs.slice(0, 4).map((faq) => (
          <button
            key={faq.question}
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-border bg-background hover:bg-muted/50 transition-colors whitespace-nowrap shrink-0"
            onClick={() => onAdd(faq.question, faq.answer)}
          >
            <Plus className="h-3 w-3" />
            {faq.question}
          </button>
        ))}
      </div>
    </div>
  );
}
