 import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Phone, Calendar, Clock, ArrowUpRight, ArrowDownLeft, ChevronRight } from "lucide-react";
 import { format } from "date-fns";
 import { cn } from "@/lib/utils";
 import { useIndustryContext } from "@/hooks/useIndustryContext";
 import { computeCallPriority } from "@/lib/priorityScoring";
 import { ExtractedPayloadDisplay } from "./ExtractedPayloadDisplay";
 import { PriorityBadge } from "./PriorityBadge";

 interface CallSession {
   id: string;
   started_at: string;
   ended_at: string | null;
   caller_phone: string | null;
   call_direction: "inbound" | "outbound";
   outcome: string | null;
   summary: string | null;
   transcript?: string | null;
   context_json: Record<string, unknown> | null;
   extracted_payload: Record<string, unknown> | null;
   customer_id: string | null;
   customer?: {
     id: string;
     full_name: string;
     phone_e164: string;
   } | null;
 }

 interface CallDetailPanelProps {
   call: CallSession | null;
   onClose: () => void;
   customerName?: string;
 }

 function formatDuration(startedAt: string, endedAt: string | null): string {
   if (!endedAt) {
     // If call started over 30 min ago with no end, it's stale — not actually in progress
     const ageMs = Date.now() - new Date(startedAt).getTime();
     if (ageMs > 30 * 60 * 1000) return "Ended (duration unknown)";
     return "In progress";
   }
   const start = new Date(startedAt).getTime();
   const end = new Date(endedAt).getTime();
   const seconds = Math.floor((end - start) / 1000);
   const mins = Math.floor(seconds / 60);
   const secs = seconds % 60;
   if (mins === 0) return `${secs}s`;
   return `${mins}m ${secs}s`;
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

 function getOutcomeStyles(outcome: string | null): { bg: string; text: string; label: string } {
   switch (outcome) {
     case "booked":
       return { bg: "bg-success/10", text: "text-success", label: "Booked" };
     case "order":
       return { bg: "bg-success/10", text: "text-success", label: "Order" };
     case "dispatch":
       return { bg: "bg-success/10", text: "text-success", label: "Dispatch" };
     case "followup":
       return { bg: "bg-warning/10", text: "text-warning", label: "Follow-up" };
     case "lead_captured":
       return { bg: "bg-warning/10", text: "text-warning", label: "Lead" };
     case "message":
       return { bg: "bg-warning/10", text: "text-warning", label: "Message" };
     case "lost":
       return { bg: "bg-destructive/10", text: "text-destructive", label: "Lost" };
     case "escalated":
       return { bg: "bg-info/10", text: "text-info", label: "Escalated" };
     default:
       return { bg: "bg-muted", text: "text-muted-foreground", label: outcome || "Unknown" };
   }
 }

 export function CallDetailPanel({ call, onClose, customerName }: CallDetailPanelProps) {
   const { terms, config } = useIndustryContext();

   if (!call) return null;

   const outcomeStyles = getOutcomeStyles(call.outcome);
   const displayName = customerName || call.customer?.full_name || "Unknown Caller";

   const callbackRequested = !!(
     call.extracted_payload &&
     typeof call.extracted_payload === "object" &&
     (call.extracted_payload as Record<string, unknown>).callback &&
     typeof (call.extracted_payload as Record<string, unknown>).callback === "object" &&
     ((call.extracted_payload as Record<string, unknown>).callback as Record<string, unknown>)?.requested
   );

   const priority = computeCallPriority(
     {
       outcome: call.outcome,
       started_at: call.started_at,
       callbackRequested,
     },
     config.priority,
   );

   return (
     <Sheet open={!!call} onOpenChange={(open) => !open && onClose()}>
       <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
         <SheetHeader className="text-left">
           <SheetTitle className="flex items-center gap-2">
             {displayName}
             {call.customer_id && (
               <ChevronRight className="w-4 h-4 text-muted-foreground" />
             )}
           </SheetTitle>
           <SheetDescription className="font-mono">
             {formatPhone(call.caller_phone)}
           </SheetDescription>
         </SheetHeader>

         <div className="mt-6 space-y-6">
           {/* Summary */}
           {call.summary && (
             <div>
               <h3 className="text-sm font-medium text-muted-foreground mb-2">Summary</h3>
               <p className="text-sm">{call.summary}</p>
             </div>
           )}

           {/* Metadata grid */}
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <p className="text-sm text-muted-foreground">Duration</p>
               <p className="font-medium flex items-center gap-1.5">
                 <Clock className="w-4 h-4 text-muted-foreground" />
                 {formatDuration(call.started_at, call.ended_at)}
               </p>
             </div>
             <div className="space-y-1">
               <p className="text-sm text-muted-foreground">Outcome</p>
               <div className="flex items-center gap-2">
                 <Badge className={cn(outcomeStyles.bg, outcomeStyles.text, "border-0")}>
                   {outcomeStyles.label}
                 </Badge>
                 <PriorityBadge level={priority.level} label={priority.label} />
               </div>
             </div>
             <div className="space-y-1">
               <p className="text-sm text-muted-foreground">Date</p>
               <p className="font-medium text-sm">
                 {format(new Date(call.started_at), "MMM d, yyyy 'at' h:mm a")}
               </p>
             </div>
             <div className="space-y-1">
               <p className="text-sm text-muted-foreground">Direction</p>
               <p className="font-medium flex items-center gap-1.5 text-sm capitalize">
                 {call.call_direction === "inbound" ? (
                   <ArrowDownLeft className="w-4 h-4 text-success" />
                 ) : (
                   <ArrowUpRight className="w-4 h-4 text-primary" />
                 )}
                 {call.call_direction}
               </p>
             </div>
           </div>

           {/* Extracted data — structured display */}
           {call.extracted_payload && Object.keys(call.extracted_payload).length > 0 && (
             <div>
               <h3 className="text-sm font-medium text-muted-foreground mb-2">Extracted Data</h3>
               <ExtractedPayloadDisplay
                 payload={call.extracted_payload}
                 inboxConfig={config.inbox}
               />
             </div>
           )}

           {/* Transcript */}
           {call.transcript && (
             <div>
               <h3 className="text-sm font-medium text-muted-foreground mb-2">Transcript</h3>
               <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-80 overflow-y-auto font-mono text-xs leading-relaxed">
                 {call.transcript}
               </div>
             </div>
           )}

           {/* Actions */}
           <div className="flex gap-2 pt-4 border-t">
             {call.caller_phone && (
               <Button
                 variant="outline"
                 className="flex-1"
                 onClick={() => window.open(`tel:${call.caller_phone}`, "_self")}
               >
                 <Phone className="w-4 h-4 mr-2" />
                 Call Back
               </Button>
             )}
             <Button variant="outline" className="flex-1">
               <Calendar className="w-4 h-4 mr-2" />
               {terms.newBooking}
             </Button>
           </div>
         </div>
       </SheetContent>
     </Sheet>
   );
 }
