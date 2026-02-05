import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ServiceAgreement {
  id: string;
  tenant_id: string;
  customer_id: string;
  agreement_number: string;
  plan_name: string;
  plan_type: string | null;
  price_cents: number;
  billing_frequency: string;
  start_date: string;
  end_date: string | null;
  renewal_date: string | null;
  next_service_date: string | null;
  auto_renew: boolean;
  status: "active" | "expired" | "cancelled" | "pending" | "pending_renewal";
  services_included: string[];
  visits_per_year: number;
  visits_used: number;
  discount_percent: number;
  priority_service: boolean;
  internal_notes: string | null;
  customer_notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceAgreementWithCustomer extends ServiceAgreement {
  customer?: {
    id: string;
    full_name: string | null;
    phone_e164: string | null;
    email: string | null;
  } | null;
}

export interface CreateAgreementInput {
  customer_id: string;
  plan_name: string;
  plan_type?: string;
  price_cents: number;
  billing_frequency?: string;
  start_date: string;
  end_date?: string;
  auto_renew?: boolean;
  services_included?: string[];
  visits_per_year?: number;
  discount_percent?: number;
  priority_service?: boolean;
  internal_notes?: string;
  customer_notes?: string;
  terms?: string;
}

export interface UpdateAgreementInput extends Partial<CreateAgreementInput> {
  id: string;
  status?: ServiceAgreement["status"];
  visits_used?: number;
  next_service_date?: string;
}

// Generate next agreement number
async function generateAgreementNumber(tenantId: string): Promise<string> {
  const prefix = "AGR";
  const year = new Date().getFullYear().toString().slice(-2);

  try {
    const { data, error } = await supabase
      .from("service_agreements")
      .select("agreement_number")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return `${prefix}-${year}-0001`;
    }

    const lastNumber = data[0].agreement_number;
    const match = lastNumber.match(/(\d+)$/);
    const nextNum = match ? parseInt(match[1], 10) + 1 : 1;

    return `${prefix}-${year}-${nextNum.toString().padStart(4, "0")}`;
  } catch {
    return `${prefix}-${year}-0001`;
  }
}

// Calculate renewal date based on billing frequency
function calculateRenewalDate(startDate: string, billingFrequency: string): string {
  const start = new Date(startDate);

  switch (billingFrequency) {
    case "monthly":
      start.setMonth(start.getMonth() + 1);
      break;
    case "quarterly":
      start.setMonth(start.getMonth() + 3);
      break;
    case "annually":
      start.setFullYear(start.getFullYear() + 1);
      break;
    default:
      start.setMonth(start.getMonth() + 1);
  }

  return start.toISOString().split("T")[0];
}

export function useServiceAgreements() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all agreements for the tenant
  const {
    data: agreements = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["service_agreements", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      try {
        const { data, error } = await supabase
          .from("service_agreements")
          .select(`
            *,
            customer:customers(id, full_name, phone_e164, email)
          `)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch service agreements:", error);
          return [];
        }
      return (data || []).map((item: any) => ({
        ...item,
        // Provide defaults for fields that may not exist in DB yet
        next_service_date: item.next_service_date || null,
        visits_per_year: item.visits_per_year ?? 1,
        visits_used: item.visits_used ?? 0,
        priority_service: item.priority_service ?? false,
        discount_percent: item.discount_percent ?? 0,
        services_included: Array.isArray(item.services_included) ? item.services_included : [],
        customer: item.customer && !item.customer.error ? item.customer : null,
      })) as ServiceAgreementWithCustomer[];
      } catch (err) {
        console.error("Failed to fetch service agreements:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    retry: false,
    staleTime: 30 * 1000,
  });

  // Create agreement mutation
  const createAgreement = useMutation({
    mutationFn: async (input: CreateAgreementInput) => {
      if (!tenantId) throw new Error("No tenant ID");

      const agreementNumber = await generateAgreementNumber(tenantId);
      const renewalDate = calculateRenewalDate(
        input.start_date,
        input.billing_frequency || "monthly"
      );

      const { data, error } = await supabase
        .from("service_agreements")
        .insert({
          tenant_id: tenantId,
          customer_id: input.customer_id,
          agreement_number: agreementNumber,
          plan_name: input.plan_name,
          plan_type: input.plan_type || "maintenance",
          price_cents: input.price_cents,
          billing_frequency: input.billing_frequency || "monthly",
          start_date: input.start_date,
          end_date: input.end_date || null,
          renewal_date: renewalDate,
          auto_renew: input.auto_renew ?? true,
          status: "active",
          services_included: input.services_included || [],
          visits_per_year: input.visits_per_year || 1,
          visits_used: 0,
          discount_percent: input.discount_percent || 0,
          priority_service: input.priority_service || false,
          internal_notes: input.internal_notes || null,
          customer_notes: input.customer_notes || null,
          terms: input.terms || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_agreements", tenantId] });
      toast({ title: "Agreement created", description: "Service agreement has been created successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update agreement mutation
  const updateAgreement = useMutation({
    mutationFn: async (input: UpdateAgreementInput) => {
      const { id, ...updates } = input;

      // Recalculate renewal date if billing frequency or start date changed
      if (updates.billing_frequency || updates.start_date) {
        const agreement = agreements.find((a) => a.id === id);
        if (agreement) {
          const startDate = updates.start_date || agreement.start_date;
          const frequency = updates.billing_frequency || agreement.billing_frequency;
          (updates as any).renewal_date = calculateRenewalDate(startDate, frequency);
        }
      }

      const { data, error } = await supabase
        .from("service_agreements")
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
      queryClient.invalidateQueries({ queryKey: ["service_agreements", tenantId] });
      toast({ title: "Agreement updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Cancel agreement
  const cancelAgreement = useMutation({
    mutationFn: async (agreementId: string) => {
      const { data, error } = await supabase
        .from("service_agreements")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", agreementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_agreements", tenantId] });
      toast({ title: "Agreement cancelled" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete agreement
  const deleteAgreement = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase
        .from("service_agreements")
        .delete()
        .eq("id", agreementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_agreements", tenantId] });
      toast({ title: "Agreement deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Record a service visit
  const recordVisit = useMutation({
    mutationFn: async ({ agreementId, nextServiceDate }: { agreementId: string; nextServiceDate?: string }) => {
      const agreement = agreements.find((a) => a.id === agreementId);
      if (!agreement) throw new Error("Agreement not found");

      const { data, error } = await supabase
        .from("service_agreements")
        .update({
          visits_used: agreement.visits_used + 1,
          next_service_date: nextServiceDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agreementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_agreements", tenantId] });
      toast({ title: "Visit recorded" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate stats
  const stats = {
    total: agreements.length,
    active: agreements.filter((a) => a.status === "active").length,
    pendingRenewal: agreements.filter((a) => a.status === "pending_renewal").length,
    expired: agreements.filter((a) => a.status === "expired").length,
    cancelled: agreements.filter((a) => a.status === "cancelled").length,
    monthlyRecurringRevenue: agreements
      .filter((a) => a.status === "active")
      .reduce((sum, a) => {
        // Normalize to monthly
        let monthly = a.price_cents;
        if (a.billing_frequency === "quarterly") monthly = a.price_cents / 3;
        if (a.billing_frequency === "annually") monthly = a.price_cents / 12;
        return sum + monthly;
      }, 0),
    upcomingRenewals: agreements.filter((a) => {
      if (a.status !== "active" || !a.renewal_date) return false;
      const renewalDate = new Date(a.renewal_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return renewalDate <= thirtyDaysFromNow;
    }).length,
  };

  return {
    agreements,
    isLoading,
    error,
    stats,
    refetch,
    createAgreement,
    updateAgreement,
    cancelAgreement,
    deleteAgreement,
    recordVisit,
  };
}

export function useServiceAgreement(agreementId: string | undefined) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;

  return useQuery({
    queryKey: ["service_agreement", agreementId],
    queryFn: async () => {
      if (!agreementId || !tenantId) return null;

      const { data, error } = await supabase
        .from("service_agreements")
        .select(`
          *,
          customer:customers(id, full_name, phone_e164, email)
        `)
        .eq("id", agreementId)
        .eq("tenant_id", tenantId)
        .single();

      if (error) throw error;
      const d = data as any;
      const result = {
        ...d,
        next_service_date: d.next_service_date || null,
        visits_per_year: d.visits_per_year ?? 1,
        visits_used: d.visits_used ?? 0,
        priority_service: d.priority_service ?? false,
        discount_percent: d.discount_percent ?? 0,
        services_included: Array.isArray(d.services_included) ? d.services_included : [],
        internal_notes: d.internal_notes || null,
        customer_notes: d.customer_notes || null,
        terms: d.terms || null,
        customer: d.customer && !(d.customer as any).error ? d.customer : null,
      };
      return result as unknown as ServiceAgreementWithCustomer;
    },
    enabled: !!agreementId && !!tenantId,
  });
}
