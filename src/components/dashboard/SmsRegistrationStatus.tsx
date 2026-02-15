import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline"; description: string }> = {
  pending_data: {
    label: "SMS: Data Needed",
    icon: AlertCircle,
    variant: "outline",
    description: "Complete your business identity to activate SMS",
  },
  pending_profile: {
    label: "SMS: Verifying",
    icon: Loader2,
    variant: "secondary",
    description: "Your business profile is being verified (usually minutes)",
  },
  pending_brand: {
    label: "SMS: Registering",
    icon: Clock,
    variant: "secondary",
    description: "Brand registration in progress (usually hours)",
  },
  pending_campaign: {
    label: "SMS: Pending Approval",
    icon: Clock,
    variant: "secondary",
    description: "Campaign under carrier review (1-3 business days)",
  },
  approved: {
    label: "SMS: Active",
    icon: CheckCircle2,
    variant: "default",
    description: "SMS messaging is fully active on your number",
  },
  failed: {
    label: "SMS: Failed",
    icon: AlertCircle,
    variant: "destructive",
    description: "Registration failed — check details or contact support",
  },
};

export function SmsRegistrationStatus() {
  const { tenant } = useAuth();

  const { data: a2pStatus } = useQuery({
    queryKey: ["a2p-status", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("a2p_registrations")
        .select("status, failure_reason, brand_score")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
    refetchInterval: 60_000, // Poll every minute
  });

  if (!a2pStatus) return null;

  const config = STATUS_CONFIG[a2pStatus.status] || STATUS_CONFIG.pending_data;
  const Icon = config.icon;
  const isAnimating = ["pending_profile", "pending_brand", "pending_campaign"].includes(a2pStatus.status);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="gap-1.5 cursor-help">
            <Icon className={`h-3 w-3 ${isAnimating ? "animate-spin" : ""}`} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{config.description}</p>
          {a2pStatus.failure_reason && (
            <p className="mt-1 text-xs text-destructive">{a2pStatus.failure_reason}</p>
          )}
          {a2pStatus.brand_score && (
            <p className="mt-1 text-xs">Brand trust score: {a2pStatus.brand_score}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
