import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, DollarSign, LayoutDashboard } from "lucide-react";
import { BRAND } from "@/config/brand";

export function AgencyHeroSection() {
  const scrollToForm = () => {
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-t from-blue-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Zap className="h-4 w-4" />
            Agency Partner Program
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            Grow Your Agency with{" "}
            <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
              AI Voice
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            Resell {BRAND.name}'s AI receptionist to your clients. Earn 20% recurring commissions on every subscription.
          </p>

          {/* Trust pills */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                <Zap className="h-4 w-4 text-green-500" />
              </div>
              Free to join
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              20% recurring commissions
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                <LayoutDashboard className="h-4 w-4 text-blue-500" />
              </div>
              Full agency dashboard
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 pt-4">
            <Button size="lg" className="text-base px-8 shadow-lg" onClick={scrollToForm}>
              Apply Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground">
              No cost to join. Get approved in 24 hours.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
