import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";

/**
 * WelcomeBanner - Shows after onboarding, celebrates what was set up
 * and gives the user context about what their AI already knows.
 */
export function WelcomeBanner() {
  const { tenant } = useAuth();
  const { services } = useServices();

  const activeServices = (services || []).filter((s) => s.is_active !== false);
  const hoursConfigured =
    !!tenant?.hours_json &&
    Object.keys((tenant?.hours_json as Record<string, unknown>) || {}).length > 0;

  // Fetch FAQ count
  const { data: faqCount = 0 } = useQuery({
    queryKey: ["welcome-faqs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("business_faqs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // Build "AI already knows" items
  const knowledgeItems = useMemo(() => {
    const items: string[] = [];
    if (activeServices.length > 0) {
      items.push(`${activeServices.length} service${activeServices.length !== 1 ? "s" : ""}`);
    }
    if (faqCount > 0) {
      items.push(`${faqCount} FAQ${faqCount !== 1 ? "s" : ""}`);
    }
    if (hoursConfigured) {
      items.push("business hours");
    }
    return items;
  }, [activeServices.length, faqCount, hoursConfigured]);

  return (
    <div className="text-center space-y-3">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
        Welcome, {tenant?.name || "there"}
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        Let's get your AI assistant ready to answer calls and book customers.
      </p>
      {knowledgeItems.length > 0 && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm">
          <Check className="h-4 w-4" />
          <span>
            Your AI already knows: {knowledgeItems.join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}
