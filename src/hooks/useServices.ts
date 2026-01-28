import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Service = Database["public"]["Tables"]["services"]["Row"];
type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];
type ServiceUpdate = Database["public"]["Tables"]["services"]["Update"];

export function useServices() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ["services", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!tenant?.id,
  });

  const createService = useMutation({
    mutationFn: async (service: Omit<ServiceInsert, "tenant_id">) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const { data, error } = await supabase
        .from("services")
        .insert({ ...service, tenant_id: tenant.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", tenant?.id] });
      toast({ title: "Service created", description: "New service added successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...updates }: ServiceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", tenant?.id] });
      toast({ title: "Service updated", description: "Changes saved successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", tenant?.id] });
      toast({ title: "Service deleted", description: "Service removed successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleServiceActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("services")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["services", tenant?.id] });
      toast({
        title: data.is_active ? "Service enabled" : "Service disabled",
        description: `${data.name} is now ${data.is_active ? "visible" : "hidden"} to customers.`,
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    services: servicesQuery.data ?? [],
    activeServices: servicesQuery.data?.filter((s) => s.is_active) ?? [],
    isLoading: servicesQuery.isLoading,
    error: servicesQuery.error,
    createService,
    updateService,
    deleteService,
    toggleServiceActive,
    refetch: servicesQuery.refetch,
  };
}
