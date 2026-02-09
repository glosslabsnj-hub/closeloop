import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Intake {
  id: string;
  status: string;
  created_at: string;
  intake_type: string | null;
  customers: { name: string | null } | null;
}

export function PatientIntakeQueue() {
  const { tenant } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["patient-intake-queue", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("medical_intakes")
        .select("id, status, created_at, intake_type, customers(name)")
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "in_review"])
        .order("created_at", { ascending: true })
        .limit(8);
      return (data || []) as unknown as Intake[];
    },
    enabled: !!tenant?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const intakes = data || [];

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Patient Intake Queue</p>
          {intakes.length > 0 && (
            <Badge variant="secondary" className="text-xs ml-auto">
              {intakes.length} pending
            </Badge>
          )}
        </div>
        {intakes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No pending intakes
          </p>
        ) : (
          <div className="space-y-2">
            {intakes.map((intake) => (
              <div key={intake.id} className="flex items-center gap-3 p-2.5 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {intake.customers?.name || "New Patient"}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">
                      {format(parseISO(intake.created_at), "h:mm a")}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {intake.status === "in_review" ? "In Review" : "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
