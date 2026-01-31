// Banner shown when uploaded services conflict with structured entries
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ServiceConflictBannerProps {
  conflictCount: number;
  onReviewClick?: () => void;
}

export function ServiceConflictBanner({ conflictCount, onReviewClick }: ServiceConflictBannerProps) {
  if (conflictCount === 0) return null;

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-semibold">Review needed</AlertTitle>
      <AlertDescription className="mt-1">
        <p className="text-sm mb-2">
          We found {conflictCount} {conflictCount === 1 ? "difference" : "differences"} between 
          your uploaded sheet and the services you entered. Your entered services will be used 
          until you review and approve any changes.
        </p>
        {onReviewClick && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReviewClick}
            className="bg-background hover:bg-background/80"
          >
            Review Differences
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
