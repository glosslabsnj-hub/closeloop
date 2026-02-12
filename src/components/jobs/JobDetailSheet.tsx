import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ServiceChecklist } from "./ServiceChecklist";
import { JobTimeline } from "./JobTimeline";
import { JobNotificationToggles } from "./JobNotificationToggles";
import { useJobServiceItems } from "@/hooks/useJobServiceItems";
import { useActiveJobs, type ActiveJob, type JobStatus, type JobPriority } from "@/hooks/useActiveJobs";
import { useJobLabels } from "@/hooks/useJobLabels";
import { Progress } from "@/components/ui/progress";
import { Phone, User, Clock, AlertTriangle, Zap } from "lucide-react";

interface JobDetailSheetProps {
  job: ActiveJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "intake", label: "Intake" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "picked_up", label: "Picked Up" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS: { value: JobPriority; label: string; icon?: typeof AlertTriangle }[] = [
  { value: "normal", label: "Normal" },
  { value: "rush", label: "Rush", icon: Zap },
  { value: "urgent", label: "Urgent", icon: AlertTriangle },
];

export function JobDetailSheet({ job, open, onOpenChange }: JobDetailSheetProps) {
  const labels = useJobLabels();
  const { updateJob, updateJobStatus } = useActiveJobs();
  const {
    items,
    completedCount,
    totalCount,
    progressPercent,
    toggleItemStatus,
    addItem,
    removeItem,
  } = useJobServiceItems(job?.id ?? null);

  if (!job) return null;

  const handleStatusChange = (status: JobStatus) => {
    updateJobStatus.mutate({ id: job.id, status });
  };

  const handlePriorityChange = (priority: JobPriority) => {
    updateJob.mutate({ id: job.id, priority });
  };

  const handleToggleNotification = (field: "notify_on_step_complete" | "notify_on_all_complete", value: boolean) => {
    updateJob.mutate({ id: job.id, [field]: value });
  };

  const handleToggleItem = (itemId: string, currentStatus: string) => {
    toggleItemStatus.mutate({ itemId, currentStatus });
  };

  const handleAddItem = (title: string) => {
    addItem.mutate({ title });
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem.mutate(itemId);
  };

  const meta = (job.metadata_json || {}) as Record<string, unknown>;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            {job.job_number}
          </div>
          <SheetTitle className="text-lg">{job.title}</SheetTitle>
        </SheetHeader>

        {/* Status + Priority selectors */}
        <div className="flex items-center gap-3 pb-4">
          <Select value={job.status} onValueChange={(v) => handleStatusChange(v as JobStatus)}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={job.priority} onValueChange={(v) => handlePriorityChange(v as JobPriority)}>
            <SelectTrigger className="h-8 w-28 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Customer info */}
        {(job.customer_name || job.customer_phone) && (
          <div className="flex flex-col gap-1 pb-4 text-sm">
            {job.customer_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {job.customer_name}
              </div>
            )}
            {job.customer_phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {job.customer_phone}
              </div>
            )}
            {job.estimated_completion && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Est.{" "}
                {new Date(job.estimated_completion).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        {Object.keys(meta).length > 0 && (
          <div className="flex flex-wrap gap-2 pb-4">
            {labels.metadataFields
              .filter((f) => meta[f.key])
              .map((f) => (
                <Badge key={f.key} variant="secondary" className="text-xs">
                  {f.label}: {String(meta[f.key])}
                </Badge>
              ))}
          </div>
        )}

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="space-y-1 pb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {completedCount}/{totalCount} {labels.serviceSteps.toLowerCase()} complete
              </span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        <Separator className="mb-4" />

        {/* Tabbed content */}
        <Tabs defaultValue="checklist">
          <TabsList className="w-full">
            <TabsTrigger value="checklist" className="flex-1 text-xs">
              {labels.serviceSteps}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1 text-xs">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 text-xs">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="mt-4">
            <ServiceChecklist
              items={items}
              labels={labels}
              onToggle={handleToggleItem}
              onAdd={handleAddItem}
              onRemove={handleRemoveItem}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <JobTimeline jobId={job.id} />
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-4">
            <JobNotificationToggles
              notifyOnStepComplete={job.notify_on_step_complete}
              notifyOnAllComplete={job.notify_on_all_complete}
              onToggleStep={(v) => handleToggleNotification("notify_on_step_complete", v)}
              onToggleAll={(v) => handleToggleNotification("notify_on_all_complete", v)}
            />

            {job.notes && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
