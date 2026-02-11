/**
 * Mode-Specific Custom Knowledge Suggestions
 * 
 * Provides industry-relevant knowledge templates based on business mode
 */

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTenantConfig, BusinessMode } from "@/hooks/useTenantConfig";

interface KnowledgeTemplate {
  label: string;
  title: string;
  category: "policy" | "upsell";
  placeholder: string;
}

const TEMPLATES_BY_MODE: Record<BusinessMode, KnowledgeTemplate[]> = {
  service: [
    { label: "Years of Experience", title: "Our Experience", category: "policy", placeholder: "We've been proudly serving our community since..." },
    { label: "Warranty / Guarantee", title: "Warranty Policy", category: "policy", placeholder: "All our work comes with a comprehensive warranty..." },
    { label: "Certifications", title: "Our Certifications", category: "policy", placeholder: "We are certified by... Our technicians hold..." },
    { label: "Why Choose Us", title: "What Makes Us Different", category: "upsell", placeholder: "What sets us apart is our attention to detail and..." },
    { label: "Special Offers", title: "Current Promotions", category: "upsell", placeholder: "Right now we're offering new customers..." },
    { label: "Equipment Quality", title: "Our Equipment", category: "policy", placeholder: "We use only professional-grade equipment and..." },
    { label: "Eco-Friendly Options", title: "Green Services", category: "upsell", placeholder: "We offer eco-friendly alternatives including..." },
    { label: "Emergency Services", title: "Emergency Availability", category: "policy", placeholder: "For emergencies, we offer same-day service..." },
  ],
  dispatch: [
    { label: "Fleet Overview", title: "Our Fleet", category: "policy", placeholder: "Our fleet includes flatbeds, wheel-lifts, and heavy-duty trucks capable of..." },
    { label: "Safety Protocols", title: "Safety First", category: "policy", placeholder: "Driver safety is our priority. We always confirm caller safety before..." },
    { label: "Insurance Coverage", title: "Insurance & Liability", category: "policy", placeholder: "We carry full cargo and liability insurance up to..." },
    { label: "24/7 Availability", title: "Always Available", category: "upsell", placeholder: "We're available 24 hours a day, 7 days a week, including holidays..." },
    { label: "Response Time", title: "Fast Response", category: "upsell", placeholder: "Our average response time is 30-45 minutes, often faster in..." },
    { label: "AAA/Motor Club", title: "Motor Club Partners", category: "policy", placeholder: "We work with AAA, Good Sam, and other motor clubs. We can bill them directly for..." },
    { label: "Special Equipment", title: "Specialized Services", category: "upsell", placeholder: "We have specialized equipment for motorcycles, classic cars, and..." },
    { label: "Impound Procedures", title: "Vehicle Release Process", category: "policy", placeholder: "To release a vehicle, you'll need valid ID, registration, proof of insurance, and..." },
  ],
  food: [
    { label: "Fresh Ingredients", title: "Our Ingredients", category: "upsell", placeholder: "We source our ingredients locally from... Everything is made fresh daily..." },
    { label: "Chef Background", title: "Meet Our Chef", category: "upsell", placeholder: "Our head chef trained at... and brings 15 years of experience..." },
    { label: "Dietary Options", title: "Dietary Accommodations", category: "policy", placeholder: "We happily accommodate vegetarian, vegan, gluten-free, and halal requests..." },
    { label: "Private Events", title: "Private Dining", category: "upsell", placeholder: "We have a private dining room that seats up to 30 guests, perfect for..." },
    { label: "Happy Hour", title: "Happy Hour Specials", category: "upsell", placeholder: "Join us for happy hour Monday-Friday from 4-6 PM for discounted drinks and..." },
    { label: "Gift Cards", title: "Gift Cards Available", category: "upsell", placeholder: "Gift cards are available in any amount and never expire. Perfect for..." },
    { label: "Allergen Process", title: "Allergy Safety", category: "policy", placeholder: "We take allergies seriously. All allergen orders are prepared separately with..." },
    { label: "Sustainability", title: "Our Commitment to Sustainability", category: "policy", placeholder: "We use compostable packaging, source sustainably, and..." },
  ],
  medical: [
    { label: "Provider Credentials", title: "Our Providers", category: "policy", placeholder: "Dr. [Name] is board-certified in... with over... years of experience..." },
    { label: "HIPAA Compliance", title: "Your Privacy", category: "policy", placeholder: "Your health information is protected under HIPAA. We never share..." },
    { label: "Insurance Accepted", title: "Insurance We Accept", category: "policy", placeholder: "We accept most major insurance plans including... For plans not listed..." },
    { label: "Telehealth Options", title: "Virtual Visits", category: "upsell", placeholder: "We offer telehealth appointments for many visit types. These are convenient for..." },
    { label: "New Patient Process", title: "New Patient Welcome", category: "policy", placeholder: "New patients should arrive 15 minutes early with ID, insurance card, and..." },
    { label: "Emergency Protocol", title: "Medical Emergencies", category: "policy", placeholder: "For medical emergencies, call 911. For urgent but non-life-threatening issues..." },
    { label: "Payment Plans", title: "Financial Options", category: "policy", placeholder: "We offer payment plans and work with patients on financial concerns. Self-pay rates are..." },
    { label: "Specialties", title: "Our Specialties", category: "upsell", placeholder: "Our practice specializes in... We have particular expertise in..." },
  ],
  general: [
    { label: "Company History", title: "About Us", category: "policy", placeholder: "We've been in business since... serving the community with..." },
    { label: "Mission Statement", title: "Our Mission", category: "policy", placeholder: "Our mission is to provide excellent service by..." },
    { label: "Why Choose Us", title: "What Makes Us Different", category: "upsell", placeholder: "What sets us apart from others is our commitment to..." },
    { label: "Current Promotions", title: "Special Offers", category: "upsell", placeholder: "Right now we're offering..." },
    { label: "Service Guarantee", title: "Our Guarantee", category: "policy", placeholder: "We stand behind our work with a satisfaction guarantee that includes..." },
    { label: "Response Times", title: "When to Expect a Response", category: "policy", placeholder: "We typically respond within 24 hours during business days..." },
    { label: "Referral Program", title: "Referral Rewards", category: "upsell", placeholder: "When you refer a friend, you both receive..." },
    { label: "Community Involvement", title: "Community Support", category: "policy", placeholder: "We're proud to support our local community through..." },
  ],
};

interface ModeKnowledgeSuggestionsProps {
  onSelect: (template: { title: string; category: "policy" | "upsell"; placeholder: string }) => void;
  existingTitles?: string[];
}

export function ModeKnowledgeSuggestions({ onSelect, existingTitles = [] }: ModeKnowledgeSuggestionsProps) {
  const { businessMode } = useTenantConfig();
  const templates = TEMPLATES_BY_MODE[businessMode] || TEMPLATES_BY_MODE.general;
  
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
