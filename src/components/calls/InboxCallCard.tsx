 import { Badge } from "@/components/ui/badge";
 import { Phone, Loader2 } from "lucide-react";
 import { formatDistanceToNow } from "date-fns";
 import { cn } from "@/lib/utils";
 
 interface CallSession {
   id: string;
   started_at: string;
   ended_at: string | null;
   caller_phone: string | null;
   call_direction: "inbound" | "outbound";
   outcome: string | null;
   summary: string | null;
   context_json: Record<string, unknown> | null;
   extracted_payload: Record<string, unknown> | null;
   customer_id: string | null;
   customer?: {
     id: string;
     full_name: string;
     phone_e164: string;
   } | null;
 }
 
 interface InboxCallCardProps {
   call: CallSession;
   onClick: () => void;
   customerName: string;
 }
 
 function formatPhone(phone: string | null): string {
   if (!phone) return "Unknown";
   if (phone.includes("(") || (phone.startsWith("+") && phone.length > 12)) return phone;
   const cleaned = phone.replace(/\D/g, "");
   if (cleaned.length === 10) {
     return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
   }
   if (cleaned.length === 11 && cleaned.startsWith("1")) {
     return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
   }
   return phone;
 }
 
 function formatDuration(startedAt: string, endedAt: string | null): string {
   if (!endedAt) return "";
   const start = new Date(startedAt).getTime();
   const end = new Date(endedAt).getTime();
   const seconds = Math.floor((end - start) / 1000);
   const mins = Math.floor(seconds / 60);
   const secs = seconds % 60;
   if (mins === 0) return `${secs}s`;
   return `${mins}m ${secs}s`;
 }
 
 function getOutcomeStyles(outcome: string | null): { bg: string; iconBg: string; border: string; label: string } {
   switch (outcome) {
     case "booked":
       return { bg: "bg-success/10", iconBg: "bg-success/10 text-success", border: "border-success text-success", label: "Booked" };
     case "order":
       return { bg: "bg-success/10", iconBg: "bg-success/10 text-success", border: "border-success text-success", label: "Order" };
     case "dispatch":
       return { bg: "bg-success/10", iconBg: "bg-success/10 text-success", border: "border-success text-success", label: "Dispatch" };
     case "followup":
       return { bg: "bg-warning/10", iconBg: "bg-warning/10 text-warning", border: "border-warning text-warning", label: "Follow-up" };
     case "lead_captured":
       return { bg: "bg-warning/10", iconBg: "bg-warning/10 text-warning", border: "border-warning text-warning", label: "Lead" };
     case "message":
       return { bg: "bg-warning/10", iconBg: "bg-warning/10 text-warning", border: "border-warning text-warning", label: "Message" };
     case "lost":
       return { bg: "bg-destructive/10", iconBg: "bg-destructive/10 text-destructive", border: "border-destructive text-destructive", label: "Lost" };
     case "escalated":
       return { bg: "bg-info/10", iconBg: "bg-info/10 text-info", border: "border-info text-info", label: "Escalated" };
     default:
       return { bg: "bg-muted", iconBg: "bg-muted text-muted-foreground", border: "border-muted-foreground text-muted-foreground", label: outcome || "Pending" };
   }
 }
 
 export function InboxCallCard({ call, onClick, customerName }: InboxCallCardProps) {
   const outcomeStyles = getOutcomeStyles(call.outcome);
   const duration = formatDuration(call.started_at, call.ended_at);

   return (
     <div
       className="px-5 py-4 cursor-pointer hover:bg-muted/30 border-l-2 border-l-transparent hover:border-l-primary transition-all"
       onClick={onClick}
     >
       <div className="flex items-start gap-4">
         {/* Outcome indicator */}
         <div className={cn(
           "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
           outcomeStyles.iconBg
         )}>
           <Phone className="w-5 h-5" />
         </div>

         {/* Call info */}
         <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 flex-wrap">
             <p className="font-medium">{customerName}</p>
             {call.outcome && (
               <Badge variant="outline" className={cn("text-xs", outcomeStyles.border)}>
                 {outcomeStyles.label}
               </Badge>
             )}
           </div>
           <p className="text-sm text-muted-foreground font-mono">
             {formatPhone(call.caller_phone)}
           </p>
           {call.summary ? (
             <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
               {call.summary}
             </p>
           ) : !call.ended_at ? (
             <p className="text-sm text-muted-foreground mt-1 italic flex items-center gap-1">
               <Loader2 className="w-3 h-3 animate-spin" />
               Call in progress...
             </p>
           ) : null}
         </div>

         {/* Timestamp & duration */}
         <div className="text-right shrink-0">
           <p className="text-sm text-muted-foreground">
             {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
           </p>
           {duration && (
             <p className="text-sm text-muted-foreground">
               {duration}
             </p>
           )}
         </div>
       </div>
     </div>
   );
 }