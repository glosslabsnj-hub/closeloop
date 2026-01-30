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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBusyBlocks } from "@/hooks/useCalendarConnections";
import { format, addDays, setHours, setMinutes, parseISO } from "date-fns";
import { Loader2, Clock } from "lucide-react";

interface QuickBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

export function QuickBlockDialog({ open, onOpenChange, defaultDate }: QuickBlockDialogProps) {
  const { createBlock } = useBusyBlocks();
  const today = new Date();
  const tomorrow = addDays(today, 1);

  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow">(
    defaultDate && format(defaultDate, "yyyy-MM-dd") === format(tomorrow, "yyyy-MM-dd")
      ? "tomorrow"
      : "today"
  );
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const date = selectedDay === "today" ? today : tomorrow;
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startAt = setMinutes(setHours(date, startHour), startMin);
    const endAt = setMinutes(setHours(date, endHour), endMin);

    await createBlock.mutateAsync({
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      block_type: "manual_busy",
      metadata_json: reason ? { reason } : {},
    });

    // Reset and close
    setReason("");
    setStartTime("12:00");
    setEndTime("13:00");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Block Time</DialogTitle>
              <DialogDescription>
                Temporarily block a time slot so your AI won't book it
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Day Selection */}
          <div className="space-y-2">
            <Label>When?</Label>
            <RadioGroup
              value={selectedDay}
              onValueChange={(v) => setSelectedDay(v as "today" | "tomorrow")}
              className="flex gap-4"
            >
              <label
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDay === "today"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="today" className="sr-only" />
                <div className="text-center">
                  <p className="font-medium">Today</p>
                  <p className="text-sm text-muted-foreground">{format(today, "MMM d")}</p>
                </div>
              </label>
              <label
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDay === "tomorrow"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="tomorrow" className="sr-only" />
                <div className="text-center">
                  <p className="font-medium">Tomorrow</p>
                  <p className="text-sm text-muted-foreground">{format(tomorrow, "MMM d")}</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Reason (optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Lunch, Personal errand"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBlock.isPending}>
              {createBlock.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Block Time
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
