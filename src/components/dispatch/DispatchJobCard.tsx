 import { MapPin, Clock, Phone, AlertTriangle } from "lucide-react";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { cn } from "@/lib/utils";
 
 export const priorityColors: Record<string, string> = {
   urgent: "bg-destructive text-destructive-foreground",
   high: "bg-warning/10 text-warning border-warning/30",
   normal: "bg-muted text-muted-foreground border-border",
   low: "bg-muted/50 text-muted-foreground border-border",
 };
 
 export const statusColors: Record<string, string> = {
   pending: "border-warning text-warning",
   assigned: "border-info text-info",
   en_route: "border-primary text-primary",
   on_site: "border-success text-success",
   completed: "text-muted-foreground border-border",
   cancelled: "text-destructive border-destructive/30",
 };
 
 export const statusLabels: Record<string, string> = {
   pending: "Pending",
   assigned: "Assigned",
   en_route: "En Route",
   on_site: "On Site",
   completed: "Completed",
   cancelled: "Cancelled",
 };
 
 interface DispatchJobCardProps<T> {
   job: T & {
     id: string;
     job_number?: string;
     status: string;
     priority: string;
     customer_name: string | null;
     customer_phone: string | null;
     pickup_address: string | null;
     dropoff_address?: string | null;
     job_type?: string | null;
     notes?: string | null;
     eta_minutes?: number | null;
     assigned_crew: string | null;
     assigned_vehicle: string | null;
     created_at: string;
   };
   onAssign?: (job: T) => void;
   onUpdateStatus?: (job: T, newStatus: string) => void;
   onCall?: (job: T) => void;
 }
 
 export function DispatchJobCard<T>({ job, onAssign, onUpdateStatus, onCall }: DispatchJobCardProps<T>) {
   return (
     <Card
       className={cn(
         "hover:border-primary/50 transition-colors",
         job.priority === "urgent" && "border-destructive/50"
       )}
     >
       <CardContent className="p-4">
         {/* Header with priority and status */}
         <div className="flex items-center justify-between mb-3">
           <Badge
             variant={job.priority === "urgent" ? "default" : "outline"}
             className={cn(priorityColors[job.priority])}
           >
             {job.priority === "urgent" && <AlertTriangle className="w-3 h-3 mr-1" />}
             {job.priority}
           </Badge>
           <Badge variant="outline" className={cn(statusColors[job.status])}>
             {statusLabels[job.status] || job.status.replace("_", " ")}
           </Badge>
         </div>
 
         {/* Customer & service */}
         <div className="mb-3">
           <p className="font-medium">{job.customer_name || "Unknown Customer"}</p>
           <p className="text-sm text-muted-foreground">{job.job_type || "Service"}</p>
         </div>
 
         {/* Location */}
         <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
           <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
           <p className="line-clamp-2">{job.pickup_address || "No address provided"}</p>
         </div>
 
         {/* ETA or assigned info */}
         {job.eta_minutes && job.eta_minutes > 0 ? (
           <div className="flex items-center gap-2 text-sm mb-3">
             <Clock className="w-4 h-4 text-muted-foreground" />
             <span>ETA: {job.eta_minutes} min</span>
           </div>
         ) : job.assigned_crew ? (
           <div className="flex items-center gap-2 text-sm mb-3 text-muted-foreground">
             <span className="font-medium">{job.assigned_crew}</span>
             {job.assigned_vehicle && (
               <span className="text-xs">• {job.assigned_vehicle}</span>
             )}
           </div>
         ) : null}
 
         {/* Actions */}
         <div className="flex gap-2 pt-3 border-t">
           {job.status === "pending" && (
             <Button size="sm" className="flex-1" onClick={() => onAssign?.(job)}>
               Assign
               Assign
             </Button>
           )}
           {job.status === "assigned" && (
             <Button
               size="sm"
               className="flex-1"
               onClick={() => onUpdateStatus?.(job as T, "en_route")}
             >
               Start Route
             </Button>
           )}
           {job.status === "en_route" && (
             <Button
               size="sm"
               className="flex-1"
               onClick={() => onUpdateStatus?.(job as T, "on_site")}
             >
               Arrived
             </Button>
           )}
           {job.status === "on_site" && (
             <Button
               size="sm"
               className="flex-1"
               onClick={() => onUpdateStatus?.(job as T, "completed")}
             >
               Complete
             </Button>
           )}
           {job.status === "completed" && (
             <Button size="sm" variant="outline" className="flex-1" disabled>
               Done
             </Button>
           )}
           <Button size="sm" variant="outline" onClick={() => onCall?.(job)}>
             <Phone className="w-4 h-4" />
           </Button>
         </div>
       </CardContent>
     </Card>
   );
 }