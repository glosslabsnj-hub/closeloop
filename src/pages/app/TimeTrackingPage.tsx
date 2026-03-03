import { useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Clock,
  Play,
  Square,
  Loader2,
  MoreHorizontal,
  Trash2,
  Download,
  Calendar,
  Coffee,
  Car,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useTimeTracking, TimeEntry } from "@/hooks/useTimeTracking";
import { useModuleRequired } from "@/hooks/useModuleRequired";

const entryTypeConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  work: { label: "Work", color: "bg-green-100 text-green-700", icon: Briefcase },
  break: { label: "Break", color: "bg-yellow-100 text-yellow-700", icon: Coffee },
  travel: { label: "Travel", color: "bg-blue-100 text-blue-700", icon: Car },
  admin: { label: "Admin", color: "bg-purple-100 text-purple-700", icon: Clock },
};

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatHoursDecimal(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

function TimeEntryRow({
  entry,
  onDelete,
}: {
  entry: TimeEntry;
  onDelete: () => void;
}) {
  const config = entryTypeConfig[entry.entry_type] || entryTypeConfig.work;
  const Icon = config.icon;
  const isActive = !entry.clock_out;

  return (
    <div className={cn(
      "flex items-center justify-between p-4 border rounded-lg",
      isActive && "border-green-500 bg-green-50 dark:bg-green-950/20"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center",
          isActive ? "bg-green-500 text-white animate-pulse" : "bg-muted"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">
              {format(new Date(entry.clock_in), "h:mm a")}
              {entry.clock_out && (
                <> — {format(new Date(entry.clock_out), "h:mm a")}</>
              )}
            </p>
            <Badge className={config.color}>{config.label}</Badge>
            {isActive && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(entry.clock_in), "EEEE, MMM d")}
            {entry.notes && <> • {entry.notes}</>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold text-lg">{formatDuration(entry.duration_minutes)}</p>
          {entry.duration_minutes && (
            <p className="text-xs text-muted-foreground">
              {formatHoursDecimal(entry.duration_minutes)} hrs
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function TimeTrackingPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["booking", "dispatch_queue", "job_tracking"]);
  const { entries, isLoading, stats, clockIn, clockOut, createEntry, deleteEntry } = useTimeTracking();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Manual entry form state
  const [manualDate, setManualDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualClockIn, setManualClockIn] = useState("09:00");
  const [manualClockOut, setManualClockOut] = useState("17:00");
  const [manualType, setManualType] = useState<TimeEntry["entry_type"]>("work");
  const [manualNotes, setManualNotes] = useState("");

  const handleClockIn = async (type: TimeEntry["entry_type"] = "work") => {
    await clockIn.mutateAsync({ entryType: type });
  };

  const handleClockOut = async () => {
    if (stats.activeEntry) {
      await clockOut.mutateAsync({ entryId: stats.activeEntry.id });
    }
  };

  const handleAddManual = async () => {
    const clockInDateTime = new Date(`${manualDate}T${manualClockIn}`);
    const clockOutDateTime = new Date(`${manualDate}T${manualClockOut}`);

    await createEntry.mutateAsync({
      clockIn: clockInDateTime.toISOString(),
      clockOut: clockOutDateTime.toISOString(),
      entryType: manualType,
      notes: manualNotes || undefined,
    });

    setAddDialogOpen(false);
    setManualNotes("");
  };

  const handleDelete = (entryId: string) => {
    setEntryToDelete(entryId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (entryToDelete) {
      await deleteEntry.mutateAsync(entryToDelete);
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const exportToCsv = () => {
    const headers = ["Date", "Clock In", "Clock Out", "Duration (hrs)", "Type", "Notes"];
    const rows = entries.map((e) => [
      format(new Date(e.clock_in), "yyyy-MM-dd"),
      format(new Date(e.clock_in), "HH:mm"),
      e.clock_out ? format(new Date(e.clock_out), "HH:mm") : "",
      e.duration_minutes ? formatHoursDecimal(e.duration_minutes) : "",
      e.entry_type,
      e.notes || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-entries-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (moduleLoading || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ErrorBoundary context="loading time tracking">
      <PageContainer maxWidth="xl">
        <PageHeader
          icon={<Clock className="h-5 w-5" />}
          title="Time Tracking"
          description="Track work hours, breaks, and travel time"
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Add Manual Entry
              </Button>
            </div>
          }
        />

        {/* Clock In/Out Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">
                  {stats.isClockedIn ? "Currently Working" : "Not Clocked In"}
                </h3>
                {stats.activeEntry && (
                  <p className="text-sm text-muted-foreground">
                    Started {formatDistanceToNow(new Date(stats.activeEntry.clock_in), { addSuffix: true })}
                    {" • "}
                    {entryTypeConfig[stats.activeEntry.entry_type]?.label}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {stats.isClockedIn ? (
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleClockOut}
                    disabled={clockOut.isPending}
                  >
                    {clockOut.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4 mr-2" />
                    )}
                    Clock Out
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      onClick={() => handleClockIn("work")}
                      disabled={clockIn.isPending}
                    >
                      {clockIn.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Clock In
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleClockIn("travel")}>
                          <Car className="h-4 w-4 mr-2" />
                          Start Travel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClockIn("admin")}>
                          <Briefcase className="h-4 w-4 mr-2" />
                          Start Admin Work
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.todayMinutes)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.todayEntries} entries
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.weekMinutes)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.weekEntries} entries
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Week Hours</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHoursDecimal(stats.weekMinutes)}</div>
              <p className="text-xs text-muted-foreground">
                decimal hours
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              {stats.isClockedIn ? (
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-muted" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isClockedIn ? "Active" : "Off"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.isClockedIn ? "Currently working" : "Not clocked in"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No time entries yet</h3>
                <p className="text-muted-foreground mb-4">
                  Clock in to start tracking your time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.slice(0, 50).map((entry) => (
                  <TimeEntryRow
                    key={entry.id}
                    entry={entry}
                    onDelete={() => handleDelete(entry.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>

      {/* Add Manual Entry Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Time Entry</DialogTitle>
            <DialogDescription>
              Add a time entry for work you forgot to track.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clockIn">Clock In</Label>
                <Input
                  id="clockIn"
                  type="time"
                  value={manualClockIn}
                  onChange={(e) => setManualClockIn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clockOut">Clock Out</Label>
                <Input
                  id="clockOut"
                  type="time"
                  value={manualClockOut}
                  onChange={(e) => setManualClockOut(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={manualType} onValueChange={(v) => setManualType(v as TimeEntry["entry_type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="break">Break</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="What did you work on?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddManual} disabled={createEntry.isPending}>
              {createEntry.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Time Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this time entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
