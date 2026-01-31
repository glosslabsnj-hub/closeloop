import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, XCircle, RefreshCw, Trash2 } from "lucide-react";
import { useKnowledgeUploads, type KnowledgeSource } from "@/hooks/useKnowledgeUploads";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  uploading: { icon: Upload, color: "text-blue-500", label: "Uploading" },
  processing: { icon: RefreshCw, color: "text-yellow-500", label: "Processing" },
  ready: { icon: CheckCircle2, color: "text-green-500", label: "Ready" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
};

const sourceTypeLabels: Record<string, string> = {
  menu_pdf: "Menu PDF",
  pricing: "Pricing Document",
  services_doc: "Services Document",
  faq_doc: "FAQ Document",
  general: "General Document",
};

function UploadItem({
  upload,
  onDelete,
}: {
  upload: KnowledgeSource;
  onDelete: (id: string) => void;
}) {
  const config = statusConfig[upload.status] || statusConfig.processing;
  const Icon = config.icon;
  const isProcessing = upload.status === "uploading" || upload.status === "processing";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div className={cn("mt-0.5", config.color)}>
        <Icon className={cn("h-5 w-5", isProcessing && "animate-spin")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{upload.file_name}</p>
          <Badge variant="outline" className="text-xs">
            {sourceTypeLabels[upload.source_type] || upload.source_type}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant={upload.status === "failed" ? "destructive" : "secondary"}
            className="text-xs"
          >
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
          </span>
        </div>
        {upload.error_message && (
          <p className="text-xs text-destructive mt-1">{upload.error_message}</p>
        )}
        {isProcessing && (
          <Progress value={upload.status === "processing" ? 60 : 30} className="h-1 mt-2" />
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(upload.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ProcessingUploadsCard() {
  const { uploads, isLoading, deleteUpload } = useKnowledgeUploads();

  const processingUploads = uploads.filter(
    (u) => u.status === "uploading" || u.status === "processing"
  );
  const recentUploads = uploads.filter(
    (u) => u.status === "ready" || u.status === "failed"
  ).slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Processing */}
      {processingUploads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Currently Processing
            </CardTitle>
            <CardDescription>
              These documents are being analyzed. We'll extract knowledge and check for conflicts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {processingUploads.map((upload) => (
              <UploadItem key={upload.id} upload={upload} onDelete={deleteUpload} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Uploads */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recent Uploads
          </CardTitle>
          <CardDescription>Documents that have been processed or failed.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUploads.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded yet.</p>
              <p className="text-xs mt-1">
                Upload menus, pricing sheets, or service lists to speed up AI setup.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentUploads.map((upload) => (
                <UploadItem key={upload.id} upload={upload} onDelete={deleteUpload} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
