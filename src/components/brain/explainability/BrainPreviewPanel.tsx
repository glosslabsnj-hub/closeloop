/**
 * Business Brain - Preview Panel
 * 
 * Shows "What the AI sees" - a read-only summary of current values
 * without calling any new APIs.
 */

import { useMemo } from "react";
import { X, Volume2, CheckCircle2, AlertCircle, Info, Building2, Clock, Package, MapPin, Shield, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
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
            value: "Check hours tab for details",
            status: "partial",
          },
        ],
      },
      {
        id: "services",
        label: businessMode === "food" ? "Menu" : "Services",
        icon: Package,
        items: [
          {
            label: businessMode === "food" ? "Menu Items" : "Services",
            value: "Check services tab for details",
            status: "partial",
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
            value: (tenant as Record<string, unknown>).service_area_config_json 
              ? "Configured" 
              : null,
            status: (tenant as Record<string, unknown>).service_area_config_json ? "complete" : "missing",
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
            label: "Cancellation Policy",
            value: tenant.cancellation_policy ? truncate(tenant.cancellation_policy, 50) : null,
            status: tenant.cancellation_policy ? "complete" : "missing",
          },
          {
            label: "Payment Methods",
            value: "Check policies tab",
            status: "partial",
          },
        ],
      },
      {
        id: "ai-behavior",
        label: "AI Behavior",
        icon: Sparkles,
        items: [
          {
            label: "Custom Scripts",
            value: "Check AI behavior tab",
            status: "partial",
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
            value: "Check knowledge tab for count",
            status: "partial",
          },
        ],
      },
    ];
  }, [tenant, businessMode]);

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

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}
