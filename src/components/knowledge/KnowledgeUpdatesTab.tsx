import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useKnowledgeUploads } from "@/hooks/useKnowledgeUploads";
import { useKnowledgeSuggestions } from "@/hooks/useKnowledgeSuggestions";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { ProcessingUploadsCard } from "./ProcessingUploadsCard";
import { SuggestionReviewList } from "./SuggestionReviewList";
import { KnowledgeConflictResolver } from "./KnowledgeConflictResolver";
import { useSearchParams } from "react-router-dom";

export function KnowledgeUpdatesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subtab = searchParams.get("subtab") || "processing";
  
  const { processingCount, uploads } = useKnowledgeUploads();
  const { pendingCount } = useKnowledgeSuggestions();
  const { unresolvedCount, unresolvedConflicts } = useKnowledgeConflicts();

  const setSubtab = (value: string) => {
    searchParams.set("subtab", value);
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      {/* Explanation Block */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How this works:</strong> Uploads do not automatically change what the AI says.
          Your Business Brain is the source of truth. If we detect differences, you review and
          choose what's correct.
        </AlertDescription>
      </Alert>

      {/* All Resolved Success Message */}
      {unresolvedCount === 0 && pendingCount === 0 && processingCount === 0 && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <AlertDescription className="text-green-700 dark:text-green-400">
            <strong>Great!</strong> Your AI knowledge is up to date and consistent. No pending
            reviews or conflicts.
          </AlertDescription>
        </Alert>
      )}

      {/* Sub-tabs */}
      <Tabs value={subtab} onValueChange={setSubtab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="processing" className="relative">
            Processing
            {processingCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {processingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="relative">
            Suggestions
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="relative">
            Conflicts
            {unresolvedCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {unresolvedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processing" className="mt-4">
          <ProcessingUploadsCard />
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          <SuggestionReviewList />
        </TabsContent>

        <TabsContent value="conflicts" className="mt-4">
          <KnowledgeConflictResolver />
        </TabsContent>
      </Tabs>
    </div>
  );
}
