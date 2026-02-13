import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface StaffMember {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: "owner" | "manager" | "staff";
  is_active: boolean;
  hours_json: Record<string, unknown> | null;
  service_ids: string[] | null;
  calendar_connection_id: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type StaffMemberInsert = Omit<StaffMember, "id" | "tenant_id" | "created_at" | "updated_at">;
export type StaffMemberUpdate = Partial<StaffMemberInsert> & { id: string };

export function useStaffMembers() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ["staff_members", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("staff_members" as any)
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as StaffMember[];
    },
    enabled: !!tenant?.id,
  });

  const activeStaff = staffQuery.data?.filter((s) => s.is_active) ?? [];

  const createStaffMember = useMutation({
    mutationFn: async (member: StaffMemberInsert) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("staff_members" as any)
        .insert({ ...member, tenant_id: tenant.id })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as StaffMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_members", tenant?.id] });
      toast({ title: "Team member added" });
    },
    onError: () => {
      toast({ title: "Failed to add team member", variant: "destructive" });
    },
  });

  const updateStaffMember = useMutation({
    mutationFn: async ({ id, ...updates }: StaffMemberUpdate) => {
      const { data, error } = await supabase
        .from("staff_members" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as StaffMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_members", tenant?.id] });
      toast({ title: "Team member updated" });
    },
    onError: () => {
      toast({ title: "Failed to update team member", variant: "destructive" });
    },
  });

  const deleteStaffMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_members" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_members", tenant?.id] });
      toast({ title: "Team member removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove team member", variant: "destructive" });
    },
  });

  return {
    staff: staffQuery.data ?? [],
    activeStaff,
    isLoading: staffQuery.isLoading,
    error: staffQuery.error,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
  };
}
