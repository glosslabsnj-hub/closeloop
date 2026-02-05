import { RefreshCw, CheckCircle, TrendingUp, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { CampaignStatus } from "@/hooks/useLeadRecoveryCampaigns";

interface RecoveryEmptyStateProps {
  status: CampaignStatus;
  isEnabled: boolean;
}

const emptyStates: Record<CampaignStatus, {
  icon: typeof RefreshCw;
  title: string;
  description: string;
}> = {
  all: {
    icon: RefreshCw,
    title: "No recovery campaigns yet",
    description: "When calls don't result in bookings, recovery campaigns will appear here.",
  },
  active: {
    icon: RefreshCw,
    title: "No active campaigns",
    description: "All leads have either converted or stopped.",
  },
  paused: {
    icon: CheckCircle,
    title: "No leads awaiting response",
    description: "You're all caught up! Great job.",
  },
  converted: {
    icon: TrendingUp,
    title: "No converted leads yet",
    description: "Keep following up - conversions will show here.",
  },
  stopped: {
    icon: XCircle,
    title: "No stopped campaigns",
    description: "Campaigns that you stop or that expire will appear here.",
  },
  declined: {
    icon: XCircle,
    title: "No declined campaigns",
    description: "Leads who opt out will appear here.",
  },
  expired: {
    icon: Clock,
    title: "No expired campaigns",
    description: "Campaigns that reach their time limit will appear here.",
  },
};

export function RecoveryEmptyState({ status, isEnabled }: RecoveryEmptyStateProps) {
  const config = emptyStates[status] || emptyStates.all;
  const Icon = config.icon;

  // Special case: recovery not enabled
  if (!isEnabled && status === "all") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <RefreshCw className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Lead Recovery Not Enabled</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          Automatically follow up with leads who don't book on their first call. 
          Enable lead recovery to start converting more leads.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/app/settings">Enable Lead Recovery →</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">{config.title}</h3>
      <p className="text-muted-foreground mt-2 max-w-md">
        {config.description}
      </p>
    </div>
  );
}
