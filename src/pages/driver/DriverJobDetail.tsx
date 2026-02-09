import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverJobs } from "@/hooks/useDriverJobs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, MapPin, Phone, Navigation, User, Truck, 
  FileText, AlertTriangle, Play, CheckCircle, ArrowRight,
  Loader2, Camera, DollarSign
} from "lucide-react";
import { PhotoUploader } from "@/components/driver/PhotoUploader";

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
      return <Play className="h-5 w-5" />;
    case "en_route":
      return <ArrowRight className="h-5 w-5" />;
    case "on_site":
      return <CheckCircle className="h-5 w-5" />;
    default:
      return null;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "assigned":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "en_route":
      return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "on_site":
      return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "completed":
      return "bg-green-500/10 text-green-600 border-green-200";
    default:
      return "";
  }
}

export default function DriverJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { jobs, isLoading, updateJobStatus, refetch } = useDriverJobs();
  const [photos, setPhotos] = useState<string[]>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);

  const job = jobs.find(j => j.id === id);

  const handleSavePhotos = async () => {
    if (!job || photos.length === 0) return;
    
    setSavingPhotos(true);
    try {
      // Get existing photos
      const existingPhotos = job.photos || [];
      const allPhotos = [...existingPhotos, ...photos];
      
      const { error } = await supabase
        .from("dispatch_jobs")
        .update({ photos: allPhotos })
        .eq("id", job.id);

      if (error) throw error;
      
      toast({ title: "Photos saved" });
      setPhotos([]);
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save photos",
      });
    } finally {
      setSavingPhotos(false);
    }
  };

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
  const isOnSite = job.status === "on_site";
  const existingPhotos = job.photos || [];

  const formatPrice = (cents: number | null) => {
    if (!cents) return null;
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="p-4 space-y-4 pb-36">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-lg">Job #{job.job_number || job.id.slice(0, 8)}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={getStatusColor(job.status)}>
              {job.status.replace("_", " ").toUpperCase()}
            </Badge>
            {job.priority === "urgent" && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Urgent
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Customer Info - Click to Call */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{job.customer_name || "Unknown Customer"}</p>
                <p className="text-sm text-muted-foreground">{job.job_type || "Dispatch Job"}</p>
              </div>
            </div>
            {job.customer_phone && (
              <Button size="icon" variant="outline" className="h-12 w-12" onClick={handleCall}>
                <Phone className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pickup Location - Primary Action */}
      {job.pickup_address && (
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">PICKUP</CardTitle>
              {job.estimated_arrival_at && job.status === "en_route" && (
                <Badge variant="outline" className="text-xs">
                  ETA: {new Date(job.estimated_arrival_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base">{job.pickup_address}</p>
            <Button 
              className="w-full h-12"
              onClick={() => handleDirections(job.pickup_address!)}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Navigate to Pickup
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Drop-off Location */}
      {job.dropoff_address && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">DROP-OFF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-base">{job.dropoff_address}</p>
            <Button 
              variant="outline"
              className="w-full h-12"
              onClick={() => handleDirections(job.dropoff_address!)}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Navigate to Drop-off
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Price Info */}
      {job.price_cents && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Job Total</span>
              </div>
              <span className="text-xl font-bold">{formatPrice(job.price_cents)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
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
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{job.assigned_vehicle}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Upload Section - Show when on site or completed */}
      {(isOnSite || isCompleted) && tenant?.id && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Job Photos
            </CardTitle>
            <CardDescription>
              {isOnSite ? "Take photos before completing the job" : "View or add job photos"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Photos */}
            {existingPhotos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Saved Photos ({existingPhotos.length})
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {existingPhotos.map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Uploader */}
            <PhotoUploader
              tenantId={tenant.id}
              entityType="dispatch"
              entityId={job.id}
              onPhotosChange={setPhotos}
              maxPhotos={8}
            />

            {/* Save Photos Button */}
            {photos.length > 0 && (
              <Button 
                className="w-full"
                onClick={handleSavePhotos}
                disabled={savingPhotos}
              >
                {savingPhotos ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  `Save ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Action Button */}
      {!isCompleted && nextStatus && (
        <div className="fixed bottom-20 left-4 right-4 z-10">
          <Button 
            size="lg" 
            className="w-full h-16 text-lg font-semibold shadow-lg"
            onClick={handleStatusUpdate}
            disabled={updateJobStatus.isPending}
          >
            {updateJobStatus.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
            ) : (
              getStatusIcon(job.status)
            )}
            <span className="ml-2">{getNextStatusLabel(job.status)}</span>
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="fixed bottom-20 left-4 right-4 z-10">
          <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="py-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <p className="font-medium text-green-700 dark:text-green-300">Job Completed</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
