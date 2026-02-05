 import { useState, useMemo } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { supabase } from "@/integrations/supabase/client";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { useModuleRequired } from "@/hooks/useModuleRequired";
 import { Card, CardContent } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { PageContainer } from "@/components/layout/PageContainer";
 import { PageHeader } from "@/components/layout/PageHeader";
 import {
   Truck,
   MapPin,
   Clock,
   User,
   AlertTriangle,
   CheckCircle2,
   Navigation,
   Plus,
   Loader2,
   Search,
 } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 import { DispatchJobCard } from "@/components/dispatch/DispatchJobCard";
 import { EmptyState } from "@/components/ui/empty-state";
 
 export default function DispatchPage() {
   const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["dispatch_queue"]);
   
   const { tenant } = useAuth();
   const { toast } = useToast();
   const queryClient = useQueryClient();
   const [statusFilter, setStatusFilter] = useState<string>("all");
   const [priorityFilter, setPriorityFilter] = useState<string>("all");
   const [searchQuery, setSearchQuery] = useState("");
 
   const { data: jobs, isLoading } = useQuery({
     queryKey: ["dispatch-jobs", tenant?.id],
     queryFn: async () => {
       if (!tenant?.id) return [];
       const { data, error } = await supabase
         .from("dispatch_jobs")
         .select("*, customers(full_name, phone_e164)")
         .eq("tenant_id", tenant.id)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       return data || [];
     },
     enabled: !!tenant?.id,
   });
 
   const updateJobMutation = useMutation({
     mutationFn: async ({ jobId, updates }: { jobId: string; updates: Record<string, unknown> }) => {
       const { error } = await supabase
         .from("dispatch_jobs")
         .update(updates)
         .eq("id", jobId);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["dispatch-jobs"] });
       toast({ title: "Job updated" });
     },
     onError: (error: Error) => {
       toast({ variant: "destructive", title: "Error", description: error.message });
     },
   });
 
   const activeStatuses = ["pending", "assigned", "en_route", "on_site"];
   
   const filteredJobs = useMemo(() => {
     if (!jobs) return [];
     
     return jobs.filter((job) => {
       if (statusFilter === "active") {
         if (!activeStatuses.includes(job.status)) return false;
       } else if (statusFilter !== "all" && job.status !== statusFilter) {
         return false;
       }
       
       if (priorityFilter !== "all" && job.priority !== priorityFilter) {
         return false;
       }
       
       if (searchQuery) {
         const query = searchQuery.toLowerCase();
         const customerName = job.customer_name?.toLowerCase() || "";
         const address = job.pickup_address?.toLowerCase() || "";
         const jobNumber = job.job_number?.toLowerCase() || "";
         return customerName.includes(query) || address.includes(query) || jobNumber.includes(query);
       }
       
       return true;
     });
   }, [jobs, statusFilter, priorityFilter, searchQuery]);
 
   const urgentJobs = jobs?.filter(j => 
     j.priority === "urgent" && activeStatuses.includes(j.status)
   ) || [];
 
   const handleAssign = (job: NonNullable<typeof jobs>[0]) => {
     console.log("Assign job:", job.id);
   };
 
   const handleUpdateStatus = (job: NonNullable<typeof jobs>[0], newStatus: string) => {
     const updates: Record<string, unknown> = { status: newStatus };
     if (newStatus === "completed") {
       updates.completed_at = new Date().toISOString();
     }
     updateJobMutation.mutate({ jobId: job.id, updates });
   };
 
   const handleCall = (job: NonNullable<typeof jobs>[0]) => {
     if (job.customer_phone) {
       window.open(`tel:${job.customer_phone}`);
     }
   };
 
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
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   return (
     <PageContainer maxWidth="xl">
       <div className="space-y-6">
         <PageHeader
           icon={<Truck className="h-5 w-5" />}
           title="Dispatch Queue"
           description="Manage and assign service jobs"
           action={
             <Button>
               <Plus className="h-4 w-4 mr-2" />
               New Job
             </Button>
           }
         />
 
         {/* Urgent Alert */}
         {urgentJobs.length > 0 && (
           <Card className="border-destructive bg-destructive/5">
             <CardContent className="py-4">
               <div className="flex items-center gap-3">
                 <AlertTriangle className="h-5 w-5 text-destructive" />
                 <div>
                   <p className="font-medium text-destructive">
                     {urgentJobs.length} Urgent Job{urgentJobs.length > 1 ? "s" : ""} Pending
                   </p>
                   <p className="text-sm text-muted-foreground">
                     These require immediate attention
                   </p>
                 </div>
               </div>
             </CardContent>
           </Card>
         )}
 
         {/* Stats */}
         <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           <Card>
             <CardContent className="pt-4">
               <div className="flex items-center gap-2">
                 <Clock className="h-4 w-4 text-warning" />
                 <span className="text-sm text-muted-foreground">Pending</span>
               </div>
               <p className="text-2xl font-bold mt-1">
                 {jobs?.filter((j) => j.status === "pending").length || 0}
               </p>
             </CardContent>
           </Card>
 
           <Card>
             <CardContent className="pt-4">
               <div className="flex items-center gap-2">
                 <User className="h-4 w-4 text-primary" />
                 <span className="text-sm text-muted-foreground">Assigned</span>
               </div>
               <p className="text-2xl font-bold mt-1">
                 {jobs?.filter((j) => j.status === "assigned").length || 0}
               </p>
             </CardContent>
           </Card>
 
           <Card>
             <CardContent className="pt-4">
               <div className="flex items-center gap-2">
                 <Navigation className="h-4 w-4 text-info" />
                 <span className="text-sm text-muted-foreground">En Route</span>
               </div>
               <p className="text-2xl font-bold mt-1">
                 {jobs?.filter((j) => j.status === "en_route").length || 0}
               </p>
             </CardContent>
           </Card>
 
           <Card>
             <CardContent className="pt-4">
               <div className="flex items-center gap-2">
                 <MapPin className="h-4 w-4 text-success" />
                 <span className="text-sm text-muted-foreground">On Site</span>
               </div>
               <p className="text-2xl font-bold mt-1">
                 {jobs?.filter((j) => j.status === "on_site").length || 0}
               </p>
             </CardContent>
           </Card>
 
           <Card>
             <CardContent className="pt-4">
               <div className="flex items-center gap-2">
                 <CheckCircle2 className="h-4 w-4 text-success" />
                 <span className="text-sm text-muted-foreground">Completed</span>
               </div>
               <p className="text-2xl font-bold mt-1">
                 {jobs?.filter(
                   (j) =>
                     j.status === "completed" &&
                     j.completed_at &&
                     new Date(j.completed_at).toDateString() === new Date().toDateString()
                 ).length || 0}
               </p>
             </CardContent>
           </Card>
         </div>
 
         {/* Filters */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex items-center gap-2">
             <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="w-36">
                 <SelectValue placeholder="Status" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Statuses</SelectItem>
                 <SelectItem value="active">Active Only</SelectItem>
                 <SelectItem value="pending">Pending</SelectItem>
                 <SelectItem value="assigned">Assigned</SelectItem>
                 <SelectItem value="en_route">En Route</SelectItem>
                 <SelectItem value="on_site">On Site</SelectItem>
                 <SelectItem value="completed">Completed</SelectItem>
                 <SelectItem value="cancelled">Cancelled</SelectItem>
               </SelectContent>
             </Select>
             <Select value={priorityFilter} onValueChange={setPriorityFilter}>
               <SelectTrigger className="w-32">
                 <SelectValue placeholder="Priority" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All</SelectItem>
                 <SelectItem value="urgent">Urgent</SelectItem>
                 <SelectItem value="high">High</SelectItem>
                 <SelectItem value="normal">Normal</SelectItem>
                 <SelectItem value="low">Low</SelectItem>
               </SelectContent>
             </Select>
           </div>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder="Search jobs..."
               className="w-48 pl-10"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
         </div>
 
         {/* Jobs grid */}
         {filteredJobs.length === 0 ? (
           <EmptyState
             icon={Truck}
             title="No dispatch jobs"
             description={
               statusFilter !== "all" || priorityFilter !== "all" || searchQuery
                 ? "Try adjusting your filters to see more results."
                 : "When your AI creates dispatch requests, they'll appear here for assignment."
             }
             action={
               statusFilter === "all" && priorityFilter === "all" && !searchQuery
                 ? { label: "Create Job", onClick: () => console.log("Create job") }
                 : undefined
             }
           />
         ) : (
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {filteredJobs.map((job) => (
               <DispatchJobCard
                 key={job.id}
                 job={job}
                 onAssign={handleAssign}
                 onUpdateStatus={handleUpdateStatus}
                 onCall={handleCall}
               />
             ))}
           </div>
         )}
       </div>
     </PageContainer>
   );
 }