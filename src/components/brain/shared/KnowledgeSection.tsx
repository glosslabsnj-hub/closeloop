 /**
  * KnowledgeSection - Reusable section component for Business Brain knowledge editors
  * 
  * Provides consistent layout with:
  * - Header with title, description, and add button
  * - Empty state when no items
  * - List of items using renderItem
  */
 
 import { ReactNode } from "react";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Plus, LucideIcon, Loader2 } from "lucide-react";
 
 interface EmptyStateConfig {
   icon: LucideIcon;
   title: string;
   description: string;
 }
 
 interface KnowledgeSectionProps<T> {
   title: string;
   description: string;
   items: T[];
   isLoading?: boolean;
   onAdd: () => void;
   addButtonLabel?: string;
   renderItem: (item: T) => ReactNode;
   emptyState: EmptyStateConfig;
   headerActions?: ReactNode;
   className?: string;
 }
 
 export function KnowledgeSection<T extends { id: string }>({
   title,
   description,
   items,
   isLoading = false,
   onAdd,
   addButtonLabel = "Add",
   renderItem,
   emptyState,
   headerActions,
   className,
 }: KnowledgeSectionProps<T>) {
   const EmptyIcon = emptyState.icon;
 
   if (isLoading) {
     return (
       <Card className={className}>
         <CardContent className="flex items-center justify-center py-12">
           <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
         </CardContent>
       </Card>
     );
   }
 
    return (
      <Card className={className}>
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">{title}</CardTitle>
              <CardDescription className="text-xs mt-1 line-clamp-2">{description}</CardDescription>
            </div>
            <Button size="sm" onClick={onAdd} className="shrink-0">
              <Plus className="w-4 h-4 mr-1.5" />
              {addButtonLabel}
            </Button>
          </div>
          {headerActions && (
            <div className="overflow-x-auto -mx-1 px-1">
              {headerActions}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <EmptyIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{emptyState.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                {emptyState.description}
              </p>
              <div className="mt-4">
                <Button onClick={onAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  {addButtonLabel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id}>{renderItem(item)}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }