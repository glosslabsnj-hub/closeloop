import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Play, AudioWaveform } from "lucide-react";
import { TIERS } from "@/config/pricing";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 lg:pt-28 lg:pb-40">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5 pointer-events-none" />

      {/* Subtle mesh pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,hsl(172_75%_40%/0.06),transparent_50%),radial-gradient(circle_at_75%_75%,hsl(28_90%_55%/0.04),transparent_50%)] pointer-events-none" />
      
      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-10 animate-fade-in border border-primary/20">
            <AudioWaveform className="h-4 w-4" />
            AI-Powered for Local Businesses
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-8 leading-[1.08]">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Every call answered.</span>
            <br />
            <span className="bg-gradient-to-r from-primary to-accent-signature bg-clip-text text-transparent">
              Every lead captured.
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            AI receptionist that answers calls 24/7, captures customer info, 
            and sends it straight to your booking or dispatch system.
          </p>
          
          {/* Trust bullets */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 mb-12">
            {["No missed calls", "Real data, not voicemails", "Works while you sleep"].map((text) => (
              <div key={text} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 border border-border/50">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-sm">{text}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2 h-14 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] transition-all"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#demo">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto gap-2 h-14 px-8 text-base font-medium hover:bg-muted/50 transition-all"
              >
                <Play className="h-4 w-4 fill-current" />
                Hear a Real Call
              </Button>
            </a>
          </div>
          
          {/* Micro-copy */}
          <p className="text-sm text-muted-foreground mt-10">
            Setup in 10 min • Plans from ${TIERS[0].startingPrice}/mo
          </p>
        </div>
      </div>
    </section>
  );
}
