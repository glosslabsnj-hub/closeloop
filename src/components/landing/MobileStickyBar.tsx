import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function MobileStickyBar() {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t p-3 safe-area-pb">
      <div className="flex gap-2 max-w-md mx-auto">
        <a href="#demo" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Play className="h-4 w-4" />
            Hear a Call
          </Button>
        </a>
        <Link to="/signup" className="flex-1">
          <Button className="w-full gap-2">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
