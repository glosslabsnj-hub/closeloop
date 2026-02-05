 /**
  * KnowledgeItem - Reusable item component with hover actions
  * 
  * Provides consistent item layout with:
  * - Content area
  * - Edit/Delete actions that appear on hover
  */
 
 import { ReactNode } from "react";
 import { Button } from "@/components/ui/button";
 import { Pencil, Trash2 } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface KnowledgeItemProps {
   children: ReactNode;
   onEdit?: () => void;
   onDelete?: () => void;
   className?: string;
   isEditing?: boolean;
 }
 
 export function KnowledgeItem({
   children,
   onEdit,
   onDelete,
   className,
   isEditing = false,
 }: KnowledgeItemProps) {
   return (
     <div
       className={cn(
         "flex items-start gap-4 p-4 rounded-lg border group transition-colors",
         "hover:border-primary/50 hover:bg-muted/30",
         isEditing && "border-primary bg-muted/50",
         className
       )}
     >
       <div className="flex-1 min-w-0">{children}</div>
       
       {(onEdit || onDelete) && (
         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
           {onEdit && (
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-muted-foreground hover:text-foreground"
               onClick={onEdit}
             >
               <Pencil className="w-4 h-4" />
             </Button>
           )}
           {onDelete && (
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-muted-foreground hover:text-destructive"
               onClick={onDelete}
             >
               <Trash2 className="w-4 h-4" />
             </Button>
           )}
         </div>
       )}
     </div>
   );
 }