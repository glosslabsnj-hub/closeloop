import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { useReferralTransfers } from "@/hooks/useReferralNetwork";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500",
  matched: "bg-blue-500/10 text-blue-500",
  transferring: "bg-amber-500/10 text-amber-500",
  failed: "bg-red-500/10 text-red-500",
  no_match: "bg-muted text-muted-foreground",
  searching: "bg-blue-500/10 text-blue-500",
  declined: "bg-muted text-muted-foreground",
};

export function ReferralTransferLog() {
  const { tenant } = useAuth();
  const { data: transfers, isLoading } = useReferralTransfers();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!transfers || transfers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No referral transfers yet. When your AI refers a caller or receives a referral, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Referral History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transfers.map((transfer) => {
            const isSent = transfer.source_tenant_id === tenant?.id;
            const direction = isSent ? "Sent" : "Received";
            const otherBusiness = transfer.target_business_name || "Unknown";
            const date = new Date(transfer.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={transfer.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isSent ? (
                    <ArrowRight className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : (
                    <ArrowLeft className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {direction}: {otherBusiness}
                      </span>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[transfer.status] || ""}
                      >
                        {transfer.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {transfer.service_requested}
                      {transfer.caller_name && ` - ${transfer.caller_name}`}
                      {transfer.caller_location && ` (${transfer.caller_location})`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-3">
                  {date}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
