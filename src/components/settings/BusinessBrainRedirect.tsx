import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, ExternalLink } from "lucide-react";

interface BusinessBrainRedirectProps {
  section: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

/**
 * Component to display a read-only preview with a link to edit in Business Brain.
 * Used in Settings page for sections that should be managed in the Business Brain.
 */
export function BusinessBrainRedirect({ section, title, description, children }: BusinessBrainRedirectProps) {
  const brainUrl = `/app/business-brain#${section}`;

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
        <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to={brainUrl}>
            Edit in Business Brain
            <ExternalLink className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </div>

      {/* Preview Content (read-only) */}
      {children && (
        <div className="opacity-75 pointer-events-none select-none">
          {children}
        </div>
      )}
    </div>
  );
}
