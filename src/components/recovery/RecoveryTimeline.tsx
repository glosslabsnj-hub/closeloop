import { format, formatDistanceToNow } from "date-fns";
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Check, 
  Clock, 
  Send,
  SkipForward,
  Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CampaignDetailAction, SequenceStep, CampaignDetailData } from "@/hooks/useCampaignDetail";

interface TimelineItem {
  type: "executed" | "upcoming";
  action?: CampaignDetailAction;
  step?: SequenceStep;
  time: string;
}

interface RecoveryTimelineProps {
  campaign: CampaignDetailData;
  onSendNow?: (step: SequenceStep) => void;
  onSkipStep?: (step: SequenceStep) => void;
}

const actionIcons: Record<string, typeof MessageSquare> = {
  sms: MessageSquare,
  ai_call: Phone,
  email: Mail,
};

const actionLabels: Record<string, string> = {
  sms: "SMS",
  ai_call: "AI Call",
  email: "Email",
  inbound_call: "Inbound Call",
  sms_response: "SMS Response",
};

function getActionLabel(actionType: string): string {
  return actionLabels[actionType] || actionType;
}

function getActionIcon(actionType: string) {
  return actionIcons[actionType] || MessageSquare;
}

export function RecoveryTimeline({ campaign, onSendNow, onSkipStep }: RecoveryTimelineProps) {
  // Build timeline items
  const timelineItems: TimelineItem[] = [];

  // Add executed actions
  campaign.actions.forEach((action) => {
    if (action.executed_at) {
      timelineItems.push({
        type: "executed",
        action,
        time: action.executed_at,
      });
    }
  });

  // Add upcoming steps
  if (campaign.status === "active") {
    const executedStepIds = campaign.actions
      .filter((a) => a.step_id)
      .map((a) => a.step_id);
    
    const upcomingSteps = campaign.allSteps.filter(
      (s) => !executedStepIds.includes(s.id)
    );

    let nextTime = campaign.next_action_at 
      ? new Date(campaign.next_action_at) 
      : new Date();

    upcomingSteps.forEach((step, index) => {
      if (index > 0) {
        nextTime = new Date(nextTime.getTime() + step.delay_minutes * 60 * 1000);
      }
      timelineItems.push({
        type: "upcoming",
        step,
        time: nextTime.toISOString(),
      });
    });
  }

  // Sort by time
  timelineItems.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recovery actions yet
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {timelineItems.map((item, index) => (
        <TimelineItemRow
          key={item.action?.id || item.step?.id || index}
          item={item}
          isLast={index === timelineItems.length - 1}
          campaignStatus={campaign.status}
          onSendNow={onSendNow}
          onSkipStep={onSkipStep}
        />
      ))}
    </div>
  );
}

interface TimelineItemRowProps {
  item: TimelineItem;
  isLast: boolean;
  campaignStatus: string;
  onSendNow?: (step: SequenceStep) => void;
  onSkipStep?: (step: SequenceStep) => void;
}

function TimelineItemRow({ 
  item, 
  isLast, 
  campaignStatus,
  onSendNow, 
  onSkipStep 
}: TimelineItemRowProps) {
  const isExecuted = item.type === "executed";
  const isUpcoming = item.type === "upcoming";
  const actionType = item.action?.action_type || item.step?.action_type || "sms";
  const Icon = getActionIcon(actionType);

  return (
    <div className="flex gap-4">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-3 h-3 rounded-full border-2 mt-1.5",
            isExecuted
              ? "bg-primary border-primary"
              : "bg-background border-muted-foreground"
          )}
        />
        {!isLast && (
          <div className={cn(
            "w-0.5 flex-1 min-h-8",
            isExecuted ? "bg-primary/30" : "bg-border"
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {format(new Date(item.time), "MMM d, h:mm a")}
            </span>
            <span className="text-sm font-medium">
              {getActionLabel(actionType)}
            </span>
          </div>

          {isExecuted && item.action?.delivery_status === "delivered" && (
            <Badge variant="outline" className="text-success border-success gap-1">
              <Check className="w-3 h-3" /> Delivered
            </Badge>
          )}
          {isExecuted && item.action?.delivery_status === "sent" && (
            <Badge variant="outline" className="text-primary border-primary gap-1">
              <Check className="w-3 h-3" /> Sent
            </Badge>
          )}
          {isUpcoming && (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
            </Badge>
          )}
        </div>

        {/* Message preview */}
        {(item.action?.message_sent || item.step?.message_template) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm border border-border/50">
            {item.action?.message_sent || item.step?.message_template}
          </div>
        )}

        {/* Response if any */}
        {item.action?.response_received && item.action.response_content && (
          <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-xs font-medium text-primary mb-1">Response:</p>
            <p className="text-sm">"{item.action.response_content}"</p>
            {item.action.response_sentiment && (
              <Badge 
                variant="outline" 
                className={cn(
                  "mt-2",
                  item.action.response_sentiment === "positive" && "text-success border-success",
                  item.action.response_sentiment === "negative" && "text-destructive border-destructive",
                )}
              >
                {item.action.response_sentiment}
              </Badge>
            )}
          </div>
        )}

        {/* Upcoming step actions */}
        {isUpcoming && campaignStatus === "active" && item.step && (
          <div className="flex items-center gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={() => onSendNow?.(item.step!)}
            >
              <Send className="w-3 h-3" /> Send Now
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={() => onSkipStep?.(item.step!)}
            >
              <SkipForward className="w-3 h-3" /> Skip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
