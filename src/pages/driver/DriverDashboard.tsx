import { useDriverJobs, DriverJob } from "@/hooks/useDriverJobs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, MapPin, Phone, Navigation, Clock, ChevronRight, 
  AlertTriangle, CheckCircle2, Truck, Play 
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

function getStatusBadge(status: string) {
  switch (status) {
    case "assigned":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Assigned</Badge>;
    case "en_route":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">En Route</Badge>;
    case "on_site":
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">On Site</Badge>;
    case "completed":
      return <Badge className="bg-green-500/10 text-green-600 border-green-200">Completed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getPriorityBadge(priority: string) {
  if (priority === "urgent") {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Urgent</Badge>;
  }
  return null;
}

function JobCard({ job }: { job: DriverJob }) {
  const timeAgo = job.dispatched_at 
    ? formatDistanceToNow(new Date(job.dispatched_at), { addSuffix: true })
    : formatDistanceToNow(new Date(job.created_at), { addSuffix: true });

  const handleDirections = () => {
    if (job.pickup_address) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.pickup_address)}`;
      window.open(url, "_blank");
    }
  };

  const handleCall = () => {
    if (job.customer_phone) {
      window.open(`tel:${job.customer_phone}`);
    }
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-medium">
                #{job.job_number || job.id.slice(0, 8)}
              </span>
              {getStatusBadge(job.status)}
              {getPriorityBadge(job.priority)}
            </div>
            <p className="font-medium">{job.customer_name || "Unknown Customer"}</p>
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        {job.pickup_address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{job.pickup_address}</span>
          </div>
        )}

        {job.job_type && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Truck className="h-4 w-4" />
            <span>{job.job_type}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={handleDirections}>
            <Navigation className="h-4 w-4 mr-1" />
            Directions
          </Button>
          {job.customer_phone && (
            <Button size="sm" variant="outline" onClick={handleCall}>
              <Phone className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" asChild>
            <Link to={`/driver/jobs/${job.id}`}>
              Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DriverDashboard() {
  const { activeJobs, completedJobs, isLoading, driverRecord } = useDriverJobs();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!driverRecord) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold mb-2">Account Not Linked</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Your account is not yet linked to a driver profile. 
              Please contact your dispatcher to complete the setup.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-xl font-semibold">
          Hey, {driverRecord.full_name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          {activeJobs.length === 0 
            ? "No active jobs right now"
            : `You have ${activeJobs.length} active job${activeJobs.length !== 1 ? "s" : ""}`
          }
        </p>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Active Jobs
          </h2>
          {activeJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
            <h2 className="text-lg font-medium mb-1">All Caught Up</h2>
            <p className="text-sm text-muted-foreground">
              No jobs assigned to you right now. Check back later!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recently Completed */}
      {completedJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Recently Completed
          </h2>
          {completedJobs.slice(0, 3).map((job) => (
            <Card key={job.id} className="opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm">
                      #{job.job_number || job.id.slice(0, 8)}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {job.customer_name}
                    </p>
                  </div>
                  {getStatusBadge("completed")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
