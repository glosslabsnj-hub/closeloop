import { useNavigate } from "react-router-dom";
import { ArrowRight, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/types/partnerAnalysis";

interface ActionItemCardProps {
  item: ActionItem;
  index: number;
}

export function ActionItemCard({ item, index }: ActionItemCardProps) {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3 py-3">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-0.5">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
          {index + 1}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1 min-w-0">
        <h4 className="font-medium text-sm">{item.title}</h4>
        <p className="text-sm text-muted-foreground">{item.description}</p>
        {item.action_link && (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto text-primary"
            onClick={() => navigate(item.action_link)}
          >
            Take action
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
