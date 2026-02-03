import { Brain, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function BusinessBrainCTA() {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm mb-1">
            Looking to update what your AI knows?
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Services, hours, pricing, and policies are managed in Business Brain.
          </p>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/app/business-brain">
              Go to Business Brain
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
