import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Play, Sparkles } from "lucide-react";
import { TIERS } from "@/config/pricing";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24 lg:pt-20 lg:pb-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20 pointer-events-none" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' stroke='%23000' stroke-width='1'%3E%3Cpath d='M0 0h60v60H0z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            AI-Powered for Local Businesses
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
            Every call answered.
            <br />
            <span className="text-primary">Every lead captured.</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            CloseLoop's AI receptionist answers calls and texts 24/7, captures customer info, 
            and pushes everything into your booking, dispatch, or order system.
          </p>
          
          {/* Trust bullets */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10 text-sm md:text-base">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>No missed calls</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Real data, not voicemails</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Works while you sleep</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto gap-2 h-14 px-8 text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 h-14 px-8 text-lg">
                <Play className="h-5 w-5" />
                Hear a Real Call
              </Button>
            </a>
          </div>
          
          {/* Micro-copy */}
          <p className="text-sm text-muted-foreground mt-6">
            Setup in 10 minutes • 7-day free trial • Plans from ${TIERS[0].startingPrice}/mo
          </p>
        </div>
      </div>
    </section>
  );
}
