import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="py-24 md:py-32 bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container text-center relative">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
          Stop missing customers
        </h2>
        <p className="text-lg md:text-xl opacity-90 mb-12 max-w-2xl mx-auto leading-relaxed">
          Every unanswered call is lost revenue. Start capturing every lead today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link to="/signup">
            <Button 
              size="lg" 
              variant="secondary" 
              className="w-full sm:w-auto gap-2 h-14 px-10 text-base font-semibold shadow-xl hover:scale-[1.02] transition-all"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm opacity-90">
          {["7-day free trial", "No charge until trial ends", "Cancel anytime"].map((text) => (
            <div key={text} className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
