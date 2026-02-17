import { HeroSection } from "@/components/landing/HeroSection";
import { TrustSignalsBar } from "@/components/landing/TrustSignalsBar";
import { IndustryDemoPlayer } from "@/components/landing/IndustryDemoPlayer";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { MobileStickyBar } from "@/components/landing/MobileStickyBar";
import { SalesAIAgent } from "@/components/landing/SalesAIAgent";

export default function LandingPage() {
  return (
    <div className="pb-24 md:pb-0">
      <SalesAIAgent />
      <MobileStickyBar />
      <HeroSection />
      <TrustSignalsBar />
      <section id="demo">
        <IndustryDemoPlayer />
      </section>
      <HowItWorksSection />
      <PricingSection />
      <FinalCTASection />
    </div>
  );
}
