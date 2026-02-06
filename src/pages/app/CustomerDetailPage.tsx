import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Pencil,
  MoreHorizontal,
  Star,
  User,
  Calendar,
  Clock,
  Check,
  Loader2,
  Plus,
  Brain,
  FileText,
  Trash2,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { CustomerEditDialog } from "@/components/customers/CustomerEditDialog";

// Mock data for visits - in production would come from bookings table
function getMockVisitHistory(customerId: string) {
  const baseDate = new Date();
  return [
    {
      id: "1",
      date: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      service: "Haircut",
      amount: 45,
      staff: "Lisa M.",
      status: "completed",
    },
    {
      id: "2",
      date: new Date(baseDate.getTime() - 26 * 24 * 60 * 60 * 1000),
      service: "Haircut + Highlights",
      amount: 165,
      staff: "Lisa M.",
      status: "completed",
    },
    {
      id: "3",
      date: new Date(baseDate.getTime() - 56 * 24 * 60 * 60 * 1000),
      service: "Haircut + Color",
      amount: 95,
      staff: "Sarah T.",
      status: "completed",
    },
    {
      id: "4",
      date: new Date(baseDate.getTime() - 86 * 24 * 60 * 60 * 1000),
      service: "Full Color",
      amount: 120,
      staff: "Lisa M.",
      status: "completed",
    },
  ];
}

// Mock upcoming appointments
function getMockUpcoming(customerId: string) {
  return [
    {
      id: "1",
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      time: "2:00 PM",
      service: "Haircut + Color",
      staff: "Lisa M.",
      amount: 95,
    },
  ];
}

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { customers, updateCustomer, deleteCustomer } = useCustomers();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Find customer from hook data
  const customer = useMemo(() => 
    customers.find(c => c.id === customerId) || null,
    [customers, customerId]
  );

  // Fetch AI memory for this customer
  const { data: customerMemory } = useQuery({
    queryKey: ["customer-memory", tenant?.id, customerId],
    queryFn: async () => {
      if (!tenant?.id || !customer?.phone_e164) return [];
      
      const { data, error } = await supabase
        .from("business_memory")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("subject_key", customer.phone_e164)
        .eq("is_active", true)
        .order("confidence_score", { ascending: false });
      
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id && !!customer?.phone_e164,
  });

  // Fetch call sessions for this customer
  const { data: callSessions } = useQuery({
    queryKey: ["customer-calls", tenant?.id, customerId],
    queryFn: async () => {
      if (!tenant?.id || !customerId) return [];
      
      const { data, error } = await supabase
        .from("ai_call_sessions")
        .select("id, started_at, ended_at, outcome, summary")
        .eq("tenant_id", tenant.id)
        .eq("customer_id", customerId)
        .order("started_at", { ascending: false })
        .limit(10);
      
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id && !!customerId,
  });

  const visitHistory = useMemo(() => 
    customer ? getMockVisitHistory(customer.id) : [],
    [customer]
  );
  
  const upcomingAppointments = useMemo(() => 
    customer ? getMockUpcoming(customer.id) : [],
    [customer]
  );

  // Calculate stats
  const stats = useMemo(() => {
    const totalVisits = visitHistory.length;
    const totalSpent = visitHistory.reduce((sum, v) => sum + v.amount, 0);
    const avgTicket = totalVisits > 0 ? Math.round(totalSpent / totalVisits) : 0;
    return { totalVisits, totalSpent, avgTicket };
  }, [visitHistory]);

  const isVIP = customer?.tags?.includes("vip");

  const handleToggleVIP = async () => {
    if (!customer) return;
    
    const newTags = isVIP 
      ? (customer.tags || []).filter(t => t !== "vip")
      : [...(customer.tags || []), "vip"];
    
    await updateCustomer.mutateAsync({
      id: customer.id,
      tags: newTags,
    });
  };

  const handleAddNote = async () => {
    if (!customer || !newNote.trim()) return;
    
    setIsSavingNote(true);
    try {
      const existingNotes = customer.notes || "";
      const timestamp = format(new Date(), "MMM d");
      const newNoteWithTimestamp = `${timestamp}: ${newNote.trim()}`;
      const updatedNotes = existingNotes 
        ? `${newNoteWithTimestamp}\n\n${existingNotes}`
        : newNoteWithTimestamp;
      
      await updateCustomer.mutateAsync({
        id: customer.id,
        notes: updatedNotes,
      });
      setNewNote("");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    if (confirm(`Are you sure you want to delete ${customer.full_name}? This cannot be undone.`)) {
      await deleteCustomer.mutateAsync(customer.id);
      navigate("/app/customers");
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith("+1") && phone.length === 12) {
      return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const memoryTypeIcons: Record<string, string> = {
    customer_preference: "👤",
    time_pattern: "⏰",
    service_pattern: "💇",
    capacity_pattern: "📊",
    exception_pattern: "⚠️",
  };

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/app/customers")}
        className="mb-4 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Customers
      </Button>

      {/* Customer Header Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {customer.full_name || "Unnamed Customer"}
                </h1>
                {isVIP && (
                  <Badge className="gap-1 bg-warning/15 text-warning border-warning/20">
                    <Star className="h-3 w-3 fill-current" />
                    VIP
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {formatPhone(customer.phone_e164)}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Customer since: {format(parseISO(customer.created_at), "MMMM yyyy")}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(`tel:${customer.phone_e164}`, "_blank")}
              >
                <Phone className="h-4 w-4" />
                Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(`sms:${customer.phone_e164}`, "_blank")}
              >
                <MessageSquare className="h-4 w-4" />
                SMS
              </Button>
              {customer.email && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(`mailto:${customer.email}`, "_blank")}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleVIP}>
                    <Star className={cn("h-4 w-4 mr-2", isVIP && "fill-current")} />
                    {isVIP ? "Remove VIP" : "Mark as VIP"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Customer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-semibold">{stats.totalVisits}</p>
            <p className="text-sm text-muted-foreground">Total Visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-semibold">{formatCurrency(stats.totalSpent)}</p>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-semibold">{formatCurrency(stats.avgTicket)}</p>
            <p className="text-sm text-muted-foreground">Avg Ticket</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Upcoming Appointments</h3>
              <div className="space-y-3">
                {upcomingAppointments.map((appt) => (
                  <Card key={appt.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">
                              {format(appt.date, "EEEE, MMM d")} at {appt.time}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {appt.service} with {appt.staff}
                            </p>
                            <p className="text-sm font-medium mt-1">
                              {formatCurrency(appt.amount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Confirm
                          </Button>
                          <Button variant="ghost" size="sm">
                            Reschedule
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Visit History */}
          <div>
            <h3 className="text-sm font-medium mb-3">Visit History</h3>
            <Card>
              <div className="divide-y">
                {visitHistory.slice(0, 4).map((visit) => (
                  <div key={visit.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{visit.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(visit.date, "MMM d, yyyy")} • {visit.staff} • 
                        <span className="inline-flex items-center gap-1 text-success ml-1">
                          <Check className="h-3 w-3" /> Completed
                        </span>
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrency(visit.amount)}</p>
                  </div>
                ))}
              </div>
            </Card>
            {visitHistory.length > 4 && (
              <Button variant="ghost" size="sm" className="mt-3">
                View All {visitHistory.length} Visits
              </Button>
            )}
          </div>

          {/* AI Memory */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Memory
              <span className="text-xs text-muted-foreground font-normal">
                (What your AI knows about {customer.full_name?.split(" ")[0] || "this customer"})
              </span>
            </h3>
            <Card>
              <CardContent className="p-4">
                {customerMemory && customerMemory.length > 0 ? (
                  <div className="space-y-3">
                    {customerMemory.map((memory: any) => (
                      <div key={memory.id} className="flex items-start gap-3">
                        <span className="text-lg">
                          {memoryTypeIcons[memory.memory_type] || "💡"}
                        </span>
                        <p className="text-sm">{memory.summary}</p>
                      </div>
                    ))}
                    <Separator className="my-3" />
                    <Button variant="outline" size="sm">
                      Edit Preferences
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No AI memories yet. As your AI interacts with this customer,
                      it will learn their preferences.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes Preview */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </h3>
            <Card>
              <CardContent className="p-4">
                {customer.notes ? (
                  <div className="whitespace-pre-wrap text-sm">{customer.notes}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                )}
                <div className="mt-4 flex gap-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={2}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isSavingNote}
                    className="shrink-0"
                  >
                    {isSavingNote ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {visitHistory.length > 0 ? (
                <div className="divide-y">
                  {visitHistory.map((visit) => (
                    <div key={visit.id} className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{visit.service}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(visit.date, "MMMM d, yyyy")} • {visit.staff}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(visit.amount)}</p>
                        <Badge variant="success" size="sm">Completed</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No appointments yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calls Tab */}
        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Call History</CardTitle>
            </CardHeader>
            <CardContent>
              {callSessions && callSessions.length > 0 ? (
                <div className="divide-y">
                  {callSessions.map((call: any) => (
                    <div key={call.id} className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(parseISO(call.started_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <Badge variant="secondary">{call.outcome || "completed"}</Badge>
                      </div>
                      {call.summary && (
                        <p className="text-sm text-muted-foreground">{call.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No call history
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a note about this customer..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSavingNote}
                  className="gap-2"
                >
                  {isSavingNote && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Plus className="h-4 w-4" />
                  Add Note
                </Button>
                <Separator />
                {customer.notes ? (
                  <div className="whitespace-pre-wrap text-sm">{customer.notes}</div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No notes yet. Add your first note above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              {customerMemory && customerMemory.length > 0 ? (
                <div className="space-y-4">
                  {customerMemory.map((memory: any) => (
                    <div
                      key={memory.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                    >
                      <span className="text-2xl">
                        {memoryTypeIcons[memory.memory_type] || "💡"}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{memory.summary}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Observed {memory.observation_count} times • 
                          Last seen {formatDistanceToNow(parseISO(memory.last_observed_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No preferences learned yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    As your AI interacts with this customer over time, it will learn
                    their preferences, timing patterns, and service habits.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <CustomerEditDialog
        customer={customer}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
