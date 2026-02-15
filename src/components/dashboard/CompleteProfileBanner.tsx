import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function CompleteProfileBanner() {
  const { tenant } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const { data: a2pRecord } = useQuery({
    queryKey: ["a2p-registration", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("a2p_registrations")
        .select("legal_business_name, ein, entity_type, street_address, status")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.id,
  });

  // Check if A2P data is incomplete
  const isIncomplete = !a2pRecord?.legal_business_name || !a2pRecord?.ein || !a2pRecord?.entity_type || !a2pRecord?.street_address;

  if (dismissed || !isIncomplete || !tenant) return null;

  return (
    <div className="relative rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Complete your business profile to send SMS messages</p>
        <p className="text-xs text-muted-foreground mt-1">
          We need your legal business name, EIN, and address for carrier compliance. Your AI voice agent works without this — SMS messaging requires it.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 gap-1.5"
          onClick={() => navigate("/app/settings?tab=sms-compliance")}
        >
          Complete Profile
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
