import { useParams, useNavigate } from "react-router-dom";
import { useDriverJobs } from "@/hooks/useDriverJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, MapPin, Phone, Navigation, Clock, User, Truck, 
  FileText, AlertTriangle, Play, CheckCircle, ArrowRight,
  Loader2
} from "lucide-react";

function getNextStatus(current: string): string | null {
  switch (current) {
    case "assigned":
      return "en_route";
    case "en_route":
      return "on_site";
    case "on_site":
      return "completed";
    default:
      return null;
  }
}

function getNextStatusLabel(current: string): string {
  switch (current) {
    case "assigned":
      return "Start Route";
    case "en_route":
      return "Arrived On Site";
    case "on_site":
      return "Complete Job";
    default:
      return "Update Status";
  }
}

function getStatusIcon(current: string) {
  switch (current) {
    case "assigned":
      return <Play className="h-4 w-4" />;
    case "en_route":
      return <ArrowRight className="h-4 w-4" />;
    case "on_site":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return null;
  }
}

export default function DriverJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, isLoading, updateJobStatus } = useDriverJobs();

  const job = jobs.find(j => j.id === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold mb-2">Job Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This job may have been reassigned or doesn't exist.
            </p>
            <Button onClick={() => navigate("/driver")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDirections = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, "_blank");
  };

  const handleCall = () => {
    if (job.customer_phone) {
      window.open(`tel:${job.customer_phone}`);
    }
  };

  const handleStatusUpdate = () => {
    const nextStatus = getNextStatus(job.status);
    if (nextStatus) {
      updateJobStatus.mutate({ jobId: job.id, status: nextStatus });
    }
  };

  const nextStatus = getNextStatus(job.status);
  const isCompleted = job.status === "completed";

  return (
    <div className="p-4 space-y-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold">Job #{job.job_number || job.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">{job.job_type || "Dispatch Job"}</p>
        </div>
        {job.priority === "urgent" && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Urgent
          </Badge>
        )}
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium">{job.customer_name || "Unknown Customer"}</p>
            {job.customer_phone && (
              <Button variant="link" className="p-0 h-auto text-primary" onClick={handleCall}>
                <Phone className="h-3 w-3 mr-1" />
                {job.customer_phone}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Locations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.pickup_address && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pickup</p>
              <p className="text-sm mb-2">{job.pickup_address}</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleDirections(job.pickup_address!)}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            </div>
          )}

          {job.dropoff_address && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Drop-off</p>
                <p className="text-sm mb-2">{job.dropoff_address}</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleDirections(job.dropoff_address!)}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notes & Details */}
      {(job.notes || job.description) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {job.notes || job.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Info */}
      {job.assigned_vehicle && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{job.assigned_vehicle}</p>
          </CardContent>
        </Card>
      )}

      {/* Status Action Button */}
      {!isCompleted && nextStatus && (
        <div className="fixed bottom-20 left-4 right-4">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg"
            onClick={handleStatusUpdate}
            disabled={updateJobStatus.isPending}
          >
            {updateJobStatus.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              getStatusIcon(job.status)
            )}
            <span className="ml-2">{getNextStatusLabel(job.status)}</span>
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="fixed bottom-20 left-4 right-4">
          <Card className="bg-green-500/10 border-green-200">
            <CardContent className="py-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-700">Job Completed</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
