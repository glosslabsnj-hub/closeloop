/**
 * Mode-Specific Objection Handling Suggestions
 * 
 * Provides industry-relevant objection handling scripts based on business mode
 */

import { Plus, Lightbulb } from "lucide-react";
import { useTenantConfig, BusinessMode } from "@/hooks/useTenantConfig";

interface ObjectionSuggestion {
  objection: string;
  response: string;
}

const OBJECTIONS_BY_MODE: Record<BusinessMode, ObjectionSuggestion[]> = {
  service: [
    { objection: "That's too expensive", response: "I understand budget is important. Our pricing reflects our quality work and includes a warranty. We also offer payment plans if that helps." },
    { objection: "I need to think about it", response: "Absolutely, take your time. Would it help if I sent you some information by text? That way you have everything you need to decide." },
    { objection: "I'm getting other quotes", response: "That's smart to compare. What I can tell you is we're fully licensed, insured, and our work is guaranteed. Let me know if you have any questions after comparing." },
    { objection: "Can you do it cheaper?", response: "Our prices are competitive for the quality we provide. What I can do is see if there are any current promotions that might apply to your service." },
    { objection: "I don't have time right now", response: "No problem! When would be a better time to discuss this? I can also send you our information by text for when you're ready." },
    { objection: "I had a bad experience before", response: "I'm sorry to hear that. We take customer satisfaction very seriously, and all our work comes with a guarantee. What would make you feel more comfortable?" },
    { objection: "My spouse/partner needs to agree", response: "Completely understand! Would you like me to schedule a time when you can both be available? Or I can send details for you to share with them." },
    { objection: "I found someone cheaper online", response: "I'd encourage you to verify they're licensed and insured. Sometimes lower prices mean cut corners. Our reviews speak to the quality we deliver." },
  ],
  dispatch: [
    { objection: "That price is too high", response: "I understand. Our pricing is based on distance, vehicle type, and current demand. It includes all labor and equipment - no hidden fees." },
    { objection: "How do I know you won't damage my car?", response: "We're fully insured and our drivers are certified professionals. We use the appropriate equipment for your specific vehicle to ensure safe transport." },
    { objection: "Can you come faster?", response: "I understand this is stressful. We're dispatching the closest available truck. Stay safe and we'll update you on the ETA as we get closer." },
    { objection: "My AAA/roadside will cover this", response: "We do work with motor clubs! Let me get your membership info and I'll coordinate with them for reimbursement if applicable." },
    { objection: "I'll just wait for a friend to help", response: "That's your choice, but keep in mind if you're on a highway or in an unsafe location, we can help you get somewhere safe quickly." },
    { objection: "Another company quoted less", response: "Make sure to ask about hookup fees, mileage charges, and after-hours rates. Our quote is all-inclusive with no surprise fees." },
    { objection: "Why does impound cost so much?", response: "Storage fees are set by county regulations. I can explain exactly what fees apply to your situation and when they started." },
    { objection: "I don't have the money right now", response: "We accept all major credit cards. For impound releases, we do require payment at time of release, but I can explain exactly what you need to bring." },
  ],
  food: [
    { objection: "The wait is too long", response: "I apologize for the wait. Would you like to place an order for pickup or delivery? I can also add you to our reservation waitlist for a callback." },
    { objection: "That's expensive for just food", response: "I understand. Our dishes are made with fresh, quality ingredients and generous portions. Would you like to hear about our daily specials?" },
    { objection: "I don't see anything I like", response: "I'd be happy to help! Tell me what flavors you enjoy, and I can suggest something that might work for you. Our chef can also accommodate special requests." },
    { objection: "Do you have anything healthier?", response: "Absolutely! We have several lighter options and can modify many dishes - grilled instead of fried, dressing on the side, etc. What are you looking for?" },
    { objection: "Last time my order was wrong", response: "I'm so sorry about that. I'll make sure to get everything exactly right this time and add a note for the kitchen to double-check your order." },
    { objection: "Delivery is too expensive", response: "I understand. If you're close by, pickup is always free! We also offer deals if you order directly through us instead of delivery apps." },
    { objection: "I'm not sure you can handle my allergy", response: "Food safety is our top priority. Tell me exactly what you're allergic to, and I'll note it prominently. Our kitchen takes separate precautions for allergen orders." },
    { objection: "I need it faster than that", response: "I understand you're in a hurry. Let me see what we can do - some items are quicker to prepare. Would you be open to a suggestion?" },
  ],
  medical: [
    { objection: "The wait for appointments is too long", response: "I understand that's frustrating. Would a telehealth visit work for your needs? Those often have more availability. Or I can put you on our cancellation list for earlier openings." },
    { objection: "I don't have insurance", response: "We offer self-pay options and can work out payment plans. The cost for a standard visit without insurance is [amount]. We're committed to making care accessible." },
    { objection: "I'm worried about the cost", response: "I completely understand. Let me verify what your insurance covers. We also have payment plans and can discuss options before your visit." },
    { objection: "I don't think I need to come in", response: "I understand. Some things can be handled over the phone, but for your safety, certain symptoms really do need an in-person evaluation. Would telehealth be a good middle ground?" },
    { objection: "I've been waiting on hold too long", response: "I apologize for the wait. I'm here now and want to help you completely. What can I assist you with today?" },
    { objection: "My previous provider was better", response: "I'm sorry your experience hasn't met expectations. I'd like to understand what we can do better and address your concerns directly." },
    { objection: "I don't trust doctors", response: "I hear you, and that's a valid concern. Our providers believe in working with you as a partner in your health decisions. Would you like to share what's been worrying you?" },
    { objection: "Why do I need all these tests?", response: "I understand that can feel overwhelming. The doctor recommends tests to make sure we have a complete picture of your health. I can have the doctor explain which ones are most important." },
  ],
  general: [
    { objection: "I don't have time right now", response: "No problem at all! When would be a better time to reach you? I can also send information by email or text for your convenience." },
    { objection: "I'm not interested", response: "I understand. Is there anything else I can help you with today, or would you like me to remove you from our contact list?" },
    { objection: "Just send me information", response: "I'd be happy to! What's the best email or should I text it to this number? I'll include everything you need." },
    { objection: "I need to talk to someone else", response: "Of course! I can transfer you now, or if they're not available, I can have them call you back. What's the best number?" },
    { objection: "How do I know this is legitimate?", response: "Great question! You can verify us by [website, license number, etc.]. Would you like me to provide that information?" },
    { objection: "I've had problems with companies like yours", response: "I'm sorry to hear that. I'd like to understand what happened so we can make sure that doesn't repeat. What would make you feel more comfortable?" },
    { objection: "Let me call you back", response: "Sure! I'm available [hours]. Or I can call you back at a specific time - what works best?" },
    { objection: "Your competitor offered better", response: "I appreciate you sharing that. Let me see what we can offer you. What specifically did they propose?" },
  ],
};

interface ModeObjectionSuggestionsProps {
  onAdd: (objection: string, response: string) => void;
  existingObjections?: string[];
}

export function ModeObjectionSuggestions({ onAdd, existingObjections = [] }: ModeObjectionSuggestionsProps) {
  const { businessMode } = useTenantConfig();
  const suggestions = OBJECTIONS_BY_MODE[businessMode] || OBJECTIONS_BY_MODE.general;
  
  // Filter out already-added objections
  const availableObjections = suggestions.filter(
    obj => !existingObjections.some(o => 
      o.toLowerCase().includes(obj.objection.toLowerCase().slice(0, 15))
    )
  );

  if (availableObjections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="h-3 w-3 shrink-0" />
        <span className="truncate">Common objections:</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
        {availableObjections.slice(0, 4).map((obj) => (
          <button
            key={obj.objection}
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-border bg-background hover:bg-muted/50 transition-colors whitespace-nowrap shrink-0"
            onClick={() => onAdd(obj.objection, obj.response)}
          >
            <Plus className="h-3 w-3" />
            {obj.objection}
          </button>
        ))}
      </div>
    </div>
  );
}
