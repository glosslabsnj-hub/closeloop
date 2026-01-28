import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How long does setup take?",
    answer: "About 10 minutes. Our guided onboarding walks you through adding your services, hours, and preferences. You can be live the same day.",
  },
  {
    question: "Will this work for my industry?",
    answer: "CloseLoop works for any business that takes inbound calls: service businesses, dispatch/towing, restaurants, medical offices, and more. The AI adapts to your specific workflow.",
  },
  {
    question: "Can I keep my existing phone number?",
    answer: "Yes! You can forward your existing business number to CloseLoop, or we can provide you with a dedicated number. Your customers won't notice any change.",
  },
  {
    question: "Can it handle Spanish or other languages?",
    answer: "Currently CloseLoop supports English. Spanish and other languages are on our roadmap. Contact us if you have specific language needs.",
  },
  {
    question: "What happens if multiple calls come in at once?",
    answer: "CloseLoop can handle unlimited simultaneous calls. Every caller gets answered immediately — no busy signals, no hold music.",
  },
  {
    question: "Can I keep using my existing CRM or scheduler?",
    answer: "Absolutely. CloseLoop can push captured data to your existing tools via webhooks, email, or SMS. Or use CloseLoop's built-in system — your choice.",
  },
];

export function FAQSection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Common questions
          </h2>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
