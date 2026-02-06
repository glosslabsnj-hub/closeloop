import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { toast } from "sonner";

export type MemoryType = 
  | "customer_preference"
  | "time_pattern"
  | "service_pattern"
  | "capacity_pattern"
  | "exception_pattern";

export interface BusinessMemory {
  id: string;
  tenant_id: string;
  location_id: string | null;
  memory_type: MemoryType;
  subject_key: string | null;
  summary: string;
  confidence_score: number;
  first_observed_at: string;
  last_observed_at: string;
  observation_count: number;
  is_active: boolean;
  created_at: string;
}

export const memoryTypeLabels: Record<MemoryType, string> = {
  customer_preference: "Customer Preference",
  time_pattern: "Time Pattern",
  service_pattern: "Service Pattern",
  capacity_pattern: "Capacity Pattern",
  exception_pattern: "Exception Pattern",
};

export const memoryTypeIcons: Record<MemoryType, string> = {
  customer_preference: "👤",
  time_pattern: "⏰",
  service_pattern: "🔧",
  capacity_pattern: "📊",
  exception_pattern: "⚠️",
};

export function useBusinessMemory() {
  const { tenant } = useAuth();
  const { hipaaMode } = useTenantConfig();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const { data: memories, isLoading, error } = useQuery({
    queryKey: ["business-memory", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("business_memory")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("confidence_score", { ascending: false });

      // In HIPAA mode, exclude customer preferences
      if (hipaaMode) {
        query = query.neq("memory_type", "customer_preference");
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as BusinessMemory[];
    },
    enabled: !!tenantId,
  });

  const toggleMemory = useMutation({
    mutationFn: async ({ memoryId, isActive }: { memoryId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("business_memory")
        .update({ is_active: isActive })
        .eq("id", memoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-memory", tenantId] });
      toast.success("Memory updated");
    },
    onError: () => {
      toast.error("Failed to update memory");
    },
  });

  const deleteMemory = useMutation({
    mutationFn: async (memoryId: string) => {
      const { error } = await supabase
        .from("business_memory")
        .delete()
        .eq("id", memoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-memory", tenantId] });
      toast.success("Memory deleted");
    },
    onError: () => {
      toast.error("Failed to delete memory");
    },
  });

  // Filter helpers
  const activeMemories = memories?.filter((m) => m.is_active) || [];
  const inactiveMemories = memories?.filter((m) => !m.is_active) || [];
  const usableMemories = activeMemories.filter((m) => m.confidence_score >= 0.65 && m.observation_count >= 3);

  // Group by type
  const memoriesByType = (memories || []).reduce((acc, m) => {
    const type = m.memory_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(m);
    return acc;
  }, {} as Record<MemoryType, BusinessMemory[]>);

  return {
    memories: memories || [],
    activeMemories,
    inactiveMemories,
    usableMemories,
    memoriesByType,
    isLoading,
    error,
    toggleMemory,
    deleteMemory,
    isToggling: toggleMemory.isPending,
    isDeleting: deleteMemory.isPending,
    // HIPAA info
    hipaaMode,
    customerMemoryBlocked: hipaaMode,
  };
}
