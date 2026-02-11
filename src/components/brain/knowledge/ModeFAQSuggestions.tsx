/**
 * Mode-Specific FAQ Suggestions
 * 
 * Provides industry-relevant FAQ suggestions based on business mode
 */

import { Plus, Lightbulb } from "lucide-react";
import { useTenantConfig, BusinessMode } from "@/hooks/useTenantConfig";

interface SuggestedFAQ {
  question: string;
  answer: string;
}

const FAQ_BY_MODE: Record<BusinessMode, SuggestedFAQ[]> = {
  service: [
    { question: "What are your hours?", answer: "We're open Monday through Friday from 9 AM to 5 PM, and Saturday from 10 AM to 2 PM." },
    { question: "Do you offer free estimates?", answer: "Yes, we provide free estimates for most services. We can schedule a time that works for you." },
    { question: "Are you licensed and insured?", answer: "Yes, we are fully licensed and insured. We'd be happy to provide our credentials upon request." },
    { question: "How far in advance should I book?", answer: "We recommend booking at least a week in advance, though we can often accommodate same-day appointments." },
    { question: "Do you offer a warranty?", answer: "Yes, all our work comes with a satisfaction guarantee. We stand behind our services." },
    { question: "What forms of payment do you accept?", answer: "We accept cash, all major credit cards, and digital payments like Apple Pay and Venmo." },
    { question: "Do you charge for travel time?", answer: "Travel within our service area is typically included in our service price." },
    { question: "Can I get a price over the phone?", answer: "I can give you a general price range, but final pricing depends on the specific details of your situation." },
  ],
  dispatch: [
    { question: "How long until you arrive?", answer: "Our typical response time is 30-45 minutes depending on your location and current demand." },
    { question: "What areas do you cover?", answer: "We serve the greater metro area and surrounding counties within a 50-mile radius." },
    { question: "Do you tow motorcycles?", answer: "Yes, we have specialized equipment for safely towing motorcycles and other two-wheeled vehicles." },
    { question: "Can you unlock my car?", answer: "Yes, our technicians are trained in vehicle lockout services for most makes and models." },
    { question: "What if my car is in an accident?", answer: "We coordinate with police and insurance. If you're in danger, call 911 first, then call us for towing." },
    { question: "How much is a tow?", answer: "Pricing depends on distance and vehicle type. I can give you an exact quote once I know your pickup and destination." },
    { question: "Do you take roadside assistance programs?", answer: "Yes, we work with most major motor clubs and roadside assistance programs." },
    { question: "Can you jump start my car?", answer: "Yes, we offer jump start services. If the battery won't hold a charge, we can tow you to a shop." },
    { question: "What do I need to release my vehicle from impound?", answer: "You'll need a valid ID, vehicle registration, and proof of insurance. Payment is due at time of release." },
    { question: "Do you offer after-hours service?", answer: "Yes, we're available 24/7 for emergencies. After-hours rates may apply." },
  ],
  food: [
    { question: "Do you deliver?", answer: "Yes, we offer delivery within a 5-mile radius. Delivery fees vary by distance." },
    { question: "What are your hours?", answer: "We're open for lunch from 11 AM to 2 PM and dinner from 5 PM to 10 PM daily." },
    { question: "Can you accommodate allergies?", answer: "Absolutely. Please let us know about any allergies and we'll ensure your meal is prepared safely." },
    { question: "Do you have vegetarian options?", answer: "Yes, we have several vegetarian and vegan options on our menu. Just ask and I can walk you through them." },
    { question: "Do you take reservations?", answer: "Yes, we accept reservations for parties of any size. For groups over 6, we recommend booking at least a day ahead." },
    { question: "Do you offer catering?", answer: "Yes! We cater events of all sizes. I can transfer you to our catering specialist or take your details." },
    { question: "What's your most popular dish?", answer: "Our [signature dish] is definitely a customer favorite! Would you like me to describe it?" },
    { question: "Is there parking available?", answer: "Yes, we have a parking lot behind the restaurant and street parking is also available." },
    { question: "Do you have a kids menu?", answer: "Yes, we have a children's menu with kid-friendly portions and prices." },
    { question: "Can I order online?", answer: "Yes, you can order through our website or by calling us directly." },
  ],
  medical: [
    { question: "Are you accepting new patients?", answer: "Yes, we're currently accepting new patients. I can help you schedule your first appointment." },
    { question: "Do you take my insurance?", answer: "We accept most major insurance plans. Let me verify your specific plan coverage." },
    { question: "How long is the wait for an appointment?", answer: "For routine visits, we typically have availability within 1-2 weeks. Urgent concerns can often be seen sooner." },
    { question: "Do you offer telehealth?", answer: "Yes, we offer telehealth appointments for many types of visits. I can help you determine if that's appropriate." },
    { question: "What should I bring to my first appointment?", answer: "Please bring your ID, insurance card, a list of current medications, and any relevant medical records." },
    { question: "What are your office hours?", answer: "We're open Monday through Friday from 8 AM to 5 PM. We have extended hours on Tuesdays until 7 PM." },
    { question: "How do I get a prescription refill?", answer: "You can request refills through our patient portal, or call during office hours and we'll process it within 24-48 hours." },
    { question: "Do you offer payment plans?", answer: "Yes, we offer payment plans for patients without insurance or for services not covered by insurance." },
    { question: "Can I speak to a nurse?", answer: "I can have a nurse call you back, or if this is an emergency, please call 911 or go to the nearest emergency room." },
    { question: "How do I access my test results?", answer: "Results are available through our patient portal, or your provider will call you to discuss significant findings." },
  ],
  general: [
    { question: "What are your hours?", answer: "We're available Monday through Friday from 9 AM to 5 PM. For urgent matters, leave a message and we'll get back to you." },
    { question: "Where are you located?", answer: "We're located at [address]. I can give you directions if needed." },
    { question: "How can I reach someone?", answer: "I can take a message and have the right person call you back, or I can transfer you directly." },
    { question: "What services do you offer?", answer: "We offer a variety of services. What specifically can I help you with today?" },
    { question: "How do I schedule an appointment?", answer: "I can schedule an appointment for you right now. What day and time works best?" },
    { question: "Do you offer virtual consultations?", answer: "Yes, we can arrange a phone or video consultation. Would you prefer that?" },
    { question: "What are your payment options?", answer: "We accept all major credit cards, cash, and checks. We also offer payment plans for larger services." },
    { question: "How quickly can you get back to me?", answer: "We typically respond within 24 hours during business days, often much sooner." },
  ],
};

interface ModeFAQSuggestionsProps {
  onAdd: (question: string, answer: string) => void;
  existingQuestions?: string[];
}

export function ModeFAQSuggestions({ onAdd, existingQuestions = [] }: ModeFAQSuggestionsProps) {
  const { businessMode } = useTenantConfig();
  const suggestions = FAQ_BY_MODE[businessMode] || FAQ_BY_MODE.general;
  
  // Filter out already-added FAQs
  const availableFAQs = suggestions.filter(
    faq => !existingQuestions.some(q => 
      q.toLowerCase().includes(faq.question.toLowerCase().slice(0, 20))
    )
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
