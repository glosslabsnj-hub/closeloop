import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Trash2, 
  Clock, 
  User, 
  Wrench, 
  BarChart3, 
  AlertTriangle,
  Info,
  Lock,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { 
  useBusinessMemory, 
  BusinessMemory, 
  memoryTypeLabels, 
  MemoryType 
} from "@/hooks/useBusinessMemory";
import { useIntelligenceSettings } from "@/hooks/useIntelligenceSettings";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const memoryTypeIconMap: Record<MemoryType, React.ReactNode> = {
  customer_preference: <User className="h-4 w-4" />,
  time_pattern: <Clock className="h-4 w-4" />,
  service_pattern: <Wrench className="h-4 w-4" />,
  capacity_pattern: <BarChart3 className="h-4 w-4" />,
  exception_pattern: <AlertTriangle className="h-4 w-4" />,
};

interface MemoryCardProps {
  memory: BusinessMemory;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  isToggling: boolean;
  isDeleting: boolean;
}

function MemoryCard({ memory, onToggle, onDelete, isToggling, isDeleting }: MemoryCardProps) {
  const confidencePercent = Math.round(memory.confidence_score * 100);
  const isUsable = memory.confidence_score >= 0.65 && memory.observation_count >= 3;

  return (
    <div className={`p-4 rounded-lg border ${memory.is_active ? "bg-card" : "bg-muted/50 opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
            memory.is_active ? "bg-primary/15" : "bg-muted"
          }`}>
            {memoryTypeIconMap[memory.memory_type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {memoryTypeLabels[memory.memory_type]}
              </span>
              {!isUsable && memory.is_active && (
                <Badge variant="outline" className="text-xs">
                  Learning
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-snug">
              "{memory.summary}"
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Observed {memory.observation_count}x</span>
              <span>·</span>
              <span>Last: {formatDistanceToNow(new Date(memory.last_observed_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Confidence indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <div className="w-16">
              <Progress 
                value={confidencePercent} 
                className="h-2"
              />
            </div>
            <span className="text-xs font-medium w-8 text-right">{confidencePercent}%</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle(memory.id, !memory.is_active)}
              disabled={isToggling}
            >
              {memory.is_active ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this learned pattern. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(memory.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BusinessMemoryTab() {
  const { 
    memories, 
    activeMemories,
    usableMemories,
    isLoading, 
    toggleMemory, 
    deleteMemory,
    isToggling,
    isDeleting,
    hipaaMode,
    customerMemoryBlocked 
  } = useBusinessMemory();

  const { 
    settings, 
    toggleMemory: toggleMemoryEnabled, 
    toggleCrossLocationSharing,
    isUpdating 
  } = useIntelligenceSettings();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Business Memory</CardTitle>
                <CardDescription>
                  AI learns patterns from repeated observations
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="memory-enabled" className="text-sm">
                {settings.memory_enabled ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id="memory-enabled"
                checked={settings.memory_enabled}
                onCheckedChange={(checked) => toggleMemoryEnabled(checked)}
                disabled={isUpdating}
              />
            </div>
          </div>
        </CardHeader>
        {settings.memory_enabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="share-locations" className="text-sm font-medium">
                  Share patterns across locations
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow patterns learned at one location to apply to others
                </p>
              </div>
              <Switch
                id="share-locations"
                checked={settings.share_memory_across_locations}
                onCheckedChange={(checked) => toggleCrossLocationSharing(checked)}
                disabled={isUpdating}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{memories.length}</div>
                <div className="text-xs text-muted-foreground">Total Patterns</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{activeMemories.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{usableMemories.length}</div>
                <div className="text-xs text-muted-foreground">Usable by AI</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* HIPAA Notice */}
      {customerMemoryBlocked && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Lock className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium">HIPAA Mode Active</p>
            <p className="text-xs text-muted-foreground">
              Customer-specific memory is disabled for HIPAA compliance. Only aggregate patterns (time, capacity, service) are stored.
            </p>
          </div>
        </div>
      )}

      {/* Info Banner */}
      {settings.memory_enabled && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">How Memory Works</p>
            <ul className="text-muted-foreground mt-1 space-y-1">
              <li>• Patterns are created after 3+ observations</li>
              <li>• Confidence must reach 65% before AI uses them</li>
              <li>• Memory is used as hints only — never hard rules</li>
              <li>• Memory never influences upsells or overrides availability</li>
            </ul>
          </div>
        </div>
      )}

      {/* Memory List */}
      {settings.memory_enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Learned Patterns</CardTitle>
            <CardDescription>
              Patterns your AI has learned from observations. Toggle or delete as needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {memories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No patterns learned yet</p>
                <p className="text-sm">As your AI handles more calls, it will start recognizing patterns</p>
              </div>
            ) : (
              <div className="space-y-3">
                {memories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onToggle={(id, isActive) => toggleMemory.mutate({ memoryId: id, isActive })}
                    onDelete={(id) => deleteMemory.mutate(id)}
                    isToggling={isToggling}
                    isDeleting={isDeleting}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
