import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Play, Sparkles } from "lucide-react";
import { TIERS } from "@/config/pricing";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 lg:pt-24 lg:pb-36">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/15 pointer-events-none" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-8 animate-fade-in border border-primary/20">
            <Sparkles className="h-4 w-4" />
            AI-Powered for Local Businesses
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6 leading-[1.1]">
            Every call answered.
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Every lead captured.
            </span>
          </h1>
          
          {/* Subheadline - simplified */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            AI receptionist that answers calls 24/7, captures customer info, 
            and sends it straight to your booking or dispatch system.
          </p>
          
          {/* Trust bullets - scannable format */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-8 mb-12">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="font-medium">No missed calls</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="font-medium">Real data, not voicemails</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="font-medium">Works while you sleep</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button 
                size="lg" 
                className="w-full sm:w-auto gap-2 h-14 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.02] transition-all"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#demo">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto gap-2 h-14 px-8 text-base font-medium hover:bg-muted/50 transition-colors"
              >
                <Play className="h-5 w-5" />
                Hear a Real Call
              </Button>
            </a>
          </div>
          
          {/* Micro-copy */}
          <p className="text-sm text-muted-foreground mt-8">
            Setup in 10 min • 7-day free trial • Plans from ${TIERS[0].startingPrice}/mo
          </p>
        </div>
      </div>
    </section>
  );
}
