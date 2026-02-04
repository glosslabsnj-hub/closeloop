/**
 * Business Brain Left Navigation
 * 
 * Sticky left sidebar with:
 * - Category navigation
 * - Drag-and-drop reordering (toggleable)
 * - Mode-aware ordering
 * - Review count badge
 * - Active state highlighting
 */

import { useState, useEffect, useCallback } from "react";
import { Brain, ChevronRight, GripVertical, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BRAIN_CATEGORIES, 
  type CategoryConfig 
} from "./businessBrainNavConfig";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useBrainReviewCount } from "@/components/brain/BrainReviewQueue";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "brain-nav-order";
const LOCKED_KEY = "brain-nav-locked";

function getStoredOrder(): string[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveOrder(order: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

function getLockedState(): boolean {
  return localStorage.getItem(LOCKED_KEY) === "true";
}

function saveLockedState(locked: boolean) {
  localStorage.setItem(LOCKED_KEY, locked ? "true" : "false");
}

interface BusinessBrainNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  className?: string;
}

export function BusinessBrainNav({ 
  activeSection, 
  onSectionChange,
  className 
}: BusinessBrainNavProps) {
  const { businessMode } = useTenantConfig();
  const reviewCount = useBrainReviewCount();
  
  // Reordering state
  const [isLocked, setIsLocked] = useState(() => getLockedState());
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    const stored = getStoredOrder();
    return stored || BRAIN_CATEGORIES.map(c => c.id);
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Get categories in current order
  const orderedCategories = categoryOrder
    .map(id => BRAIN_CATEGORIES.find(c => c.id === id))
    .filter((c): c is CategoryConfig => c !== undefined);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    if (isLocked) return;
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
  }, [isLocked]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    if (isLocked || !draggedId || draggedId === id) return;
    e.preventDefault();
    setDragOverId(id);
  }, [isLocked, draggedId]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    if (isLocked || !draggedId || draggedId === targetId) return;
    e.preventDefault();
    
    const newOrder = [...categoryOrder];
    const draggedIndex = newOrder.indexOf(draggedId);
    const targetIndex = newOrder.indexOf(targetId);
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);
    
    setCategoryOrder(newOrder);
    saveOrder(newOrder);
    setDraggedId(null);
    setDragOverId(null);
  }, [isLocked, draggedId, categoryOrder]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  // Toggle lock
  const toggleLock = useCallback(() => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    saveLockedState(newLocked);
  }, [isLocked]);

  return (
    <aside className={cn(
      "w-64 border-r border-border bg-card/50 sticky top-0 h-screen overflow-hidden flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Business Brain</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleLock}
            title={isLocked ? "Unlock to reorder tabs" : "Lock tab order"}
          >
            {isLocked ? (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Unlock className="h-3.5 w-3.5 text-primary" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isLocked ? "Everything your AI needs to know" : "Drag to reorder tabs"}
        </p>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {orderedCategories.map((category) => {
            const Icon = category.icon;
            const isActive = activeSection === category.section;
            const isEmphasized = category.emphasis?.includes(businessMode);
            const showBadge = category.section === "knowledge" && reviewCount > 0;
            const isDragging = draggedId === category.id;
            const isDragOver = dragOverId === category.id;

            return (
              <div
                key={category.id}
                draggable={!isLocked}
                onDragStart={(e) => handleDragStart(e, category.id)}
                onDragOver={(e) => handleDragOver(e, category.id)}
                onDrop={(e) => handleDrop(e, category.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative transition-all",
                  isDragging && "opacity-50",
                  isDragOver && "before:absolute before:inset-x-0 before:-top-0.5 before:h-0.5 before:bg-primary before:rounded-full"
                )}
              >
                <button
                  onClick={() => onSectionChange(category.section)}
                  className={cn(
                    "w-full flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm transition-all",
                    "hover:bg-muted/50",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !isActive && isEmphasized && "bg-primary/5 border border-primary/20",
                    !isLocked && "cursor-grab active:cursor-grabbing"
                  )}
                >
                  {/* Drag handle - only show when unlocked */}
                  {!isLocked && (
                    <GripVertical className={cn(
                      "h-4 w-4 mt-0.5 shrink-0 opacity-40",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )} />
                  )}
                  
                  <Icon className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium truncate",
                        isActive && "text-primary-foreground"
                      )}>
                        {category.title}
                      </span>
                      {showBadge && (
                        <Badge 
                          variant={isActive ? "secondary" : "destructive"} 
                          className="h-5 px-1.5 text-xs shrink-0"
                        >
                          {reviewCount}
                        </Badge>
                      )}
                      {isEmphasized && !isActive && (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] h-4 px-1 border-primary/30 text-primary shrink-0"
                        >
                          Key
                        </Badge>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs truncate",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {category.description}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 shrink-0 mt-0.5 opacity-0 transition-opacity",
                    isActive && "opacity-100 text-primary-foreground"
                  )} />
                </button>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer hint */}
      <div className="p-3 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          {isLocked 
            ? "Changes save automatically and sync to your AI in real-time"
            : "Click the lock icon when done reordering"
          }
        </p>
      </div>
    </aside>
  );
}
