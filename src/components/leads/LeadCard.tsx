 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Users, Phone, Calendar, MessageSquare } from "lucide-react";
 import { formatDistanceToNow } from "date-fns";
 import { cn } from "@/lib/utils";

 interface Lead {
   id: string;
   full_name: string;
   phone: string | null;
   email: string | null;
   status: string;
   source: string;
   created_at: string;
   last_message_at: string | null;
 }

 interface LeadCardProps {
   lead: Lead;
   onClick?: () => void;
   onBookAppointment?: (lead: Lead) => void;
   onSendMessage?: (lead: Lead) => void;
 }

 const statusStyles: Record<string, { bg: string; text: string }> = {
   new: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-400" },
   contacted: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
   qualified: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400" },
   booked: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
   won: { bg: "bg-success/10", text: "text-success" },
   lost: { bg: "bg-muted", text: "text-muted-foreground" },
 };

 const sourceLabels: Record<string, string> = {
   missed_call: "Missed Call",
   website_form: "Website",
   manual: "Manual",
   referral: "Referral",
   ai_call: "AI Call",
 };

 export function LeadCard({ lead, onClick, onBookAppointment, onSendMessage }: LeadCardProps) {
   const styles = statusStyles[lead.status] || statusStyles.new;

   return (
     <Card
       className={cn(
         "transition-colors",
         onClick && "cursor-pointer hover:border-primary/50"
       )}
       onClick={onClick}
     >
       <CardContent className="p-4">
         <div className="flex items-start gap-4">
           {/* Icon */}
           <div className={cn(
             "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
             styles.bg, styles.text
           )}>
             <Users className="w-5 h-5" />
           </div>

           {/* Lead info */}
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 flex-wrap">
               <p className="font-medium">{lead.full_name}</p>
               <Badge className={cn("text-xs border-0", styles.bg, styles.text)}>
                 {lead.status}
               </Badge>
             </div>
             <p className="text-sm text-muted-foreground">
               {lead.phone || lead.email || "No contact info"}
             </p>
             <p className="text-xs text-muted-foreground mt-1">
               Source: {sourceLabels[lead.source] || lead.source}
             </p>
           </div>

           {/* Timestamp & actions */}
           <div className="text-right shrink-0 space-y-2">
             <p className="text-sm text-muted-foreground">
               {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
             </p>
             <div className="flex gap-1 justify-end">
               {lead.phone && (
                 <Button
                   variant="ghost"
                   size="icon"
                   className="h-7 w-7"
                   onClick={(e) => {
                     e.stopPropagation();
                     window.open(`tel:${lead.phone}`, "_self");
                   }}
                 >
                   <Phone className="h-3.5 w-3.5" />
                 </Button>
               )}
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-7 w-7"
                 onClick={(e) => {
                   e.stopPropagation();
                   onSendMessage?.(lead);
                 }}
               >
                 <MessageSquare className="h-3.5 w-3.5" />
               </Button>
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-7 w-7"
                 onClick={(e) => {
                   e.stopPropagation();
                   onBookAppointment?.(lead);
                 }}
               >
                 <Calendar className="h-3.5 w-3.5" />
               </Button>
             </div>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 }