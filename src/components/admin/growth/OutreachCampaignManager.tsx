import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, MessageSquare, CheckCircle2, Loader2, Pause, Play, Trophy } from "lucide-react";
import {
  useOutreachCampaigns,
  useOutreachSequences,
  useCreateOutreachCampaign,
  useUpdateOutreachCampaign,
  useOutreachEnrollments,
  useMarkConverted,
  type OutreachCampaign,
} from "@/hooks/useAdminOutreach";
import { OutreachActivityLog } from "./OutreachActivityLog";

export function OutreachCampaignManager() {
  const { data: campaigns, isLoading } = useOutreachCampaigns();
  const { data: sequences } = useOutreachSequences();
  const createCampaign = useCreateOutreachCampaign();
  const updateCampaign = useUpdateOutreachCampaign();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSequenceId, setNewSequenceId] = useState("");
  const [newTargetType, setNewTargetType] = useState("business");

  const selectedCampaign = campaigns?.find((c) => c.id === selectedCampaignId);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const handleCreate = () => {
    if (!newName || !newSequenceId) return;
    createCampaign.mutate(
      { name: newName, sequence_id: newSequenceId, status: "active", target_type: newTargetType, filters: {} },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewSequenceId("");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Outreach Campaigns</h3>
          <p className="text-xs text-muted-foreground">Active campaigns with enrollment and response stats</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Campaign
        </Button>
      </div>

      <div className="grid gap-2">
        {(campaigns ?? []).map((campaign) => (
          <Card
            key={campaign.id}
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => setSelectedCampaignId(campaign.id === selectedCampaignId ? null : campaign.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{campaign.name}</h4>
                    <Badge
                      variant={campaign.status === "active" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {campaign.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {campaign.target_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {campaign.total_enrolled} enrolled</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {campaign.total_responded} responded</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {campaign.total_converted} converted</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCampaign.mutate({
                        id: campaign.id,
                        status: campaign.status === "active" ? "paused" : "active",
                      });
                    }}
                  >
                    {campaign.status === "active" ? (
                      <Pause className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {selectedCampaignId === campaign.id && (
                <div className="mt-3 pt-3 border-t">
                  <CampaignDetail campaign={campaign} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {(!campaigns || campaigns.length === 0) && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No campaigns yet. Create one to start outreach.
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Campaign Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" placeholder="e.g. Q1 HVAC Outreach" />
            </div>
            <div>
              <Label className="text-xs">Sequence</Label>
              <Select value={newSequenceId} onValueChange={setNewSequenceId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select sequence" /></SelectTrigger>
                <SelectContent>
                  {(sequences ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Target Type</Label>
              <Select value={newTargetType} onValueChange={setNewTargetType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="reseller">Reseller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createCampaign.isPending || !newName || !newSequenceId}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignDetail({ campaign }: { campaign: OutreachCampaign }) {
  const { data: enrollments, isLoading } = useOutreachEnrollments(campaign.id);
  const markConverted = useMarkConverted();
  const [view, setView] = useState<"enrollments" | "activity">("enrollments");

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={view === "enrollments" ? "default" : "outline"}
          onClick={() => setView("enrollments")}
          className="text-xs h-7"
        >
          Enrollments
        </Button>
        <Button
          size="sm"
          variant={view === "activity" ? "default" : "outline"}
          onClick={() => setView("activity")}
          className="text-xs h-7"
        >
          Activity Log
        </Button>
      </div>

      {view === "enrollments" && (
        isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !enrollments?.length ? (
          <p className="text-xs text-muted-foreground">No leads enrolled yet.</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.lead_name}</span>
                  <span className="text-muted-foreground">Step {e.current_step}</span>
                  {e.response_sentiment && (
                    <Badge variant="outline" className={`text-[9px] ${
                      e.response_sentiment === "positive" ? "text-green-700 border-green-300" :
                      e.response_sentiment === "negative" ? "text-red-700 border-red-300" :
                      "text-yellow-700 border-yellow-300"
                    }`}>
                      {e.response_sentiment}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(e.status === "responded" || e.status === "completed") && e.status !== "converted" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Mark as converted"
                      onClick={() => markConverted.mutate(e.id)}
                      disabled={markConverted.isPending}
                    >
                      <Trophy className="h-3 w-3 text-amber-500" />
                    </Button>
                  )}
                  <Badge
                    variant={
                      e.status === "converted" ? "default" :
                      e.status === "responded" ? "default" :
                      e.status === "active" ? "secondary" : "outline"
                    }
                    className={`text-[10px] ${e.status === "converted" ? "bg-emerald-500 text-white" : ""}`}
                  >
                    {e.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {view === "activity" && <OutreachActivityLog campaignId={campaign.id} />}
    </div>
  );
}
