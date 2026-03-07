import { useState } from "react";
import { useMessagingCampaigns, useCampaignRecipients } from "@/hooks/useMessagingCampaigns";
import { useMessagingTemplates } from "@/hooks/useMessagingTemplates";
import { useCustomers } from "@/hooks/useCustomers";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Send,
  Eye,
  Trash2,
  Megaphone,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  draft: { color: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  scheduled: { color: "bg-blue-500/10 text-blue-500", icon: <Clock className="h-3 w-3" /> },
  sending: { color: "bg-yellow-500/10 text-yellow-500", icon: <Send className="h-3 w-3" /> },
  completed: { color: "bg-green-500/10 text-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { color: "bg-red-500/10 text-red-500", icon: <XCircle className="h-3 w-3" /> },
};

export function CampaignsTab() {
  const { campaigns, isLoading, createCampaign, deleteCampaign } = useMessagingCampaigns();
  const { templates } = useMessagingTemplates();
  const { customers } = useCustomers();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", body: "", template_id: "" });

  const viewCampaign = campaigns.find((c) => c.id === viewId);

  function handleTemplateSelect(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    setForm({
      ...form,
      template_id: templateId,
      body: template?.body || form.body,
    });
  }

  function handleCreate() {
    if (!form.name.trim() || !form.body.trim()) return;
    const customersWithPhone = customers.filter((c) => c.phone_e164);
    createCampaign.mutate({
      name: form.name,
      body: form.body,
      template_id: form.template_id || null,
      recipient_count: customersWithPhone.length,
      audience_filter: { type: "all" },
    });
    setCreateOpen(false);
    setForm({ name: "", body: "", template_id: "" });
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading campaigns...</div>;
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <SectionCard>
          <div className="text-center py-8 text-muted-foreground">
            <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No campaigns yet.</p>
            <p className="text-xs mt-1">Create a campaign to send a message to multiple customers at once.</p>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => {
            const statusConf = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
            return (
              <SectionCard key={campaign.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate">{campaign.name}</h3>
                      <Badge className={`text-[10px] ${statusConf.color}`}>
                        {statusConf.icon}
                        <span className="ml-1 capitalize">{campaign.status}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {campaign.body}
                    </p>
                    <div className="flex gap-4 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {campaign.recipient_count || 0} recipients
                      </span>
                      {(campaign.sent_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {campaign.sent_count} sent
                        </span>
                      )}
                      {(campaign.delivered_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {campaign.delivered_count} delivered
                        </span>
                      )}
                      {(campaign.failed_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-3 w-3" />
                          {campaign.failed_count} failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setViewId(campaign.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {campaign.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCampaign.mutate(campaign.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
            <DialogDescription>
              Send a message to all your customers with active phone numbers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs">Campaign Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Spring Re-Engagement"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Start from Template (optional)</Label>
              <Select
                value={form.template_id || "none"}
                onValueChange={(v) => handleTemplateSelect(v === "none" ? "" : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Write from scratch</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Hey {{first_name}}! ..."
                rows={4}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {form.body.length} characters | Will be sent to{" "}
                {customers.filter((c) => c.phone_e164).length} customers with phone numbers
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || !form.body.trim()}>
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Campaign Dialog */}
      <CampaignDetailDialog
        campaign={viewCampaign || null}
        open={!!viewId}
        onOpenChange={(open) => !open && setViewId(null)}
      />
    </>
  );
}

function CampaignDetailDialog({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: { id: string; name: string; body: string; status: string; recipient_count: number | null; sent_count: number | null; delivered_count: number | null; failed_count: number | null; created_at: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { recipients, isLoading } = useCampaignRecipients(campaign?.id || null);

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campaign.name}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-xs">
            {campaign.body}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-muted/30 rounded-lg p-2">
            <div className="text-lg font-semibold">{campaign.recipient_count || 0}</div>
            <div className="text-[10px] text-muted-foreground">Recipients</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <div className="text-lg font-semibold">{campaign.sent_count || 0}</div>
            <div className="text-[10px] text-muted-foreground">Sent</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <div className="text-lg font-semibold">{campaign.delivered_count || 0}</div>
            <div className="text-[10px] text-muted-foreground">Delivered</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <div className="text-lg font-semibold text-destructive">{campaign.failed_count || 0}</div>
            <div className="text-[10px] text-muted-foreground">Failed</div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading recipients...</p>
        ) : recipients.length > 0 ? (
          <div className="max-h-64 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.customer?.full_name || "Unknown"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.phone_e164}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          r.status === "delivered" ? "text-green-500" :
                          r.status === "failed" ? "text-destructive" :
                          r.status === "sent" ? "text-blue-500" :
                          "text-muted-foreground"
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {r.sent_at ? new Date(r.sent_at).toLocaleString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            No recipients yet. Send the campaign to populate this list.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
