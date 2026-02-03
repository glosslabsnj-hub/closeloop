import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface KnowledgeTemplate {
  label: string;
  title: string;
  category: "policy" | "upsell";
  placeholder: string;
}

const templates: KnowledgeTemplate[] = [
  {
    label: "Years of Experience",
    title: "Our Experience",
    category: "policy",
    placeholder: "We've been serving our community since..."
  },
  {
    label: "Warranty / Guarantee",
    title: "Warranty Policy",
    category: "policy",
    placeholder: "All our work comes with a..."
  },
  {
    label: "Certifications",
    title: "Our Certifications",
    category: "policy",
    placeholder: "We are certified by..."
  },
  {
    label: "Why Choose Us",
    title: "What Makes Us Different",
    category: "upsell",
    placeholder: "What sets us apart is..."
  },
  {
    label: "Special Offers",
    title: "Current Promotions",
    category: "upsell",
    placeholder: "Right now we're offering..."
  },
  {
    label: "Service Area",
    title: "Where We Serve",
    category: "policy",
    placeholder: "We proudly serve..."
  },
  {
    label: "Payment Terms",
    title: "Payment Information",
    category: "policy",
    placeholder: "We accept... Payment is due..."
  },
  {
    label: "Disclaimers",
    title: "Important Disclaimers",
    category: "policy",
    placeholder: "Please note that..."
  },
];

interface SuggestedKnowledgeButtonsProps {
  onSelect: (template: { title: string; category: "policy" | "upsell"; placeholder: string }) => void;
  existingTitles?: string[];
}

export function SuggestedKnowledgeButtons({ onSelect, existingTitles = [] }: SuggestedKnowledgeButtonsProps) {
  // Filter out templates that already exist
  const availableTemplates = templates.filter(
    (t) => !existingTitles.some((title) => title.toLowerCase() === t.title.toLowerCase())
  );

  if (availableTemplates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Quick add ideas:</p>
      <div className="flex flex-wrap gap-2">
        {availableTemplates.map((template) => (
          <Button
            key={template.label}
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => onSelect({
              title: template.title,
              category: template.category,
              placeholder: template.placeholder,
            })}
          >
            <Plus className="h-3 w-3" />
            {template.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
