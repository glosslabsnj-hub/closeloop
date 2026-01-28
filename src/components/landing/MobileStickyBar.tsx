import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight } from "lucide-react";

export function MobileStickyBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
      <div className="flex gap-3 p-4 max-w-md mx-auto safe-area-pb">
        <Link to="/signup" className="flex-1">
          <Button size="lg" className="w-full h-12 gap-2 font-semibold shadow-md">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <a href="#demo">
          <Button size="lg" variant="outline" className="h-12 px-5">
            <Play className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </div>
  );
}
