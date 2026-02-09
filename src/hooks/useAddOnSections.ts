/**
 * useAddOnSections Hook
 *
 * Computes which brain sections are relevant vs. available as add-ons
 * for a given tab, based on the tenant's capabilities and scenario flags.
 */

import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  getSectionRelevanceForTab,
  type BrainTab,
  type AddOnItem,
} from "@/config/brainSectionRelevance";

interface UseAddOnSectionsReturn {
  /** Check if a section should show in the main area */
  isRelevant: (sectionId: string) => boolean;
  /** Items that should appear in the "Available Add-ons" group */
  addOnItems: AddOnItem[];
  /** Enable an add-on (updates capabilities + optionally modules) */
  enableAddOn: (item: AddOnItem) => Promise<void>;
}

export function useAddOnSections(tab: BrainTab): UseAddOnSectionsReturn {
  const { tenant } = useAuth();
  const caps = useCapabilities();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Extract scenario flags from capabilities_json
  const scenarioFlags = useMemo(() => {
    const capsJson = (tenant?.capabilities_json as Record<string, boolean>) || {};
    return capsJson;
  }, [tenant?.capabilities_json]);

  const tabSections = useMemo(
    () => getSectionRelevanceForTab(tab),
    [tab],
  );

  const { relevantSet, addOnItems } = useMemo(() => {
    const relevant = new Set<string>();
    const addOns: AddOnItem[] = [];

    for (const section of tabSections) {
      if (section.isRelevant(caps, scenarioFlags)) {
        relevant.add(section.sectionId);
      } else {
        addOns.push(section.addOn);
      }
    }

    return { relevantSet: relevant, addOnItems: addOns };
  }, [caps, scenarioFlags, tabSections]);

  const isRelevant = useCallback(
    (sectionId: string) => {
      // If section has no relevance rule, it's always relevant
      const hasRule = tabSections.some((s) => s.sectionId === sectionId);
      if (!hasRule) return true;
      return relevantSet.has(sectionId);
    },
    [relevantSet, tabSections],
  );

  const enableAddOn = useCallback(
    async (item: AddOnItem) => {
      if (!tenant?.id) return;

      try {
        // 1. Update capabilities_json
        const currentCaps = (tenant.capabilities_json as Record<string, boolean>) || {};
        const updatedCaps = { ...currentCaps, [item.capabilityKey]: true };

        const updates: Record<string, unknown> = {
          capabilities_json: updatedCaps,
        };

        // 2. If modulesToEnable, add to enabled_modules
        if (item.modulesToEnable?.length) {
          const currentModules = (tenant.enabled_modules as string[]) || [];
          const moduleSet = new Set(currentModules);
          for (const mod of item.modulesToEnable) {
            moduleSet.add(mod);
          }
          updates.enabled_modules = Array.from(moduleSet);
        }

        const { error } = await supabase
          .from("tenants")
          .update(updates)
          .eq("id", tenant.id);

        if (error) throw error;

        // 3. Invalidate caches
        queryClient.invalidateQueries({ queryKey: ["tenant"] });
        queryClient.invalidateQueries({ queryKey: ["business-capabilities"] });

        toast({
          title: "Section enabled!",
          description: "You can now configure it above.",
        });
      } catch (err) {
        console.error("Failed to enable add-on:", err);
        toast({
          variant: "destructive",
          title: "Failed to enable section",
          description: "Please try again.",
        });
      }
    },
    [tenant, queryClient, toast],
  );

  return { isRelevant, addOnItems, enableAddOn };
}
