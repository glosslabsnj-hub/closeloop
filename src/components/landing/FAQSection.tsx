import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How long does setup take?",
    answer: "About 10 minutes. Guided onboarding walks you through services, hours, and preferences. Go live the same day.",
  },
  {
    question: "Will this work for my industry?",
    answer: "Yes — CloseLoop works for any inbound-call business: service, dispatch, restaurants, medical, and more. The AI adapts to your workflow.",
  },
  {
    question: "Can I keep my existing phone number?",
    answer: "Absolutely. Forward your existing number to CloseLoop, or use a dedicated number we provide. Customers won't notice any change.",
  },
  {
    question: "Can it handle Spanish?",
    answer: "Currently English only. Spanish and other languages are on the roadmap. Contact us for specific language needs.",
  },
  {
    question: "What if multiple calls come in at once?",
    answer: "No problem — CloseLoop handles unlimited simultaneous calls. Every caller gets answered immediately, no hold music.",
  },
  {
    question: "Can I use my existing CRM?",
    answer: "Yes. Push captured data to your existing tools via webhooks, email, or SMS. Or use CloseLoop's built-in system — your choice.",
  },
];

export function FAQSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="container">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            FAQ
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">
            Common questions
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/30 rounded-xl px-6 bg-card/40 backdrop-blur-sm data-[state=open]:bg-card/60 data-[state=open]:border-primary/20 transition-all"
              >
                <AccordionTrigger className="text-left font-semibold py-5 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground/80 pb-5 leading-relaxed">
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
