import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { WhoItsForSection } from "@/components/landing/WhoItsForSection";
import { IndustryDemoPlayer } from "@/components/landing/IndustryDemoPlayer";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { MobileStickyBar } from "@/components/landing/MobileStickyBar";
import { SalesAIAgent } from "@/components/landing/SalesAIAgent";

export default function LandingPage() {
  return (
    <div className="pb-20 md:pb-0">
      {/* Sales AI Agent */}
      <SalesAIAgent />
      
      {/* Mobile Sticky Bar */}
      <MobileStickyBar />

      {/* Hero */}
      <HeroSection />

      {/* Industry Demo Section */}
      <section id="demo">
        <IndustryDemoPlayer />
      </section>

      {/* How It Works - 3 Steps */}
      <HowItWorksSection />

      {/* Who It's For */}
      <WhoItsForSection />

      {/* Integrations */}
      <IntegrationsSection />

      {/* Testimonials & Trust */}
      <TestimonialsSection />

      {/* FAQ */}
      <FAQSection />

      {/* Final CTA */}
      <FinalCTASection />
    </div>
  );
}
