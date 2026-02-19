import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, MessageSquare } from "lucide-react";
import { useOutreachActions, type OutreachAction } from "@/hooks/useAdminOutreach";
import { formatDistanceToNow } from "date-fns";

interface OutreachActivityLogProps {
  campaignId: string;
}

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/10 text-green-700 border-green-500/20",
  delivered: "bg-green-500/10 text-green-700 border-green-500/20",
  failed: "bg-red-500/10 text-red-700 border-red-500/20",
  bounced: "bg-red-500/10 text-red-700 border-red-500/20",
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
};

export function OutreachActivityLog({ campaignId }: OutreachActivityLogProps) {
  const { data: actions, isLoading } = useOutreachActions(campaignId);

  if (isLoading) {
    return <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }

  if (!actions?.length) {
    return <p className="text-xs text-muted-foreground">No outreach actions yet.</p>;
  }

  return (
    <div className="space-y-1 max-h-60 overflow-y-auto">
      {actions.map((action) => (
        <ActionRow key={action.id} action={action} />
      ))}
    </div>
  );
}

function ActionRow({ action }: { action: OutreachAction }) {
  const Icon = action.action_type === "email" ? Mail : MessageSquare;

  return (
    <div className="flex items-start gap-2 text-xs py-1.5 px-2 rounded bg-muted/50">
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">{action.action_type}</span>
          <span className="text-muted-foreground">Step {action.step_order}</span>
          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${STATUS_COLORS[action.delivery_status] || ""}`}>
            {action.delivery_status}
          </Badge>
        </div>
        {action.subject_sent && (
          <p className="text-muted-foreground truncate mt-0.5">Subject: {action.subject_sent}</p>
        )}
        {action.delivery_error && (
          <p className="text-red-600 truncate mt-0.5">{action.delivery_error}</p>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(action.executed_at), { addSuffix: true })}
      </span>
    </div>
  );
}
