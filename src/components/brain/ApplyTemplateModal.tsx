/**
 * Apply Industry Template Modal
 *
 * Shows a preview of what will be added/changed when applying an industry template.
 * Supports two modes: Merge (non-destructive) and Replace (overwrite).
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Package,
  HelpCircle,
  MessageSquare,
  FileText,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Plus,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  getTemplate,
  previewTemplateApplication,
  applyTemplate,
  fetchCurrentBrainState,
  type IndustryTemplate,
  type TemplatePreviewResult,
  type ApplyMode,
} from "@/lib/industryTemplates";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ApplyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industryKey: string;
  onApplied?: () => void;
}

export function ApplyTemplateModal({
  open,
  onOpenChange,
  industryKey,
  onApplied,
}: ApplyTemplateModalProps) {
  const { tenant, refreshTenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [template, setTemplate] = useState<IndustryTemplate | null>(null);
  const [preview, setPreview] = useState<TemplatePreviewResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<ApplyMode>("merge");

  // Load template and generate preview
  useEffect(() => {
    if (!open || !tenant?.id || !industryKey) return;

    async function loadPreview() {
      setIsLoading(true);
      try {
        const tmpl = getTemplate(industryKey);
        if (!tmpl) {
          throw new Error("Template not found");
        }
        setTemplate(tmpl);

        const currentState = await fetchCurrentBrainState(tenant!.id);
        const previewResult = previewTemplateApplication(currentState, tmpl, selectedMode);
        setPreview(previewResult);
      } catch (error) {
        console.error("Failed to load template preview:", error);
        toast({
          title: "Error",
          description: "Failed to load template preview.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadPreview();
  }, [open, tenant?.id, industryKey, selectedMode, toast]);

  // Handle mode change
  const handleModeChange = async (mode: ApplyMode) => {
    setSelectedMode(mode);
    if (template && tenant?.id) {
      setIsLoading(true);
      try {
        const currentState = await fetchCurrentBrainState(tenant.id);
        const previewResult = previewTemplateApplication(currentState, template, mode);
        setPreview(previewResult);
      } catch (error) {
        console.error("Failed to update preview:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle apply
  const handleApply = async () => {
    if (!template || !preview || !tenant?.id) return;

    setIsApplying(true);
    try {
      const result = await applyTemplate(tenant.id, template, selectedMode, preview);

      if (result.success) {
        toast({
          title: "Template Applied",
          description: `Added ${result.servicesAdded} services, ${result.faqsAdded} FAQs, and ${result.objectionsAdded} objection responses.${result.conflictsCreated > 0 ? ` ${result.conflictsCreated} items sent to Review Queue.` : ""}`,
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["services"] });
        queryClient.invalidateQueries({ queryKey: ["business-faqs"] });
        queryClient.invalidateQueries({ queryKey: ["objection-responses"] });
        queryClient.invalidateQueries({ queryKey: ["service-area"] });
        queryClient.invalidateQueries({ queryKey: ["brain-review-count"] });
        refreshTenant?.();

        onOpenChange(false);
        onApplied?.();
      } else {
        toast({
          title: "Partial Success",
          description: `Template applied with some errors: ${result.errors.join(", ")}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to apply template:", error);
      toast({
        title: "Error",
        description: "Failed to apply template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Apply Industry Template
            {template && (
              <Badge variant="secondary" className="ml-2">
                {template.icon} {template.name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Pre-populate your Business Brain with industry-specific defaults. Everything
            remains fully editable.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : template && preview ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={selectedMode === "merge" ? "default" : "outline"}
                size="sm"
                onClick={() => handleModeChange("merge")}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Merge (Recommended)
              </Button>
              <Button
                variant={selectedMode === "replace" ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleModeChange("replace")}
                className="flex-1"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Replace All
              </Button>
            </div>

            {selectedMode === "replace" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Replace mode will delete all existing services, FAQs, objection responses,
                  and policies before applying the template.
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-md">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{preview.totals.itemsToAdd}</span>
                <span className="text-muted-foreground">items to add</span>
              </div>
              {selectedMode === "merge" && preview.totals.conflictCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium">{preview.totals.conflictCount}</span>
                  <span className="text-muted-foreground">conflicts → Review Queue</span>
                </div>
              )}
            </div>

            {/* Preview Tabs */}
            <Tabs defaultValue="services" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="services" className="gap-1 text-xs">
                  <Package className="h-3 w-3" />
                  Services
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {preview.services.toAdd.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="faqs" className="gap-1 text-xs">
                  <HelpCircle className="h-3 w-3" />
                  FAQs
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {preview.faqs.toAdd.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="objections" className="gap-1 text-xs">
                  <MessageSquare className="h-3 w-3" />
                  Objections
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {preview.objections.toAdd.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="policies" className="gap-1 text-xs">
                  <FileText className="h-3 w-3" />
                  Policies
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {preview.policies.toAdd.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="area" className="gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  Area
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-3">
                <TabsContent value="services" className="mt-0">
                  <PreviewList
                    items={preview.services.toAdd.map((s) => ({
                      title: s.name,
                      subtitle: s.description || `${s.duration_minutes} min`,
                      badge:
                        s.base_price_model === "fixed"
                          ? `$${((s.fixed_price_cents || 0) / 100).toFixed(0)}`
                          : s.base_price_model === "starting_at"
                            ? `From $${((s.starting_price_cents || 0) / 100).toFixed(0)}`
                            : "Quote",
                    }))}
                    conflicts={preview.services.conflicts.map((c) => ({
                      title: c.templateItem.name,
                      conflict: `Already exists as "${c.existingName}"`,
                    }))}
                    emptyMessage="No services to add"
                  />
                </TabsContent>

                <TabsContent value="faqs" className="mt-0">
                  <PreviewList
                    items={preview.faqs.toAdd.map((f) => ({
                      title: f.question,
                      subtitle: f.answer.substring(0, 80) + (f.answer.length > 80 ? "..." : ""),
                    }))}
                    conflicts={preview.faqs.conflicts.map((c) => ({
                      title: c.templateItem.question,
                      conflict: `Similar to "${c.existingQuestion}"`,
                    }))}
                    emptyMessage="No FAQs to add"
                  />
                </TabsContent>

                <TabsContent value="objections" className="mt-0">
                  <PreviewList
                    items={preview.objections.toAdd.map((o) => ({
                      title: `"${o.objection}"`,
                      subtitle:
                        o.response.substring(0, 80) + (o.response.length > 80 ? "..." : ""),
                    }))}
                    conflicts={preview.objections.conflicts.map((c) => ({
                      title: `"${c.templateItem.objection}"`,
                      conflict: `Similar to "${c.existingObjection}"`,
                    }))}
                    emptyMessage="No objection responses to add"
                  />
                </TabsContent>

                <TabsContent value="policies" className="mt-0">
                  <PreviewList
                    items={preview.policies.toAdd.map((p) => ({
                      title: p.type.charAt(0).toUpperCase() + p.type.slice(1) + " Policy",
                      subtitle: p.text.substring(0, 100) + (p.text.length > 100 ? "..." : ""),
                    }))}
                    conflicts={preview.policies.conflicts.map((c) => ({
                      title:
                        c.templateItem.type.charAt(0).toUpperCase() +
                        c.templateItem.type.slice(1) +
                        " Policy",
                      conflict: "Already configured",
                    }))}
                    emptyMessage="No policies to add"
                  />
                </TabsContent>

                <TabsContent value="area" className="mt-0">
                  <div className="space-y-3">
                    {preview.service_area.willConfigure ? (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-2">Service Area Defaults</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>
                            <span className="font-medium">Mode:</span>{" "}
                            {preview.service_area.defaults.mode}
                          </p>
                          {preview.service_area.defaults.radius_miles && (
                            <p>
                              <span className="font-medium">Radius:</span>{" "}
                              {preview.service_area.defaults.radius_miles} miles
                            </p>
                          )}
                          {preview.service_area.defaults.restrictions.no_cross_state_lines && (
                            <p>
                              <span className="font-medium">Restriction:</span> No crossing
                              state lines
                            </p>
                          )}
                          <p className="italic mt-2">{preview.service_area.defaults.notes}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md text-center text-sm text-muted-foreground">
                        Service area already configured - will not be changed in merge mode
                      </div>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Template not found for "{industryKey}"
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isLoading || isApplying || !preview}>
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Apply Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// PREVIEW LIST COMPONENT
// ============================================================================

interface PreviewListProps {
  items: Array<{
    title: string;
    subtitle?: string;
    badge?: string;
  }>;
  conflicts?: Array<{
    title: string;
    conflict: string;
  }>;
  emptyMessage: string;
}

function PreviewList({ items, conflicts = [], emptyMessage }: PreviewListProps) {
  if (items.length === 0 && conflicts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Items to add */}
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2 p-2 bg-emerald-500/5 rounded-md border border-emerald-500/20"
        >
          <Plus className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{item.title}</p>
              {item.badge && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {item.badge}
                </Badge>
              )}
            </div>
            {item.subtitle && (
              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
            )}
          </div>
        </div>
      ))}

      {/* Conflicts */}
      {conflicts.map((conflict, idx) => (
        <div
          key={`conflict-${idx}`}
          className="flex items-start gap-2 p-2 bg-amber-500/5 rounded-md border border-amber-500/20"
        >
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{conflict.title}</p>
            <p className="text-xs text-amber-600">{conflict.conflict}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
