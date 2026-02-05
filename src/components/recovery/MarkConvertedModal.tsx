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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { CampaignWithDetails } from "@/hooks/useLeadRecoveryCampaigns";
import { useRecentBookings } from "@/hooks/useLeadRecoveryCampaigns";

interface MarkConvertedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignWithDetails | null;
  onSuccess?: () => void;
}

export function MarkConvertedModal({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: MarkConvertedModalProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [recoveredValue, setRecoveredValue] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: recentBookings = [] } = useRecentBookings();

  const handleConvert = async () => {
    if (!campaign) return;

    const valueCents = recoveredValue 
      ? Math.round(parseFloat(recoveredValue) * 100) 
      : null;

    setSaving(true);
    try {
      const updateData = {
        status: "converted" as const,
        converted_at: new Date().toISOString(),
        converted_booking_id: selectedBookingId || null,
        recovered_value_cents: valueCents,
      };
      
      const { error } = await supabase
        .from("lead_recovery_campaigns")
        .update(updateData)
        .eq("id", campaign.id);

      if (error) throw error;

      toast.success("Campaign marked as converted!");
      onOpenChange(false);
      setSelectedBookingId("");
      setRecoveredValue("");
      onSuccess?.();
    } catch (error) {
      console.error("Error marking as converted:", error);
      toast.error("Failed to mark as converted");
    } finally {
      setSaving(false);
    }
  };

  const customerName = campaign?.customer?.full_name || "Customer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Converted</DialogTitle>
          <DialogDescription>
            Record the conversion for {customerName}. Link to a booking or enter the value manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link to existing booking */}
          <div>
            <Label htmlFor="booking">Link to Booking (optional)</Label>
            <select
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
            >
              <option value="">No booking</option>
              {recentBookings.map((booking: any) => (
                <option key={booking.id} value={booking.id}>
                  {booking.service?.name || "Service"} - {format(new Date(booking.start_at), "MMM d, h:mm a")}
                </option>
              ))}
            </select>
          </div>

          {/* Recovered value */}
          <div>
            <Label htmlFor="value">Recovered Value ($)</Label>
            <Input
              id="value"
              type="number"
              placeholder="250.00"
              value={recoveredValue}
              onChange={(e) => setRecoveredValue(e.target.value)}
              className="mt-1"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the booking value or estimated revenue recovered
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={saving}>
            {saving ? "Saving..." : "Mark Converted"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
