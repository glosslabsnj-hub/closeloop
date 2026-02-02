import { useState } from "react";
import { useKnowledgeUploads, KnowledgeSourceType, KnowledgeSourceStatus } from "@/hooks/useKnowledgeUploads";
import { KnowledgeUploadHub } from "@/components/knowledge/KnowledgeUploadHub";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  UtensilsCrossed,
  Briefcase,
  HelpCircle,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const sourceTypeLabels: Record<KnowledgeSourceType, string> = {
  menu_pdf: "Menu",
  pricing: "Pricing",
  services_doc: "Services",
  faq_doc: "FAQs",
  general: "General",
};

const sourceTypeIcons: Record<KnowledgeSourceType, React.ElementType> = {
  menu_pdf: UtensilsCrossed,
  pricing: FileSpreadsheet,
  services_doc: Briefcase,
  faq_doc: HelpCircle,
  general: File,
};

function getFileIcon(fileName: string): React.ElementType {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return FileText;
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) return Image;
  if (["xlsx", "xls", "csv"].includes(ext || "")) return FileSpreadsheet;
  return File;
}

function getStatusBadge(status: KnowledgeSourceStatus) {
  switch (status) {
    case "uploading":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Uploading
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "ready":
      return (
        <Badge variant="default" className="gap-1 bg-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return null;
  }
}

export function BrainAssetsManager() {
  const { uploads, isLoading, deleteUpload, processingCount, readyCount, failedCount } = useKnowledgeUploads();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload");

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteUpload(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const totalUploads = uploads.length;
  const deletingAsset = uploads.find((u) => u.id === deleteConfirm);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">Upload New</TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            All Assets
            {totalUploads > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {totalUploads}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <KnowledgeUploadHub />
        </TabsContent>

        <TabsContent value="assets" className="mt-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{readyCount}</p>
                    <p className="text-xs text-muted-foreground">Processed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{processingCount}</p>
                    <p className="text-xs text-muted-foreground">Processing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/15 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{failedCount}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Asset List */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Assets</CardTitle>
              <CardDescription>
                All documents and images uploaded to your Business Brain
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-8">
                  <File className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm font-medium mb-2">No assets uploaded yet</p>
                  <p className="text-xs text-muted-foreground">
                    Upload documents in the "Upload New" tab to start building your knowledge base
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {uploads.map((upload) => {
                    const FileIcon = getFileIcon(upload.file_name);
                    const TypeIcon = sourceTypeIcons[upload.source_type] || File;

                    return (
                      <div
                        key={upload.id}
                        className="flex items-center justify-between py-3 gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{upload.file_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <TypeIcon className="h-3 w-3" />
                              <span>{sourceTypeLabels[upload.source_type]}</span>
                              <span className="text-muted-foreground/50">|</span>
                              <Calendar className="h-3 w-3" />
                              <span>{formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}</span>
                            </div>
                            {upload.error_message && (
                              <p className="text-xs text-destructive mt-1">{upload.error_message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(upload.status)}
                          {upload.file_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-8 w-8"
                            >
                              <a href={upload.file_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(upload.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAsset?.file_name}"? This will not remove any
              knowledge that was already approved from this upload.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
