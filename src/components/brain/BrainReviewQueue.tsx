import { useState } from "react";
import { useKnowledgeSuggestions, ExtractedKnowledgeSuggestion, SuggestionType } from "@/hooks/useKnowledgeSuggestions";
import { useKnowledgeConflicts, KnowledgeConflict, conflictTypeLabels, entityTypeLabels } from "@/hooks/useKnowledgeConflicts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Pencil,
  DollarSign,
  Clock,
  FileText,
  Briefcase,
  UtensilsCrossed,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

const suggestionTypeIcons: Record<SuggestionType, React.ElementType> = {
  service: Briefcase,
  faq: HelpCircle,
  menu_item: UtensilsCrossed,
  policy: ShieldCheck,
  objection: FileText,
};

const suggestionTypeLabels: Record<SuggestionType, string> = {
  service: "Service",
  faq: "FAQ",
  menu_item: "Menu Item",
  policy: "Policy",
  objection: "Objection Response",
};

function ProposalCard({
  suggestion,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  suggestion: ExtractedKnowledgeSuggestion;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const Icon = suggestionTypeIcons[suggestion.suggestion_type] || FileText;
  const data = suggestion.extracted_data;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">
                  {suggestionTypeLabels[suggestion.suggestion_type]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Render extracted data based on type */}
              <div className="space-y-1">
                {suggestion.suggestion_type === "service" && (
                  <>
                    <p className="font-medium">{data.name}</p>
                    {data.description && (
                      <p className="text-sm text-muted-foreground">{data.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      {data.price_amount && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${data.price_amount}
                          {data.price_type === "starting_at" && "+"}
                        </span>
                      )}
                      {data.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {data.duration_minutes} min
                        </span>
                      )}
                    </div>
                  </>
                )}

                {suggestion.suggestion_type === "menu_item" && (
                  <>
                    <p className="font-medium">{data.name}</p>
                    {data.description && (
                      <p className="text-sm text-muted-foreground">{data.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      {data.price_cents && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${(data.price_cents / 100).toFixed(2)}
                        </span>
                      )}
                      {data.category && (
                        <Badge variant="secondary">{data.category}</Badge>
                      )}
                    </div>
                  </>
                )}

                {suggestion.suggestion_type === "faq" && (
                  <>
                    <p className="font-medium">{data.question}</p>
                    <p className="text-sm text-muted-foreground">{data.answer}</p>
                  </>
                )}

                {suggestion.suggestion_type === "objection" && (
                  <>
                    <p className="font-medium">"{data.objection}"</p>
                    <p className="text-sm text-muted-foreground">{data.response}</p>
                  </>
                )}

                {suggestion.suggestion_type === "policy" && (
                  <>
                    <p className="font-medium">{data.title || "Policy Update"}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{data.content}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              disabled={isRejecting || isApproving}
            >
              {isRejecting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isApproving || isRejecting}
            >
              {isApproving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Accept
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConflictCard({
  conflict,
  onKeepExisting,
  onAcceptUpload,
  onCustomMerge,
  isResolving,
}: {
  conflict: KnowledgeConflict;
  onKeepExisting: () => void;
  onAcceptUpload: () => void;
  onCustomMerge: (data: Record<string, any>) => void;
  isResolving: boolean;
}) {
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeData, setMergeData] = useState<Record<string, any>>(conflict.proposed_data);

  const entityIcon = entityTypeLabels[conflict.entity_type]
    ? suggestionTypeIcons[conflict.entity_type as SuggestionType] || FileText
    : FileText;

  const handleMerge = () => {
    onCustomMerge(mergeData);
    setShowMergeDialog(false);
  };

  return (
    <>
      <Card className="border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  {conflictTypeLabels[conflict.conflict_type] || "Conflict"}
                </Badge>
                <Badge variant="secondary">
                  {entityTypeLabels[conflict.entity_type] || conflict.entity_type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conflict.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Diff display */}
              <div className="grid md:grid-cols-2 gap-4 mt-3">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Current Value</p>
                  <div className="space-y-1 text-sm">
                    {conflict.differing_fields.map((field) => (
                      <div key={field}>
                        <span className="text-muted-foreground">{field}: </span>
                        <span className="font-medium">
                          {JSON.stringify(conflict.existing_data[field]) || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-2">From Upload</p>
                  <div className="space-y-1 text-sm">
                    {conflict.differing_fields.map((field) => (
                      <div key={field}>
                        <span className="text-muted-foreground">{field}: </span>
                        <span className="font-medium text-primary">
                          {JSON.stringify(conflict.proposed_data[field]) || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onKeepExisting}
                  disabled={isResolving}
                >
                  Keep Current
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAcceptUpload}
                  disabled={isResolving}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Accept Upload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMergeDialog(true)}
                  disabled={isResolving}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit & Merge
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit & Merge</DialogTitle>
            <DialogDescription>
              Edit the values before saving. This will update the existing record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {conflict.differing_fields.map((field) => (
              <div key={field} className="space-y-2">
                <Label>{field}</Label>
                {typeof conflict.proposed_data[field] === "string" &&
                conflict.proposed_data[field].length > 100 ? (
                  <Textarea
                    value={mergeData[field] || ""}
                    onChange={(e) =>
                      setMergeData((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    rows={3}
                  />
                ) : (
                  <Input
                    value={mergeData[field] || ""}
                    onChange={(e) =>
                      setMergeData((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMerge} disabled={isResolving}>
              {isResolving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BrainReviewQueue() {
  const {
    pendingSuggestions,
    pendingCount,
    approve,
    reject,
    isApproving,
    isRejecting,
  } = useKnowledgeSuggestions();

  const {
    unresolvedConflicts,
    unresolvedCount,
    keepExisting,
    acceptUpload,
    customMerge,
    isResolving,
  } = useKnowledgeConflicts();

  const [activeTab, setActiveTab] = useState("proposals");

  const totalPending = pendingCount + unresolvedCount;

  const handleApprove = async (id: string) => {
    try {
      await approve(id);
      toast({ title: "Approved", description: "The suggestion has been added to your knowledge base." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve suggestion.", variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reject(id);
      toast({ title: "Rejected", description: "The suggestion has been dismissed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject suggestion.", variant: "destructive" });
    }
  };

  const handleKeepExisting = async (id: string) => {
    try {
      await keepExisting(id);
      toast({ title: "Resolved", description: "Kept existing value, conflict dismissed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to resolve conflict.", variant: "destructive" });
    }
  };

  const handleAcceptUpload = async (id: string) => {
    try {
      await acceptUpload(id);
      toast({ title: "Updated", description: "Value updated from upload." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to accept upload.", variant: "destructive" });
    }
  };

  const handleCustomMerge = async (id: string, data: Record<string, any>) => {
    try {
      await customMerge({ conflictId: id, mergedData: data });
      toast({ title: "Merged", description: "Custom value saved successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to merge.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      {totalPending > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">
                  {totalPending} item{totalPending > 1 ? "s" : ""} need{totalPending === 1 ? "s" : ""} your review
                </p>
                <p className="text-sm text-muted-foreground">
                  {pendingCount} proposal{pendingCount !== 1 ? "s" : ""}, {unresolvedCount} conflict{unresolvedCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="proposals" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Proposals
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Conflicts
            {unresolvedCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {unresolvedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="mt-6 space-y-4">
          {pendingSuggestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                <p className="font-medium mb-2">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  No pending proposals. Upload a document to extract new knowledge.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingSuggestions.map((suggestion) => (
              <ProposalCard
                key={suggestion.id}
                suggestion={suggestion}
                onApprove={() => handleApprove(suggestion.id)}
                onReject={() => handleReject(suggestion.id)}
                isApproving={isApproving}
                isRejecting={isRejecting}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="mt-6 space-y-4">
          {unresolvedConflicts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                <p className="font-medium mb-2">No conflicts</p>
                <p className="text-sm text-muted-foreground">
                  All knowledge conflicts have been resolved.
                </p>
              </CardContent>
            </Card>
          ) : (
            unresolvedConflicts.map((conflict) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                onKeepExisting={() => handleKeepExisting(conflict.id)}
                onAcceptUpload={() => handleAcceptUpload(conflict.id)}
                onCustomMerge={(data) => handleCustomMerge(conflict.id, data)}
                isResolving={isResolving}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function useBrainReviewCount() {
  const { pendingCount } = useKnowledgeSuggestions();
  const { unresolvedCount } = useKnowledgeConflicts();
  return pendingCount + unresolvedCount;
}
