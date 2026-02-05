import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface EstimateLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export interface PricingOption {
  id: string;
  name: string; // "Basic", "Standard", "Premium"
  description?: string;
  line_items: EstimateLineItem[];
  total_cents: number;
}

export interface Estimate {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  job_id: string | null;
  booking_id: string | null;
  estimate_number: string;
  title: string | null;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired" | "converted";
  line_items: EstimateLineItem[];
  pricing_options: PricingOption[] | null;
  selected_option: string | null;
  subtotal_cents: number | null;
  tax_rate_percent: number | null;
  tax_cents: number | null;
  discount_cents: number | null;
  total_cents: number | null;
  valid_until: string | null;
  signature_data: string | null;
  signed_at: string | null;
  pdf_url: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  terms_and_conditions: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateWithCustomer extends Estimate {
  customer?: {
    id: string;
    full_name: string | null;
    phone_e164: string | null;
    email: string | null;
  } | null;
}

export interface CreateEstimateInput {
  customer_id?: string;
  job_id?: string;
  booking_id?: string;
  title?: string;
  line_items: EstimateLineItem[];
  pricing_options?: PricingOption[];
  tax_rate_percent?: number;
  discount_cents?: number;
  valid_until?: string;
  internal_notes?: string;
  customer_notes?: string;
  terms_and_conditions?: string;
}

export interface UpdateEstimateInput extends Partial<CreateEstimateInput> {
  id: string;
  status?: Estimate["status"];
}

// Generate next estimate number
async function generateEstimateNumber(tenantId: string): Promise<string> {
  const prefix = "EST";
  const year = new Date().getFullYear().toString().slice(-2);

  try {
    const { data, error } = await supabase
      .from("estimates")
      .select("estimate_number")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return `${prefix}-${year}-0001`;
    }

    const lastNumber = data[0].estimate_number;
    const match = lastNumber.match(/(\d+)$/);
    const nextNum = match ? parseInt(match[1], 10) + 1 : 1;

    return `${prefix}-${year}-${nextNum.toString().padStart(4, "0")}`;
  } catch {
    // If table doesn't exist, return first estimate number
    return `${prefix}-${year}-0001`;
  }
}

// Calculate totals from line items
function calculateTotals(
  lineItems: EstimateLineItem[],
  taxRatePercent: number = 0,
  discountCents: number = 0
): { subtotal: number; tax: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
  const taxableAmount = subtotal - discountCents;
  const tax = Math.round((taxableAmount * taxRatePercent) / 100);
  const total = subtotal - discountCents + tax;

  return { subtotal, tax, total };
}

export function useEstimates() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all estimates for the tenant
  // Note: Gracefully handles the case where the estimates table doesn't exist yet
  const {
    data: estimates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["estimates", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      try {
        const { data, error } = await supabase
          .from("estimates")
          .select(`
            *,
            customer:customers(id, full_name, phone_e164, email)
          `)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch estimates:", error);
          return [];
        }
      return (data || []).map((item: any) => ({
        ...item,
        line_items: Array.isArray(item.line_items) ? item.line_items : [],
        pricing_options: Array.isArray(item.pricing_options) ? item.pricing_options : null,
        customer: item.customer && !item.customer.error ? item.customer : null,
      })) as EstimateWithCustomer[];
      } catch (err) {
        console.error("Failed to fetch estimates:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    retry: false, // Don't retry on failure
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Create estimate mutation
  const createEstimate = useMutation({
    mutationFn: async (input: CreateEstimateInput) => {
      if (!tenantId) throw new Error("No tenant ID");

      const estimateNumber = await generateEstimateNumber(tenantId);
      const { subtotal, tax, total } = calculateTotals(
        input.line_items,
        input.tax_rate_percent || 0,
        input.discount_cents || 0
      );

      const { data, error } = await supabase
        .from("estimates")
        .insert({
          tenant_id: tenantId as string,
          customer_id: input.customer_id || null,
          job_id: input.job_id || null,
          booking_id: input.booking_id || null,
          estimate_number: estimateNumber,
          title: input.title || null,
          status: "draft",
          line_items: input.line_items as unknown as any,
          pricing_options: (input.pricing_options || null) as unknown as any,
          subtotal_cents: subtotal,
          tax_rate_percent: input.tax_rate_percent || 0,
          tax_cents: tax,
          discount_cents: input.discount_cents || 0,
          total_cents: total,
          valid_until: input.valid_until || null,
          internal_notes: input.internal_notes || null,
          customer_notes: input.customer_notes || null,
          terms_and_conditions: input.terms_and_conditions || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates", tenantId] });
      toast({ title: "Estimate created", description: "Your estimate has been saved as a draft." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update estimate mutation
  const updateEstimate = useMutation({
    mutationFn: async (input: UpdateEstimateInput) => {
      const { id, ...updates } = input;

      // Recalculate totals if line items changed
      let totals = {};
      if (updates.line_items) {
        const calculated = calculateTotals(
          updates.line_items,
          updates.tax_rate_percent || 0,
          updates.discount_cents || 0
        );
        totals = {
          subtotal_cents: calculated.subtotal,
          tax_cents: calculated.tax,
          total_cents: calculated.total,
        };
      }

      const { data, error } = await supabase
        .from("estimates")
        .update({
          ...(updates as any),
          ...totals,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates", tenantId] });
      toast({ title: "Estimate updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Send estimate to customer via email
  const sendEstimate = useMutation({
    mutationFn: async ({ estimateId }: { estimateId: string; email?: string }) => {
      // Call the edge function to send the email
      const { data, error } = await supabase.functions.invoke("estimate-send-email", {
        body: { estimate_id: estimateId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to send estimate");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates", tenantId] });
      toast({ title: "Estimate sent", description: "The customer will receive an email with the estimate." });
    },
    onError: (error) => {
      toast({ title: "Error sending estimate", description: error.message, variant: "destructive" });
    },
  });

  // Delete estimate
  const deleteEstimate = useMutation({
    mutationFn: async (estimateId: string) => {
      const { error } = await supabase
        .from("estimates")
        .delete()
        .eq("id", estimateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates", tenantId] });
      toast({ title: "Estimate deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate stats
  const stats = {
    total: estimates.length,
    draft: estimates.filter((e) => e.status === "draft").length,
    sent: estimates.filter((e) => e.status === "sent").length,
    viewed: estimates.filter((e) => e.status === "viewed").length,
    accepted: estimates.filter((e) => e.status === "accepted").length,
    declined: estimates.filter((e) => e.status === "declined").length,
    totalValue: estimates
      .filter((e) => e.status === "accepted")
      .reduce((sum, e) => sum + (e.total_cents || 0), 0),
  };

  return {
    estimates,
    isLoading,
    error,
    stats,
    refetch,
    createEstimate,
    updateEstimate,
    sendEstimate,
    deleteEstimate,
  };
}

export function useEstimate(estimateId: string | undefined) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;

  return useQuery({
    queryKey: ["estimate", estimateId],
    queryFn: async () => {
      if (!estimateId || !tenantId) return null;

      const { data, error } = await supabase
        .from("estimates")
        .select(`
          *,
          customer:customers(id, full_name, phone_e164, email)
        `)
        .eq("id", estimateId)
        .eq("tenant_id", tenantId)
        .single();

      if (error) throw error;
      const result = {
        ...(data as any),
        line_items: Array.isArray((data as any).line_items) ? (data as any).line_items : [],
        pricing_options: Array.isArray((data as any).pricing_options) ? (data as any).pricing_options : null,
        customer: (data as any).customer && !((data as any).customer as any).error ? (data as any).customer : null,
      };
      return result as unknown as EstimateWithCustomer;
    },
    enabled: !!estimateId && !!tenantId,
  });
}
