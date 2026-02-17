import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Is there a cost to join?",
    a: "No. The agency partner program is completely free to join. There are no minimums, no upfront costs, and no monthly fees for your agency account.",
  },
  {
    q: "How do commissions work?",
    a: "You earn 20% recurring commission on every active client subscription you bring to the platform. As long as the client stays subscribed, you keep earning.",
  },
  {
    q: "When do I get paid?",
    a: "Commissions are paid out monthly. You can track your earnings in real-time through your agency dashboard.",
  },
  {
    q: "Can I white-label Voxly?",
    a: "White-label options are coming soon. Contact us if you're interested in early access to our white-label program.",
  },
  {
    q: "What support do I get?",
    a: "Every agency partner gets a dedicated partner manager, priority support, and access to our partner Slack channel for real-time help.",
  },
  {
    q: "How do I set up clients?",
    a: "Use the Quick Provision Wizard in your agency dashboard. Pick an industry, configure the AI, and your client can be live in under 10 minutes.",
  },
];

export function AgencyFAQ() {
  return (
    <section className="py-20 md:py-28 bg-card/30">
      <div className="container mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to know about the partner program.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border bg-card px-6"
              >
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
