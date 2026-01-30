import { useState } from "react";
import {
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useKnowledgeMergeQueue, KnowledgeMergeItem } from "@/hooks/useKnowledgeMergeQueue";
import { useToast } from "@/hooks/use-toast";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  service: "Services",
  menu_item: "Menu Items",
  menu_category: "Menu Categories",
  policy: "Policies",
  faq: "FAQs",
  intake_field: "Intake Fields",
};

const CONFLICT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  different_price: { label: "Price differs", color: "bg-warning/15 text-warning" },
  missing_field: { label: "New fields", color: "bg-blue-500/15 text-blue-600" },
  name_mismatch: { label: "Name mismatch", color: "bg-amber-500/15 text-amber-600" },
  duplicate: { label: "Duplicate", color: "bg-muted text-muted-foreground" },
  new_item: { label: "New", color: "bg-primary/15 text-primary" },
  other: { label: "Update", color: "bg-muted text-muted-foreground" },
};

export function KnowledgeMergeReview() {
  const { toast } = useToast();
  const {
    pendingItems,
    pendingCount,
    isLoading,
    acceptItem,
    rejectItem,
    acceptAll,
    rejectAll,
    isAccepting,
    isRejecting,
  } = useKnowledgeMergeQueue();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["service", "menu_item"]));

  // Group items by entity_type
  const groupedItems = pendingItems.reduce((acc, item) => {
    if (!acc[item.entity_type]) acc[item.entity_type] = [];
    acc[item.entity_type].push(item);
    return acc;
  }, {} as Record<string, KnowledgeMergeItem[]>);

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map(i => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAcceptSelected = async () => {
    const itemsToAccept = pendingItems.filter(i => selectedIds.has(i.id));
    for (const item of itemsToAccept) {
      await acceptItem(item);
    }
    setSelectedIds(new Set());
    toast({ title: `Accepted ${itemsToAccept.length} changes` });
  };

  const handleRejectSelected = async () => {
    for (const id of selectedIds) {
      await rejectItem(id);
    }
    setSelectedIds(new Set());
    toast({ title: "Changes rejected" });
  };

  const handleAcceptItem = async (item: KnowledgeMergeItem) => {
    await acceptItem(item);
    toast({ title: `Accepted: ${item.entity_key}` });
  };

  const handleRejectItem = async (id: string) => {
    await rejectItem(id);
    toast({ title: "Change rejected" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pendingCount === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h3 className="font-semibold text-lg mb-2">All caught up!</h3>
        <p className="text-muted-foreground">
          No pending changes to review. Your Business Brain is up to date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Alert variant="default" className="border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Review Required</AlertTitle>
        <AlertDescription>
          {pendingCount} proposed {pendingCount === 1 ? "change" : "changes"} from uploads need your review.
          Your current Business Brain settings remain active until you approve changes.
        </AlertDescription>
      </Alert>

      {/* Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIds.size === pendingItems.length && pendingItems.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 
                  ? `${selectedIds.size} selected` 
                  : `${pendingCount} pending changes`
                }
              </span>
            </div>
            <div className="flex gap-2">
              {selectedIds.size > 0 ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRejectSelected}
                    disabled={isRejecting}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject Selected
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAcceptSelected}
                    disabled={isAccepting}
                  >
                    {isAccepting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Accept Selected
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rejectAll()}
                    disabled={isRejecting}
                  >
                    Reject All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => acceptAll()}
                    disabled={isAccepting}
                  >
                    {isAccepting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : null}
                    Accept All
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Items */}
      {Object.entries(groupedItems).map(([entityType, items]) => (
        <Collapsible
          key={entityType}
          open={expandedGroups.has(entityType)}
          onOpenChange={() => toggleGroup(entityType)}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">
                      {ENTITY_TYPE_LABELS[entityType] || entityType}
                    </CardTitle>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  {expandedGroups.has(entityType) ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {items.map((item) => {
                  const conflictConfig = CONFLICT_TYPE_LABELS[item.conflict_type] || CONFLICT_TYPE_LABELS.other;
                  
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium truncate">{item.entity_key}</span>
                            <Badge variant="secondary" className={conflictConfig.color}>
                              {conflictConfig.label}
                            </Badge>
                          </div>

                          {/* Diff View */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {/* Existing Value */}
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Current</p>
                              {item.existing_value ? (
                                <pre className="text-xs whitespace-pre-wrap break-words">
                                  {JSON.stringify(item.existing_value, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-muted-foreground italic">Not set</p>
                              )}
                            </div>

                            {/* Proposed Value */}
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                              <p className="text-xs font-medium text-primary mb-2">Proposed</p>
                              <pre className="text-xs whitespace-pre-wrap break-words">
                                {JSON.stringify(item.proposed_value, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRejectItem(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleAcceptItem(item)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
