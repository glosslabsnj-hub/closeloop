/**
 * Business Brain - Preview Panel
 * 
 * Shows "What the AI sees" - a read-only summary of current values
 * without calling any new APIs.
 */

import { useMemo } from "react";
import { Volume2, CheckCircle2, AlertCircle, Info, Building2, Clock, Package, MapPin, Shield, Sparkles, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useBrainSummaries } from "@/hooks/useBrainSummaries";
import { useBusinessCapabilities } from "@/hooks/useBusinessCapabilities";
import { cn } from "@/lib/utils";

interface BrainPreviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection?: string;
}

interface PreviewSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    label: string;
    value: string | null;
    status: "complete" | "missing" | "partial";
  }>;
}

export function BrainPreviewPanel({ open, onOpenChange, activeSection }: BrainPreviewPanelProps) {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const summaries = useBrainSummaries();
  const capabilities = useBusinessCapabilities();

  // Parse hours for display
  const hoursDisplay = useMemo(() => {
    const hoursJson = tenant?.hours_json as Record<string, { closed?: boolean; windows?: { open: string; close: string }[] }> | null;
    if (!hoursJson || typeof hoursJson !== "object") return null;
    const openDays = Object.entries(hoursJson).filter(([, day]) => day && !day.closed && Array.isArray(day.windows) && day.windows.length > 0);
    if (openDays.length === 0) return null;
    if (openDays.length === 7) return "7 days configured";
    if (openDays.length >= 5) return `${openDays.length} days configured`;
    return `${openDays.length} day${openDays.length === 1 ? "" : "s"} configured`;
  }, [tenant?.hours_json]);

  // Build preview data from tenant
  const sections = useMemo<PreviewSection[]>(() => {
    if (!tenant) return [];

    return [
      {
        id: "profile",
        label: "Profile & Identity",
        icon: Building2,
        items: [
          {
            label: "Business Name",
            value: tenant.name || null,
            status: tenant.name ? "complete" : "missing",
          },
          {
            label: "Timezone",
            value: tenant.timezone || null,
            status: tenant.timezone ? "complete" : "missing",
          },
          {
            label: "Address",
            value: tenant.address || null,
            status: tenant.address ? "complete" : "missing",
          },
          {
            label: "Tagline",
            value: tenant.tagline || null,
            status: tenant.tagline ? "complete" : "partial",
          },
        ],
      },
      {
        id: "hours",
        label: "Operating Hours",
        icon: Clock,
        items: [
          {
            label: "Hours Configured",
            value: hoursDisplay || null,
            status: hoursDisplay ? "complete" : "missing",
          },
        ],
      },
      {
        id: "services",
        label: caps.isFoodBusiness ? "Menu" : "Services",
        icon: Package,
        items: [
          {
            label: caps.isFoodBusiness ? "Menu Items" : "Services",
            value: summaries.catalog !== "No services added yet" ? summaries.catalog : null,
            status: capabilities.hasServices ? "complete" : "missing",
          },
        ],
      },
      {
        id: "service-area",
        label: "Service Area",
        icon: MapPin,
        items: [
          {
            label: "Coverage Mode",
            value: (() => {
              const sa = (tenant as Record<string, unknown>).service_area_json as Record<string, unknown> | null;
              if (!sa || Object.keys(sa).length === 0) return null;
              const radius = (sa as { radius_miles?: number }).radius_miles;
              return radius ? `${radius} mile radius` : "Configured";
            })(),
            status: (() => {
              const sa = (tenant as Record<string, unknown>).service_area_json as Record<string, unknown> | null;
              return sa && Object.keys(sa).length > 0 ? "complete" : "missing";
            })(),
          },
          {
            label: "Base Address",
            value: tenant.address || null,
            status: tenant.address ? "complete" : "missing",
          },
        ],
      },
      {
        id: "policies",
        label: "Policies & Rules",
        icon: Shield,
        items: [
          {
            label: "Policies",
            value: summaries.policies !== "No policies set yet" ? summaries.policies : null,
            status: summaries.policies !== "No policies set yet" ? "complete" : "missing",
          },
          {
            label: "Guardrails",
            value: summaries.guardrails !== "No limits set yet" ? summaries.guardrails : null,
            status: summaries.guardrails !== "No limits set yet" ? "complete" : "missing",
          },
        ],
      },
      {
        id: "ai-behavior",
        label: "AI Behavior",
        icon: Sparkles,
        items: [
          {
            label: "Greeting",
            value: summaries.scripts !== "Using the default — customize to match your style" ? summaries.scripts : null,
            status: summaries.scripts !== "Using the default — customize to match your style" ? "complete" : "missing",
          },
          {
            label: "Guidelines",
            value: summaries.guidelines !== "No special instructions yet" ? summaries.guidelines : null,
            status: summaries.guidelines !== "No special instructions yet" ? "complete" : "missing",
          },
        ],
      },
      {
        id: "knowledge",
        label: "Knowledge & Training",
        icon: BookOpen,
        items: [
          {
            label: "FAQs",
            value: summaries.faqs !== "No questions added yet — your AI says 'I'm not sure' to unknowns" ? summaries.faqs : null,
            status: capabilities.hasFAQs ? "complete" : "missing",
          },
          {
            label: "Objections",
            value: summaries.objections !== "No responses set — your AI uses generic replies to pushback" ? summaries.objections : null,
            status: capabilities.hasKnowledge ? "complete" : "missing",
          },
        ],
      },
    ];
  }, [tenant, businessMode, hoursDisplay, summaries, capabilities, caps.isFoodBusiness]);

  // Summary stats
  const stats = useMemo(() => {
    let complete = 0;
    let missing = 0;
    let partial = 0;
    
    sections.forEach(section => {
      section.items.forEach(item => {
        if (item.status === "complete") complete++;
        else if (item.status === "missing") missing++;
        else partial++;
      });
    });

    return { complete, missing, partial, total: complete + missing + partial };
  }, [sections]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <SheetTitle>What Your AI Sees</SheetTitle>
          </div>
          <SheetDescription>
            This is a summary of the information your AI uses to answer calls.
          </SheetDescription>
        </SheetHeader>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm">{stats.complete} complete</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">{stats.missing} missing</span>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-4 pr-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <div
                  key={section.id}
                  className={cn(
                    "rounded-lg border p-3",
                    isActive && "ring-2 ring-primary border-primary"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{section.label}</span>
                    {isActive && (
                      <Badge variant="secondary" className="text-xs ml-auto">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          {item.status === "complete" ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          ) : item.status === "missing" ? (
                            <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                          ) : (
                            <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn(
                            "text-xs text-right",
                            item.status === "missing" ? "text-amber-600 dark:text-amber-400 italic" : "text-foreground"
                          )}>
                            {item.value || "Not set"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <div className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              This preview shows a snapshot of your current configuration. 
              Complete all sections for the best AI performance.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
