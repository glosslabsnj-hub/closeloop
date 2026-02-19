import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminAdCampaigns, useUpdateAdCampaign, useDeleteAdCampaign, type AdminAdCampaign } from "@/hooks/useAdminAdCampaigns";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  linkedin: "LinkedIn Ads",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-700",
  active: "bg-green-500/10 text-green-700",
  completed: "bg-muted text-muted-foreground",
};

export function AdCampaignList() {
  const { data: campaigns, isLoading } = useAdminAdCampaigns();
  const updateCampaign = useUpdateAdCampaign();
  const deleteCampaign = useDeleteAdCampaign();
  const [deleteTarget, setDeleteTarget] = useState<AdminAdCampaign | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const copyAll = (campaign: AdminAdCampaign) => {
    const text = [
      `Platform: ${PLATFORM_LABELS[campaign.platform] || campaign.platform}`,
      `Industry: ${campaign.industry}`,
      `Location: ${campaign.location}`,
      "",
      "HEADLINES:",
      ...(campaign.headlines || []).map((h, i) => `  ${i + 1}. ${h}`),
      "",
      "DESCRIPTIONS:",
      ...(campaign.descriptions || []).map((d, i) => `  ${i + 1}. ${d}`),
      "",
      ...(campaign.keywords?.length ? ["KEYWORDS:", `  ${(campaign.keywords || []).join(", ")}`] : []),
      ...(campaign.cta ? [`\nCTA: ${campaign.cta}`] : []),
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Ad copy copied to clipboard");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!campaigns?.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No ad campaigns yet. Generate one above.</p>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">Saved Ad Campaigns</h3>
      {campaigns.map((campaign) => (
        <Card
          key={campaign.id}
          className="cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{campaign.name}</h4>
                  <Badge variant="outline" className="text-[10px]">
                    {PLATFORM_LABELS[campaign.platform] || campaign.platform}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[campaign.status] || ""}`}>
                    {campaign.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {campaign.industry} &middot; {campaign.location}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Select
                  value={campaign.status}
                  onValueChange={(v) => updateCampaign.mutate({ id: campaign.id, status: v })}
                >
                  <SelectTrigger className="h-7 text-xs w-[100px]" onClick={(e) => e.stopPropagation()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); copyAll(campaign); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDeleteTarget(campaign); }}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {expandedId === campaign.id && (
              <div className="mt-3 pt-3 border-t space-y-3 text-xs">
                {campaign.headlines?.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Headlines</p>
                    <div className="space-y-0.5">
                      {campaign.headlines.map((h: string, i: number) => (
                        <p key={i} className="bg-muted/50 px-2 py-1 rounded">{h}</p>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.descriptions?.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Descriptions</p>
                    <div className="space-y-0.5">
                      {campaign.descriptions.map((d: string, i: number) => (
                        <p key={i} className="bg-muted/50 px-2 py-1 rounded">{d}</p>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.keywords?.length > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {campaign.keywords.map((k: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{k}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.cta && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">CTA</p>
                    <p className="bg-muted/50 px-2 py-1 rounded">{campaign.cta}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ad campaign?</AlertDialogTitle>
            <AlertDialogDescription>Delete "{deleteTarget?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteCampaign.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
