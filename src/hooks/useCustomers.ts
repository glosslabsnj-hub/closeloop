 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { useToast } from "@/hooks/use-toast";
 
export interface Customer {
  id: string;
  tenant_id: string;
  full_name: string;
  phone_e164: string;
  phone_raw: string | null;
  email: string | null;
  notes: string | null;
  tags: string[] | null;
  source: string | null;
  service_address: string | null;
  lead_status: string | null;
  created_at: string;
  updated_at: string;
}
 
export interface CreateCustomerInput {
  full_name: string;
  phone_e164: string;
  phone_raw?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  source?: string;
  service_address?: string;
}
 
 export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
   id: string;
 }
 
 export function useCustomers() {
   const { tenant } = useAuth();
   const tenantId = tenant?.id ?? null;
   const { toast } = useToast();
   const queryClient = useQueryClient();
 
   const {
     data: customers = [],
     isLoading,
     error,
     refetch,
   } = useQuery({
     queryKey: ["customers", tenantId],
     queryFn: async () => {
       if (!tenantId) return [];
 
       const { data, error } = await supabase
         .from("customers")
         .select("*")
         .eq("tenant_id", tenantId)
         .order("full_name", { ascending: true });
 
       if (error) {
         console.error("Failed to fetch customers:", error);
         return [];
       }
       return data as Customer[];
     },
     enabled: !!tenantId,
     staleTime: 30000,
   });
 
   const createCustomer = useMutation({
     mutationFn: async (input: CreateCustomerInput) => {
       if (!tenantId) throw new Error("No tenant ID");
 
        const { data, error } = await supabase
          .from("customers")
          .insert({
            tenant_id: tenantId,
            full_name: input.full_name,
            phone_e164: input.phone_e164,
            phone_raw: input.phone_raw || null,
            email: input.email || null,
            notes: input.notes || null,
            tags: input.tags || null,
            source: input.source || null,
            service_address: input.service_address || null,
          })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
       toast({ title: "Contact added" });
     },
     onError: (error) => {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     },
   });
 
   const updateCustomer = useMutation({
     mutationFn: async (input: UpdateCustomerInput) => {
       const { id, ...updates } = input;
 
       const { data, error } = await supabase
         .from("customers")
         .update({
           ...updates,
           updated_at: new Date().toISOString(),
         })
         .eq("id", id)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
       toast({ title: "Customer updated" });
     },
     onError: (error) => {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     },
   });
 
   const deleteCustomer = useMutation({
     mutationFn: async (customerId: string) => {
       const { error } = await supabase
         .from("customers")
         .delete()
         .eq("id", customerId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
       toast({ title: "Customer deleted" });
     },
     onError: (error) => {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     },
   });
 
   return {
     customers,
     isLoading,
     error,
     refetch,
     createCustomer,
     updateCustomer,
     deleteCustomer,
   };
 }