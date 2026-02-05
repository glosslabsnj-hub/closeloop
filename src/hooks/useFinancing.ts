import { useState } from "react";
 import { useQuery } from "@tanstack/react-query";
 import { useAuth } from "@/contexts/AuthContext";
 
 export interface FinancingOption {
   id: string;
   tenant_id: string;
   name: string;
   provider: string;
   min_amount_cents: number;
   max_amount_cents: number;
   terms_months: number[];
   apr_percent: number;
   is_enabled: boolean;
   created_at: string;
 }
 
 export function formatFinancingTerms(option: FinancingOption): string {
   const terms = option.terms_months.join(", ");
   return `${option.name} - ${terms} months at ${option.apr_percent}% APR`;
 }
 
export function formatFinancingAmount(cents: number): string {
  const amount = cents / 100;
  // Estimate monthly payment for 12 months at 0% APR
  const monthly = Math.round(amount / 12);
  return `As low as $${monthly}/mo`;
}

 export function useFinancing() {
   const { tenant } = useAuth();
   const tenantId = tenant?.id ?? null;
 
   const {
     data: options = [],
     isLoading,
     error,
   } = useQuery({
     queryKey: ["financing_options", tenantId],
     queryFn: async () => {
      // Financing options table may not exist yet - return empty for now
      return [] as FinancingOption[];
     },
     enabled: !!tenantId,
     retry: false,
     staleTime: 60000,
   });
 
  // Stub function for creating financing application
  const [isCreatingApplication, setIsCreatingApplication] = useState(false);

  const createApplication = async (_estimateId: string) => {
    console.log("Financing application would be created");
    return { success: false, message: "Financing not configured" };
  };

  const createApplicationMutation = {
    mutateAsync: async (_params: {
      customer_id: string;
      estimate_id?: string;
      amount_cents: number;
      customer_email: string;
      customer_phone?: string;
      customer_name?: string;
      description?: string;
    }) => {
      setIsCreatingApplication(true);
      try {
        return await createApplication(_params.estimate_id || "");
      } finally {
        setIsCreatingApplication(false);
      }
    },
    isPending: isCreatingApplication,
  };

   return {
     options,
     isLoading,
     error,
    isConnected: options.length > 0,
    createApplication: createApplicationMutation,
   };
 }