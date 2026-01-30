import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useKnowledgeMergeQueue } from "@/hooks/useKnowledgeMergeQueue";

export function KnowledgeUploadBanner() {
  const { pendingCount } = useKnowledgeMergeQueue();

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Alert variant="default" className="border-warning/50 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="font-semibold text-warning">Review Upload Changes</AlertTitle>
      <AlertDescription className="mt-1">
        <p className="text-sm mb-3">
          New uploads have {pendingCount} proposed {pendingCount === 1 ? "change" : "changes"} that differ from your current setup. 
          Review now to improve AI accuracy.
        </p>
        <Button variant="outline" size="sm" asChild className="bg-background hover:bg-background/80">
          <Link to="/app/business-brain?tab=uploads">Review Changes</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
