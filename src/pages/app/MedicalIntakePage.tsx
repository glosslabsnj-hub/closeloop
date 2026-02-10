import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/patterns/FilterBar";
import { ContentLoadingState } from "@/components/patterns/ContentLoadingState";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Stethoscope,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const urgencyColors: Record<string, string> = {
  routine: "bg-muted text-muted-foreground",
  soon: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  urgent: "bg-destructive/10 text-destructive",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  completed: "bg-green-500/10 text-green-700 dark:text-green-300",
  cancelled: "bg-muted text-muted-foreground",
};

export default function MedicalIntakePage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["medical_intake"]);

  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: intakes, isLoading } = useQuery({
    queryKey: ["medical-intakes", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("medical_intakes")
        .select("*, customers(full_name, phone_e164), ai_call_sessions(started_at)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("medical_intakes")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-intakes"] });
      toast({ title: "Intake status updated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const filteredIntakes = useMemo(() => {
    return (intakes || []).filter(intake =>
      statusFilter === "all" || intake.status === statusFilter
    );
  }, [intakes, statusFilter]);

  const urgentIntakes = intakes?.filter(i =>
    i.urgency_level === "urgent" && i.status === "pending"
  ) || [];

  if (moduleLoading || !isAllowed || isLoading) {
    return (
      <PageContainer maxWidth="xl">
        <ContentLoadingState variant="table" count={6} columns={8} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <div className="space-y-6">
        <PageHeader
          icon={Stethoscope}
          title="Medical Intake"
          description="Review patient intake requests from AI calls"
          action={
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              HIPAA Mode
            </Badge>
          }
        />

        {/* Urgent Alert */}
        {urgentIntakes.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {urgentIntakes.length} Urgent Intake{urgentIntakes.length > 1 ? "s" : ""} Pending
                  </p>
                  <p className="text-sm text-muted-foreground">
                    These patients requested urgent appointments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pending Review</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {intakes?.filter(i => i.status === "pending").length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Scheduled</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {intakes?.filter(i => i.status === "scheduled").length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">New Patients</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {intakes?.filter(i => i.intake_type === "new_patient").length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">With Consent</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {intakes?.filter(i => i.verbal_consent_given).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <FilterBar
          filters={[
            {
              key: "status",
              label: "Status",
              options: [
                { value: "all", label: "All Intakes" },
                { value: "pending", label: "Pending Review" },
                { value: "scheduled", label: "Scheduled" },
                { value: "completed", label: "Completed" },
                { value: "cancelled", label: "Cancelled" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
        />

        {/* Intakes Table */}
        {filteredIntakes.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No patient intakes yet"
            description={
              statusFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "When patients call and provide intake information, it will appear here."
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Preferred Date</TableHead>
                    <TableHead>Consent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIntakes.map((intake) => (
                    <TableRow key={intake.id}>
                      <TableCell>
                        {format(new Date(intake.created_at), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {(intake.intake_type || "unknown").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={urgencyColors[intake.urgency_level || "routine"] || ""}>
                          {intake.urgency_level || "routine"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {intake.reason_for_visit || "-"}
                      </TableCell>
                      <TableCell>
                        {intake.preferred_date
                          ? format(new Date(intake.preferred_date), "MMM d, yyyy")
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {intake.verbal_consent_given ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[intake.status] || ""}>
                          {intake.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={intake.status}
                          onValueChange={(status) =>
                            updateStatusMutation.mutate({ id: intake.id, status })
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Privacy Notice */}
        <Card className="border-muted bg-muted/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">HIPAA Compliance Notice</p>
                <p className="text-sm text-muted-foreground">
                  Full call transcripts and recordings are not stored by default. Only structured intake
                  data and AI summaries are retained. Adjust retention settings in Medical Settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
