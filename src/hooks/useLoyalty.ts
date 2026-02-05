import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface LoyaltyProgram {
  id: string;
  tenant_id: string;
  name: string;
  points_per_dollar: number;
  points_for_signup: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyReward {
  id: string;
  tenant_id: string;
  program_id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: "discount" | "free_item" | "percentage_off";
  reward_value_cents: number | null;
  reward_percentage: number | null;
  is_active: boolean;
  created_at: string;
}

export interface LoyaltyBalance {
  id: string;
  tenant_id: string;
  customer_id: string;
  program_id: string;
  points_balance: number;
  lifetime_points: number;
  tier: "member" | "silver" | "gold" | "platinum";
  joined_at: string;
  updated_at: string;
  customer?: {
    id: string;
    full_name: string | null;
    phone_e164: string | null;
    email: string | null;
  };
}

export interface LoyaltyTransaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  program_id: string;
  transaction_type: "earn" | "redeem" | "adjust" | "expire";
  points: number;
  order_id: string | null;
  reward_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateRewardInput {
  name: string;
  description?: string;
  points_required: number;
  reward_type: LoyaltyReward["reward_type"];
  reward_value_cents?: number;
  reward_percentage?: number;
}

export interface EarnPointsInput {
  customer_id: string;
  points: number;
  order_id?: string;
  notes?: string;
}

export interface RedeemPointsInput {
  customer_id: string;
  reward_id: string;
  notes?: string;
}

export function useLoyalty() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch or create loyalty program for tenant
  const {
    data: program,
    isLoading: programLoading,
  } = useQuery({
    queryKey: ["loyalty_program", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      if (error && error.code === "PGRST116") {
        // No program exists, create one
        const { data: newProgram, error: createError } = await supabase
          .from("loyalty_programs")
          .insert({
            tenant_id: tenantId,
            name: "Rewards Program",
            points_per_dollar: 1,
            points_for_signup: 100,
            is_active: true,
          })
          .select()
          .single();

        if (createError) {
          console.error("Failed to create loyalty program:", createError);
          return null;
        }
        return newProgram as LoyaltyProgram;
      }

      if (error) {
        console.error("Failed to fetch loyalty program:", error);
        return null;
      }

      return data as LoyaltyProgram;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  // Fetch rewards
  const {
    data: rewards = [],
    isLoading: rewardsLoading,
  } = useQuery({
    queryKey: ["loyalty_rewards", tenantId, program?.id],
    queryFn: async () => {
      if (!tenantId || !program?.id) return [];

      const { data, error } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("program_id", program.id)
        .eq("is_active", true)
        .order("points_required");

      if (error) {
        console.error("Failed to fetch loyalty rewards:", error);
        return [];
      }

      return data as LoyaltyReward[];
    },
    enabled: !!tenantId && !!program?.id,
    staleTime: 30000,
  });

  // Fetch member balances
  const {
    data: members = [],
    isLoading: membersLoading,
  } = useQuery({
    queryKey: ["loyalty_balances", tenantId, program?.id],
    queryFn: async () => {
      if (!tenantId || !program?.id) return [];

      const { data, error } = await supabase
        .from("loyalty_balances")
        .select(`
          *,
          customer:customers(id, full_name, phone_e164, email)
        `)
        .eq("program_id", program.id)
        .order("points_balance", { ascending: false });

      if (error) {
        console.error("Failed to fetch loyalty balances:", error);
        return [];
      }

      return data as LoyaltyBalance[];
    },
    enabled: !!tenantId && !!program?.id,
    staleTime: 30000,
  });

  // Update program settings
  const updateProgram = useMutation({
    mutationFn: async (updates: Partial<LoyaltyProgram>) => {
      if (!program?.id) throw new Error("No program");

      const { data, error } = await supabase
        .from("loyalty_programs")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", program.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty_program", tenantId] });
      toast({ title: "Program updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create reward
  const createReward = useMutation({
    mutationFn: async (input: CreateRewardInput) => {
      if (!tenantId || !program?.id) throw new Error("No program");

      const { data, error } = await supabase
        .from("loyalty_rewards")
        .insert({
          tenant_id: tenantId,
          program_id: program.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty_rewards", tenantId] });
      toast({ title: "Reward created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Earn points
  const earnPoints = useMutation({
    mutationFn: async (input: EarnPointsInput) => {
      if (!tenantId || !program?.id) throw new Error("No program");

      // Get or create balance
      let { data: balance } = await supabase
        .from("loyalty_balances")
        .select("*")
        .eq("customer_id", input.customer_id)
        .eq("program_id", program.id)
        .single();

      if (!balance) {
        const { data: newBalance, error: createError } = await supabase
          .from("loyalty_balances")
          .insert({
            tenant_id: tenantId,
            customer_id: input.customer_id,
            program_id: program.id,
            points_balance: 0,
            lifetime_points: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        balance = newBalance;
      }

      // Update balance
      await supabase
        .from("loyalty_balances")
        .update({
          points_balance: balance.points_balance + input.points,
          lifetime_points: balance.lifetime_points + input.points,
          updated_at: new Date().toISOString(),
        })
        .eq("id", balance.id);

      // Record transaction
      const { data, error } = await supabase
        .from("loyalty_transactions")
        .insert({
          tenant_id: tenantId,
          customer_id: input.customer_id,
          program_id: program.id,
          transaction_type: "earn",
          points: input.points,
          order_id: input.order_id || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty_balances", tenantId] });
      toast({ title: "Points earned" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Redeem points
  const redeemPoints = useMutation({
    mutationFn: async (input: RedeemPointsInput) => {
      if (!tenantId || !program?.id) throw new Error("No program");

      // Get reward
      const reward = rewards.find((r) => r.id === input.reward_id);
      if (!reward) throw new Error("Reward not found");

      // Get balance
      const { data: balance, error: balanceError } = await supabase
        .from("loyalty_balances")
        .select("*")
        .eq("customer_id", input.customer_id)
        .eq("program_id", program.id)
        .single();

      if (balanceError || !balance) throw new Error("Customer not enrolled in loyalty program");
      if (balance.points_balance < reward.points_required) throw new Error("Insufficient points");

      // Update balance
      await supabase
        .from("loyalty_balances")
        .update({
          points_balance: balance.points_balance - reward.points_required,
          updated_at: new Date().toISOString(),
        })
        .eq("id", balance.id);

      // Record transaction
      const { data, error } = await supabase
        .from("loyalty_transactions")
        .insert({
          tenant_id: tenantId,
          customer_id: input.customer_id,
          program_id: program.id,
          transaction_type: "redeem",
          points: -reward.points_required,
          reward_id: reward.id,
          notes: input.notes || `Redeemed: ${reward.name}`,
        })
        .select()
        .single();

      if (error) throw error;
      return { transaction: data, reward };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["loyalty_balances", tenantId] });
      toast({ title: "Reward redeemed", description: data.reward.name });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Get customer balance
  const getCustomerBalance = (customerId: string) => {
    return members.find((m) => m.customer_id === customerId);
  };

  return {
    program,
    rewards,
    members,
    isLoading: programLoading || rewardsLoading || membersLoading,
    updateProgram,
    createReward,
    earnPoints,
    redeemPoints,
    getCustomerBalance,
  };
}
