import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignWithDetails } from "@/hooks/useLeadRecoveryCampaigns";

interface SendSmsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignWithDetails | null;
  tenantId: string;
  onSuccess?: () => void;
}

const quickTemplates = [
  {
    id: "followup",
    name: "Follow Up",
    content: "Hi {{name}}, just checking in about {{service}}. Would you like to schedule? Reply YES to confirm or call us anytime.",
  },
  {
    id: "availability",
    name: "Availability",
    content: "Hi {{name}}, we have openings this week for {{service}}. Would any of these times work for you?",
  },
  {
    id: "special",
    name: "Special Offer",
    content: "Hi {{name}}, we'd love to help with your {{service}} needs. We have a special offer just for you - call us to learn more!",
  },
  {
    id: "callback",
    name: "Callback",
    content: "Hi {{name}}, we noticed you were interested in {{service}}. When's a good time for us to call you back?",
  },
];

function resolveTemplate(template: string, campaign: CampaignWithDetails): string {
  const name = campaign.customer?.full_name?.split(" ")[0] || "there";
  const service = campaign.original_service_interest || campaign.original_intent || "our services";
  
  return template
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{service\}\}/g, service);
}

export function SendSmsModal({ 
  open, 
  onOpenChange, 
  campaign, 
  tenantId,
  onSuccess 
}: SendSmsModalProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSelectTemplate = (template: typeof quickTemplates[0]) => {
    if (campaign) {
      setMessage(resolveTemplate(template.content, campaign));
    }
  };

  const handleSend = async () => {
    if (!campaign || !message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-sms", {
        body: {
          to: campaign.customer?.phone_e164,
          body: message,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      // Log the manual action
      await supabase.from("lead_recovery_actions").insert({
        campaign_id: campaign.id,
        action_type: "sms",
        executed_at: new Date().toISOString(),
        message_sent: message,
        delivery_status: "sent",
      });

      // Update campaign
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          total_attempts: campaign.total_attempts + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      toast.success("SMS sent successfully");
      onOpenChange(false);
      setMessage("");
      onSuccess?.();
    } catch (error) {
      console.error("Error sending SMS:", error);
      toast.error("Failed to send SMS");
    } finally {
      setSending(false);
    }
  };

  const customerName = campaign?.customer?.full_name || "Customer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send SMS to {customerName}</DialogTitle>
          <DialogDescription>
            {campaign?.customer?.phone_e164}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick templates */}
          <div>
            <Label className="text-sm">Quick Templates</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {quickTemplates.map((template) => (
                <Badge
                  key={template.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleSelectTemplate(template)}
                >
                  {template.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Message input */}
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Type your message..."
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/160 characters
              {message.length > 160 && (
                <span className="text-warning"> ({Math.ceil(message.length / 160)} segments)</span>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            {sending ? "Sending..." : "Send SMS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
