/**
 * BrainActionCard — Displays a proposed Brain action with Apply/Edit/Skip controls.
 */

import { useState } from "react";
import { Check, X, Pencil, Loader2, AlertCircle, Sparkles, BookOpen, Wrench, FileText, Clock, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BrainAction } from "@/hooks/useBrainAssistant";

interface BrainActionCardProps {
  action: BrainAction;
  onApply: (actionId: string) => Promise<void>;
  onSkip: (actionId: string) => void;
}

const actionIcons: Record<string, typeof Sparkles> = {
  create_faq: BookOpen,
  create_service: Wrench,
  create_objection: MessageSquare,
  set_policy: FileText,
  set_field: Pencil,
  set_hours: Clock,
  set_greeting: Sparkles,
  set_area: MapPin,
  create_knowledge: BookOpen,
  update_service: Wrench,
};

export function BrainActionCard({ action, onApply, onSkip }: BrainActionCardProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPreview, setEditPreview] = useState(action.preview || "");

  const status = action.status || "pending";
  const Icon = actionIcons[action.type] || Sparkles;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(action.id);
    } finally {
      setIsApplying(false);
    }
  };

  if (status === "applied") {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30">
        <CardContent className="p-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
          <Check className="h-4 w-4 shrink-0" />
          <span className="line-through opacity-70">{action.description}</span>
          <span className="ml-auto text-xs font-medium">Applied</span>
        </CardContent>
      </Card>
    );
  }

  if (status === "skipped") {
    return (
      <Card className="border-muted bg-muted/30 opacity-60">
        <CardContent className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
          <X className="h-4 w-4 shrink-0" />
          <span className="line-through">{action.description}</span>
          <span className="ml-auto text-xs">Skipped</span>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{action.description}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={handleApply} disabled={isApplying}>
              Retry
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onSkip(action.id)}>
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5 hover:border-primary/30 transition-colors">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{action.description}</p>
            {action.preview && !isEditing && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{action.preview}</p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="pl-6">
            <Textarea
              value={editPreview}
              onChange={(e) => setEditPreview(e.target.value)}
              className="text-xs min-h-[60px]"
              placeholder="Preview of what will be written..."
            />
          </div>
        )}

        <div className="flex gap-2 pl-6">
          <Button
            size="sm"
            onClick={handleApply}
            disabled={isApplying}
            className="h-7 text-xs"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-3 w-3 mr-1" />
                Apply
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSkip(action.id)}
            disabled={isApplying}
            className="h-7 text-xs text-muted-foreground"
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
