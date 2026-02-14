import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientPhone: string;
  recipientName?: string;
  customerId?: string;
  conversationId?: string;
}

const SMS_MAX_LENGTH = 1600;

export function SendSmsDialog({
  open,
  onOpenChange,
  recipientPhone,
  recipientName,
  customerId,
  conversationId,
}: SendSmsDialogProps) {
  const { currentTenantId } = useAuth();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const charCount = body.length;
  const segments = Math.ceil(charCount / 160) || 1;

  async function handleSend() {
    if (!body.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          to: recipientPhone,
          body: body.trim(),
          tenant_id: currentTenantId,
          customer_id: customerId,
          conversation_id: conversationId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Message sent");
      setBody("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send SMS");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Send SMS</DialogTitle>
          <DialogDescription>
            To: {recipientName ? `${recipientName} (${recipientPhone})` : recipientPhone}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="Type your message..."
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, SMS_MAX_LENGTH))}
          rows={4}
          autoFocus
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{charCount} / {SMS_MAX_LENGTH}</span>
          <span>{segments} segment{segments !== 1 ? "s" : ""}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !body.trim()}>
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
