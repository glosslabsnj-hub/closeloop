import { useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Stethoscope,
  Phone,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Loader2,
  Pill,
  User,
  MapPin,
  CreditCard,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  // P0-3: Route protection - redirect if medical_intake module not enabled
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["medical_intake"]);
  
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedIntake, setSelectedIntake] = useState<any | null>(null);

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

      // Trigger patient notification on status change
      if (tenant?.id) {
        await supabase.functions.invoke("universal-delivery", {
          body: { tenant_id: tenant.id, entity_type: "intake", entity_id: id, event: status },
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-intakes"] });
      toast({ title: "Intake status updated" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Couldn't update intake", description: "Please try again." });
    },
  });

  const filteredIntakes = intakes?.filter(intake => 
    statusFilter === "all" || intake.status === statusFilter
  ) || [];

  const urgentIntakes = intakes?.filter(i => 
    i.urgency_level === "urgent" && i.status === "pending"
  ) || [];

  // Show loading while checking module access
  if (moduleLoading || !isAllowed) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="loading medical intakes">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medical Intake</h1>
          <p className="text-muted-foreground">Review patient intake requests from AI calls</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Shield className="h-3 w-3" />
          Patient Privacy
        </Badge>
      </div>

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

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Intakes</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredIntakes.length} intake{filteredIntakes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Intakes Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
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
              {filteredIntakes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Stethoscope className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium">No patient intakes yet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {statusFilter !== "all"
                          ? "Try adjusting your filters."
                          : "When patients call and provide intake information, it will appear here."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredIntakes.map((intake) => (
                  <TableRow key={intake.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedIntake(intake)}>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-muted bg-muted/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Patient Privacy Notice</p>
              <p className="text-sm text-muted-foreground">
                Full call transcripts and recordings are not stored by default. Only structured intake 
                data and AI summaries are retained. Adjust retention settings in Medical Settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Intake Detail Sheet */}
      <Sheet open={!!selectedIntake} onOpenChange={(open) => !open && setSelectedIntake(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedIntake && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Intake Details
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                {/* Status & Urgency */}
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[selectedIntake.status] || ""}>{selectedIntake.status}</Badge>
                  <Badge className={urgencyColors[selectedIntake.urgency_level || "routine"] || ""}>{selectedIntake.urgency_level || "routine"}</Badge>
                  <Badge variant="outline" className="capitalize">{(selectedIntake.intake_type || "unknown").replace(/_/g, " ")}</Badge>
                </div>

                {/* Patient Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Patient Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Name</p>
                      <p className="font-medium">{selectedIntake.customers?.full_name || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Phone</p>
                      <p className="font-medium font-mono">{selectedIntake.customers?.phone_e164 || "-"}</p>
                    </div>
                    {selectedIntake.date_of_birth && (
                      <div>
                        <p className="text-muted-foreground text-xs">Date of Birth</p>
                        <p className="font-medium">{format(new Date(selectedIntake.date_of_birth), "MMM d, yyyy")}</p>
                      </div>
                    )}
                    {selectedIntake.patient_address && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</p>
                        <p className="font-medium">{selectedIntake.patient_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visit Details */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Visit Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Reason for Visit</p>
                      <p className="font-medium">{selectedIntake.reason_for_visit || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Preferred Date</p>
                      <p className="font-medium">
                        {selectedIntake.preferred_date ? format(new Date(selectedIntake.preferred_date), "MMM d, yyyy") : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Consent Given</p>
                      <p className="font-medium">{selectedIntake.verbal_consent_given ? "Yes" : "No"}</p>
                    </div>
                    {selectedIntake.referring_provider && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">Referring Provider</p>
                        <p className="font-medium">{selectedIntake.referring_provider}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Insurance */}
                {selectedIntake.insurance_member_id && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" /> Insurance</h4>
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">Member ID</p>
                      <p className="font-medium font-mono">{selectedIntake.insurance_member_id}</p>
                    </div>
                  </div>
                )}

                {/* Medical Info */}
                {(selectedIntake.allergies || selectedIntake.current_medications) && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2"><Pill className="h-4 w-4" /> Medical Info</h4>
                    <div className="grid gap-3 text-sm">
                      {selectedIntake.allergies && (
                        <div>
                          <p className="text-muted-foreground text-xs">Allergies</p>
                          <p className="font-medium">{selectedIntake.allergies}</p>
                        </div>
                      )}
                      {selectedIntake.current_medications && (
                        <div>
                          <p className="text-muted-foreground text-xs">Current Medications</p>
                          <p className="font-medium">{selectedIntake.current_medications}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pharmacy */}
                {selectedIntake.pharmacy_name && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Pharmacy</h4>
                    <div className="text-sm">
                      <p className="font-medium">{selectedIntake.pharmacy_name}</p>
                      {selectedIntake.pharmacy_phone && <p className="text-muted-foreground font-mono">{selectedIntake.pharmacy_phone}</p>}
                    </div>
                  </div>
                )}

                {/* Call Info */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Submitted</p>
                      <p className="font-medium">{format(new Date(selectedIntake.created_at), "MMM d, yyyy h:mm a")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Call Time</p>
                      <p className="font-medium">
                        {selectedIntake.ai_call_sessions?.started_at
                          ? format(new Date(selectedIntake.ai_call_sessions.started_at), "h:mm a")
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {selectedIntake.customers?.phone_e164 && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${selectedIntake.customers.phone_e164}`}>
                        <Phone className="h-3 w-3 mr-1" />
                        Call Patient
                      </a>
                    </Button>
                  )}
                  <Select
                    value={selectedIntake.status}
                    onValueChange={(status) => {
                      updateStatusMutation.mutate({ id: selectedIntake.id, status });
                      setSelectedIntake({ ...selectedIntake, status });
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
    </ErrorBoundary>
  );
}
