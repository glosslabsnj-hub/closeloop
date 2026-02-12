import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface StatusUpdate {
  id: string;
  previous_status: string | null;
  new_status: string;
  message: string | null;
  triggered_notification: boolean;
  created_at: string;
}

interface JobTimelineProps {
  jobId: string;
}

const STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};

export function JobTimeline({ jobId }: JobTimelineProps) {
  const { data: updates, isLoading } = useQuery({
    queryKey: ["job-status-updates", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_status_updates")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as StatusUpdate[];
    },
    enabled: !!jobId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!updates?.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No status changes yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {updates.map((update) => (
        <div key={update.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
            <div className="w-px flex-1 bg-border" />
          </div>
          <div className="pb-4 min-w-0">
            <p className="text-sm">
              {update.previous_status
                ? `${STATUS_LABELS[update.previous_status] || update.previous_status} \u2192 ${STATUS_LABELS[update.new_status] || update.new_status}`
                : `Set to ${STATUS_LABELS[update.new_status] || update.new_status}`}
            </p>
            {update.message && (
              <p className="text-xs text-muted-foreground mt-0.5">{update.message}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(update.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {update.triggered_notification && " \u00b7 Notification sent"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
