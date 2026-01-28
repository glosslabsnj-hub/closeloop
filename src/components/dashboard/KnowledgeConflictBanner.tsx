import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";

export function KnowledgeConflictBanner() {
  const { unresolvedCount } = useKnowledgeConflicts();

  if (unresolvedCount === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-semibold">Action needed: Review conflicts</AlertTitle>
      <AlertDescription className="mt-1">
        <p className="text-sm mb-3">
          We found {unresolvedCount} {unresolvedCount === 1 ? "conflict" : "conflicts"} between your
          uploads and your current Business Brain. The AI will keep using your existing settings
          until you review.
        </p>
        <Button variant="outline" size="sm" asChild className="bg-background hover:bg-background/80">
          <Link to="/app/business-brain?tab=updates&subtab=conflicts">Resolve Conflicts</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
