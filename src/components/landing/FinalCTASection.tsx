import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="py-16 md:py-24 bg-primary text-primary-foreground">
      <div className="container text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Stop missing customers
        </h2>
        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
          Every unanswered call is lost revenue. Start capturing every lead today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link to="/signup">
            <Button 
              size="lg" 
              variant="secondary" 
              className="w-full sm:w-auto gap-2 h-14 px-8 text-lg"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm opacity-90">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            7-day free trial
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            No charge until trial ends
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Cancel anytime
          </div>
        </div>
      </div>
    </section>
  );
}
