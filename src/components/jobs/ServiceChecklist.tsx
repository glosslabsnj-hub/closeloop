import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { JobServiceItem } from "@/hooks/useActiveJobs";
import type { JobLabels } from "@/hooks/useJobLabels";

interface ServiceChecklistProps {
  items: JobServiceItem[];
  labels: JobLabels;
  onToggle: (itemId: string, currentStatus: string) => void;
  onAdd: (title: string) => void;
  onRemove: (itemId: string) => void;
}

export function ServiceChecklist({
  items,
  labels,
  onToggle,
  onAdd,
  onRemove,
}: ServiceChecklistProps) {
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewTitle("");
  };

  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-1">
      {sortedItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group"
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <Checkbox
            checked={item.status === "completed"}
            onCheckedChange={() => onToggle(item.id, item.status)}
          />
          <span
            className={cn(
              "flex-1 text-sm",
              item.status === "completed" && "line-through text-muted-foreground"
            )}
          >
            {item.title}
          </span>
          {item.completed_at && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(item.completed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      ))}

      {/* Add new item */}
      <div className="flex items-center gap-2 pt-2">
        <Plus className="h-3.5 w-3.5 text-muted-foreground ml-6" />
        <Input
          placeholder={`Add ${labels.serviceStep.toLowerCase()}...`}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="h-8 text-sm flex-1"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          disabled={!newTitle.trim()}
          className="h-8 text-xs"
        >
          Add
        </Button>
      </div>
    </div>
  );
}
