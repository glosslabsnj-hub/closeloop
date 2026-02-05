 import { format } from "date-fns";
 import { Clock, MoreVertical, Pencil, Phone, X, MessageSquare } from "lucide-react";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { cn } from "@/lib/utils";
 import type { BookingWithDetails } from "@/hooks/useBookings";
 
 export const bookingStatusColors: Record<string, string> = {
   pending_deposit: "bg-warning/10 text-warning border-warning/30",
   confirmed: "bg-success/10 text-success border-success/30",
   completed: "bg-muted text-muted-foreground border-border",
   canceled: "bg-destructive/10 text-destructive border-destructive/30",
   no_show: "bg-destructive/10 text-destructive border-destructive/30",
 };
 
 export const bookingStatusLabels: Record<string, string> = {
   pending_deposit: "Pending",
   confirmed: "Confirmed",
   completed: "Completed",
   canceled: "Cancelled",
   no_show: "No Show",
 };
 
 interface BookingCardProps {
   booking: BookingWithDetails;
   onEdit?: (booking: BookingWithDetails) => void;
   onCancel?: (booking: BookingWithDetails) => void;
 }
 
 export function BookingCard({ booking, onEdit, onCancel }: BookingCardProps) {
   const startDate = new Date(booking.start_at);
   const endDate = new Date(booking.end_at);
 
   return (
     <Card className="hover:border-primary/50 transition-colors">
       <CardContent className="p-4">
         <div className="flex items-start gap-4">
           {/* Date/time block */}
           <div className="w-16 h-16 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0">
             <span className="text-2xl font-bold">{format(startDate, "d")}</span>
             <span className="text-xs uppercase">{format(startDate, "MMM")}</span>
           </div>
 
           {/* Booking info */}
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 flex-wrap">
               <p className="font-medium">{booking.lead?.full_name || "Unknown Customer"}</p>
               <Badge
                 variant="outline"
                 className={cn(bookingStatusColors[booking.status])}
               >
                 {bookingStatusLabels[booking.status] || booking.status}
               </Badge>
             </div>
             <p className="text-sm text-muted-foreground">
               {booking.service?.name || "Service"}
             </p>
             <p className="text-sm text-muted-foreground mt-1">
               <Clock className="w-3.5 h-3.5 inline mr-1" />
               {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
             </p>
           </div>
 
           {/* Actions */}
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="shrink-0">
                 <MoreVertical className="w-4 h-4" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={() => onEdit?.(booking)}>
                 <Pencil className="w-4 h-4 mr-2" /> Edit
               </DropdownMenuItem>
               <DropdownMenuItem>
                 <Phone className="w-4 h-4 mr-2" /> Call Customer
               </DropdownMenuItem>
               <DropdownMenuItem>
                 <MessageSquare className="w-4 h-4 mr-2" /> Send Message
               </DropdownMenuItem>
               <DropdownMenuSeparator />
               <DropdownMenuItem
                 onClick={() => onCancel?.(booking)}
                 className="text-destructive focus:text-destructive"
               >
                 <X className="w-4 h-4 mr-2" /> Cancel Booking
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
       </CardContent>
     </Card>
   );
 }