import { useState } from "react";
import { useKnowledgeSuggestions, ExtractedKnowledgeSuggestion, SuggestionType } from "@/hooks/useKnowledgeSuggestions";
import { useKnowledgeConflicts, KnowledgeConflict, entityTypeLabels } from "@/hooks/useKnowledgeConflicts";
import { Card, CardContent } from "@/components/ui/card";
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
  CheckCheck,
  X,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

const suggestionTypeIcons: Record<SuggestionType | string, React.ElementType> = {
  service: Briefcase,
  faq: HelpCircle,
  menu_item: UtensilsCrossed,
  policy: ShieldCheck,
  objection: FileText,
  hours: Clock,
};

const suggestionTypeLabels: Record<SuggestionType | string, string> = {
  service: "Service",
  faq: "FAQ",
  menu_item: "Menu Item",
  policy: "Policy",
  objection: "Objection Response",
  hours: "Hours",
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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">
                  {suggestionTypeLabels[suggestion.suggestion_type] || suggestion.suggestion_type}
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
                      <p className="text-sm text-muted-foreground line-clamp-2">{data.description}</p>
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
                      <p className="text-sm text-muted-foreground line-clamp-2">{data.description}</p>
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
                    <p className="text-sm text-muted-foreground line-clamp-2">{data.answer}</p>
                  </>
                )}

                {suggestion.suggestion_type === "objection" && (
                  <>
                    <p className="font-medium">"{data.objection}"</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{data.response}</p>
                  </>
                )}

                {suggestion.suggestion_type === "policy" && (
                  <>
                    <p className="font-medium">{data.title || "Policy Update"}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{data.content}</p>
                  </>
                )}

                {(suggestion.suggestion_type as string) === "hours" && (
                  <>
                    <p className="font-medium capitalize">{data.day_name || data.day}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.is_available === false ? "Closed" : `${data.start_time} - ${data.end_time}`}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onReject}
              disabled={isRejecting || isApproving}
              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isApproving || isRejecting}
              className="gap-1"
            >
              {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
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

  const handleMerge = () => {
    onCustomMerge(mergeData);
    setShowMergeDialog(false);
  };

  // Get the main item name for display
  const itemName = conflict.existing_data?.name || 
                   conflict.existing_data?.question || 
                   conflict.existing_data?.day ||
                   "Item";

  return (
    <>
      <Card className="border-amber-500/30 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium">{itemName}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {entityTypeLabels[conflict.entity_type] || conflict.entity_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {conflict.differing_fields.length} field{conflict.differing_fields.length > 1 ? "s" : ""} differ
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-Side Comparison */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-5 rounded bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">A</span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">YOUR CURRENT VALUE</p>
                </div>
                <div className="space-y-2">
                  {conflict.differing_fields.map((field) => (
                    <div key={field} className="text-sm">
                      <span className="text-muted-foreground capitalize">{field.replace(/_/g, " ")}: </span>
                      <span className="font-medium">
                        {formatFieldValue(field, conflict.existing_data[field])}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onKeepExisting}
                  disabled={isResolving}
                  className="w-full mt-3"
                >
                  Keep This
                </Button>
              </div>
              
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">B</span>
                  </div>
                  <p className="text-xs font-medium text-primary">FROM UPLOAD</p>
                </div>
                <div className="space-y-2">
                  {conflict.differing_fields.map((field) => (
                    <div key={field} className="text-sm">
                      <span className="text-muted-foreground capitalize">{field.replace(/_/g, " ")}: </span>
                      <span className="font-medium text-primary">
                        {formatFieldValue(field, conflict.proposed_data[field])}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={onAcceptUpload}
                  disabled={isResolving}
                  className="w-full mt-3"
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Use This
                </Button>
              </div>
            </div>

            {/* Edit Option */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMergeDialog(true)}
              disabled={isResolving}
              className="w-full text-muted-foreground"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit & Merge
            </Button>
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
                <Label className="capitalize">{field.replace(/_/g, " ")}</Label>
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

function formatFieldValue(field: string, value: any): string {
  if (value === null || value === undefined) return "—";
  
  if (field === "price_cents" && typeof value === "number") {
    return `$${(value / 100).toFixed(2)}`;
  }
  if (field === "price_amount" && typeof value === "number") {
    return `$${value.toFixed(2)}`;
  }
  if (field === "duration_minutes" && typeof value === "number") {
    return `${value} min`;
  }
  
  return String(value);
}

export function BrainReviewQueue() {
  const {
    pendingSuggestions,
    pendingCount,
    approve,
    reject,
    approveAll,
    rejectAll,
    isApproving,
    isRejecting,
  } = useKnowledgeSuggestions();

  const {
    unresolvedConflicts,
    unresolvedCount,
    keepExisting,
    acceptUpload,
    customMerge,
    keepAllExisting,
    acceptAllUploads,
    isResolving,
  } = useKnowledgeConflicts();

  const [activeTab, setActiveTab] = useState("proposals");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const totalPending = pendingCount + unresolvedCount;

  const handleApprove = async (id: string) => {
    try {
      await approve(id);
      toast({ title: "Approved", description: "The item has been added to your knowledge base." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve.", variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reject(id);
      toast({ title: "Dismissed", description: "The suggestion has been dismissed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to dismiss.", variant: "destructive" });
    }
  };

  const handleApproveAll = async () => {
    if (!approveAll) return;
    setIsBatchProcessing(true);
    try {
      await approveAll();
      toast({ title: "All Approved", description: `${pendingCount} items added to your knowledge base.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve all.", variant: "destructive" });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleRejectAll = async () => {
    if (!rejectAll) return;
    setIsBatchProcessing(true);
    try {
      await rejectAll();
      toast({ title: "All Dismissed", description: `${pendingCount} suggestions dismissed.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to dismiss all.", variant: "destructive" });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleKeepExisting = async (id: string) => {
    try {
      await keepExisting(id);
      toast({ title: "Resolved", description: "Kept existing value." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to resolve.", variant: "destructive" });
    }
  };

  const handleAcceptUpload = async (id: string) => {
    try {
      await acceptUpload(id);
      toast({ title: "Updated", description: "Value updated from upload." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const handleCustomMerge = async (id: string, data: Record<string, any>) => {
    try {
      await customMerge({ conflictId: id, mergedData: data });
      toast({ title: "Merged", description: "Custom value saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to merge.", variant: "destructive" });
    }
  };

  const handleKeepAllExisting = async () => {
    if (!keepAllExisting) return;
    setIsBatchProcessing(true);
    try {
      await keepAllExisting();
      toast({ title: "All Resolved", description: "Kept all existing values." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to resolve all.", variant: "destructive" });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleAcceptAllUploads = async () => {
    if (!acceptAllUploads) return;
    setIsBatchProcessing(true);
    try {
      await acceptAllUploads();
      toast({ title: "All Updated", description: "All values updated from uploads." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update all.", variant: "destructive" });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      {totalPending > 0 && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {totalPending} item{totalPending > 1 ? "s" : ""} extracted from your uploads
                </p>
                <p className="text-sm text-muted-foreground">
                  {pendingCount} new item{pendingCount !== 1 ? "s" : ""} to add, {unresolvedCount} update{unresolvedCount !== 1 ? "s" : ""} to review
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
            New Items
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Updates
            {unresolvedCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {unresolvedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="mt-6 space-y-4">
          {/* Batch Actions */}
          {pendingCount > 1 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                {pendingCount} items waiting for your approval
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  disabled={isBatchProcessing || isApproving || isRejecting}
                >
                  {isBatchProcessing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <X className="h-4 w-4 mr-1" />
                  Dismiss All
                </Button>
                <Button
                  size="sm"
                  onClick={handleApproveAll}
                  disabled={isBatchProcessing || isApproving || isRejecting}
                >
                  {isBatchProcessing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Accept All
                </Button>
              </div>
            </div>
          )}

          {pendingSuggestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                <p className="font-medium mb-2">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  No pending items. Upload a document to extract new knowledge.
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
          {/* Batch Actions */}
          {unresolvedCount > 1 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-muted-foreground">
                {unresolvedCount} items have different values in your upload
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleKeepAllExisting}
                  disabled={isBatchProcessing || isResolving}
                >
                  {isBatchProcessing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Keep All Current
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAllUploads}
                  disabled={isBatchProcessing || isResolving}
                >
                  {isBatchProcessing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Accept All Uploads
                </Button>
              </div>
            </div>
          )}

          {unresolvedConflicts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                <p className="font-medium mb-2">No conflicts!</p>
                <p className="text-sm text-muted-foreground">
                  All your data is in sync. No conflicting information detected.
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

// Hook to get pending review count for badges
export function useBrainReviewCount() {
  const { pendingCount } = useKnowledgeSuggestions();
  const { unresolvedCount } = useKnowledgeConflicts();
  return pendingCount + unresolvedCount;
}
