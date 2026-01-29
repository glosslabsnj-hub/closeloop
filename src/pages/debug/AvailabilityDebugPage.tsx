import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCalendarConnections,
  useBusyBlocks,
  useAvailableSlots,
  usePlaceHold,
  useConfirmBooking,
} from "@/hooks/useCalendarConnections";
import { format, addDays } from "date-fns";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lock,
  CalendarCheck,
  Loader2,
} from "lucide-react";

export default function AvailabilityDebugPage() {
  const { tenant } = useAuth();
  const { connections, isLoading: connectionsLoading, refetch: refetchConnections } = useCalendarConnections();
  
  const [dateRange] = useState({
    start: new Date(),
    end: addDays(new Date(), 7),
  });
  
  const { blocks, isLoading: blocksLoading, refetch: refetchBlocks, createBlock, deleteBlock } = useBusyBlocks(dateRange);
  
  const businessHours = tenant?.hours_json as unknown as Record<string, { open: string; close: string; closed?: boolean }> | undefined;
  
  const { data: slots, isLoading: slotsLoading, refetch: refetchSlots } = useAvailableSlots({
    startDate: dateRange.start,
    endDate: dateRange.end,
    durationMinutes: 60,
    bufferMinutes: 15,
    businessHours,
  });

  const placeHold = usePlaceHold();
  const confirmBooking = useConfirmBooking();

  const [testSlot, setTestSlot] = useState<{ start: string; end: string } | null>(null);
  const [holdId, setHoldId] = useState<string | null>(null);

  // Manual block form
  const [manualBlockStart, setManualBlockStart] = useState("");
  const [manualBlockEnd, setManualBlockEnd] = useState("");

  const handlePlaceHold = async () => {
    if (!testSlot) return;
    try {
      const id = await placeHold.mutateAsync({
        start_at: testSlot.start,
        end_at: testSlot.end,
        hold_minutes: 5,
        session_id: `debug-${Date.now()}`,
      });
      setHoldId(id);
    } catch (error) {
      console.error("Hold failed:", error);
    }
  };

  const handleConfirmBooking = async () => {
    if (!holdId) return;
    try {
      await confirmBooking.mutateAsync({
        hold_id: holdId,
        notes: "Created from debug page",
      });
      setHoldId(null);
      setTestSlot(null);
      refetchBlocks();
      refetchSlots();
    } catch (error) {
      console.error("Confirm failed:", error);
    }
  };

  const handleCreateManualBlock = async () => {
    if (!manualBlockStart || !manualBlockEnd) return;
    await createBlock.mutateAsync({
      start_at: manualBlockStart,
      end_at: manualBlockEnd,
      block_type: "manual_busy",
    });
    setManualBlockStart("");
    setManualBlockEnd("");
    refetchSlots();
  };

  const handleRefreshAll = () => {
    refetchConnections();
    refetchBlocks();
    refetchSlots();
  };

  const getBlockTypeBadge = (type: string) => {
    switch (type) {
      case "external_busy":
        return <Badge variant="secondary">External</Badge>;
      case "manual_busy":
        return <Badge variant="outline">Manual</Badge>;
      case "hold":
        return <Badge variant="warning">Hold</Badge>;
      case "confirmed_booking":
        return <Badge variant="success">Booking</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  if (!tenant) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Please log in to view availability debug info.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Availability Debug
          </h1>
          <p className="text-muted-foreground">
            View busy blocks, available slots, and test booking flow
          </p>
        </div>
        <Button variant="outline" onClick={handleRefreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Calendar Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendar Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {connectionsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : connections.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No calendar connections configured. Go to Settings → Schedule to connect.
            </p>
          ) : (
            <div className="space-y-2">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {conn.provider === "google" && "📅"}
                      {conn.provider === "microsoft" && "📧"}
                      {conn.provider === "ics" && "🔗"}
                      {conn.provider === "manual" && "✋"}
                    </span>
                    <div>
                      <p className="font-medium">{conn.display_name || conn.provider}</p>
                      <p className="text-xs text-muted-foreground">
                        Last sync: {conn.last_sync_at ? format(new Date(conn.last_sync_at), "PPp") : "Never"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={conn.status === "connected" ? "success" : "secondary"}>
                    {conn.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Busy Blocks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Busy Blocks</span>
              <Badge variant="outline">{blocks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add Manual Block */}
            <div className="mb-4 p-3 rounded-lg bg-muted/50 space-y-3">
              <p className="text-sm font-medium">Add Manual Block</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="datetime-local"
                    value={manualBlockStart}
                    onChange={(e) => setManualBlockStart(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">End</Label>
                  <Input
                    type="datetime-local"
                    value={manualBlockEnd}
                    onChange={(e) => setManualBlockEnd(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleCreateManualBlock}
                disabled={!manualBlockStart || !manualBlockEnd || createBlock.isPending}
              >
                {createBlock.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Add Block
              </Button>
            </div>

            {blocksLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : blocks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No busy blocks in the selected range.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-2 rounded border text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {getBlockTypeBadge(block.block_type)}
                        {block.expires_at && (
                          <span className="text-xs text-muted-foreground">
                            expires {format(new Date(block.expires_at), "HH:mm")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(block.start_at), "MMM d HH:mm")} - {format(new Date(block.end_at), "HH:mm")}
                      </p>
                    </div>
                    {block.block_type !== "confirmed_booking" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBlock.mutate(block.id)}
                      >
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Available Slots</span>
              <Badge variant="outline">{slots?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!businessHours ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Configure business hours in Settings to see available slots.
              </p>
            ) : slotsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !slots || slots.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No available slots in the selected range.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1">
                {slots.slice(0, 20).map((slot, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded border text-sm cursor-pointer transition-colors ${
                      testSlot?.start === slot.slot_start
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setTestSlot({ start: slot.slot_start, end: slot.slot_end })}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {format(new Date(slot.slot_start), "EEE, MMM d")} at{" "}
                        {format(new Date(slot.slot_start), "h:mm a")}
                      </span>
                    </div>
                    {testSlot?.start === slot.slot_start && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
                {slots.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    + {slots.length - 20} more slots
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Booking Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            Test Booking Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              {testSlot ? (
                <p className="text-sm">
                  Selected: <strong>{format(new Date(testSlot.start), "PPp")}</strong>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click a slot above to select it for testing
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePlaceHold}
                disabled={!testSlot || placeHold.isPending || !!holdId}
              >
                {placeHold.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                1. Place Hold
              </Button>

              <Button
                onClick={handleConfirmBooking}
                disabled={!holdId || confirmBooking.isPending}
              >
                {confirmBooking.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                2. Confirm Booking
              </Button>
            </div>
          </div>

          {holdId && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm">
                <strong>Hold placed!</strong> ID: <code className="text-xs">{holdId}</code>
                <br />
                <span className="text-muted-foreground">
                  This hold will expire in 5 minutes. Click "Confirm Booking" to convert it.
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Hours Preview */}
      {businessHours && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business Hours (from settings)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {Object.entries(businessHours).map(([day, hours]) => (
                <div key={day} className="p-2 rounded border text-center">
                  <p className="text-xs font-medium capitalize">{day}</p>
                  {hours.closed ? (
                    <p className="text-xs text-muted-foreground">Closed</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {hours.open} - {hours.close}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
