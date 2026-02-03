import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useKnowledgeUploads } from "@/hooks/useKnowledgeUploads";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Image, 
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  File,
  Wand2
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const acceptedFormats = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx";
const formatLabels = ["PDF", "PNG", "JPG", "DOCX", "XLSX"];

interface UploadResult {
  detected_type: string;
  confidence: number;
  new_items: number;
  conflicts: number;
  matched: number;
}

export function KnowledgeUploadHub() {
  const { tenant } = useAuth();
  const { uploads, processingCount, createUpload } = useKnowledgeUploads();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!tenant?.id) {
      toast({
        title: "Error",
        description: "No tenant found. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Unsupported file type",
        description: `Please upload one of: ${formatLabels.join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setLastResult(null);

    try {
      // 1. Create knowledge_sources record with "auto" type (AI will detect)
      const source = await createUpload({
        fileName: file.name,
        sourceType: "general" // Will be auto-detected
      });
      setUploadProgress(20);

      // 2. Upload file to storage
      const filePath = `${tenant.id}/${source.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      setUploadProgress(50);

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from("knowledge-documents")
        .getPublicUrl(filePath);

      // 4. Update record with file URL
      await supabase
        .from("knowledge_sources")
        .update({ file_url: urlData.publicUrl, status: "processing" })
        .eq("id", source.id);
      setUploadProgress(60);

      // 5. Trigger processing edge function with auto-detect enabled
      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-knowledge-upload", {
        body: {
          sourceId: source.id,
          tenantId: tenant.id,
          fileUrl: urlData.publicUrl,
          sourceType: "auto", // Auto-detect mode
          autoDetect: true
        }
      });

      if (fnError) {
        console.error("Processing error:", fnError);
        toast({
          title: "Processing started",
          description: "Your document is being analyzed. Check the Review Queue for results."
        });
      } else if (fnData?.success) {
        setLastResult({
          detected_type: fnData.detected_type,
          confidence: fnData.confidence,
          new_items: fnData.new_items,
          conflicts: fnData.conflicts,
          matched: fnData.matched
        });
        
        const totalItems = fnData.new_items + fnData.conflicts;
        if (totalItems > 0) {
          toast({
            title: `${getTypeLabel(fnData.detected_type)} detected!`,
            description: `Found ${fnData.new_items} new items and ${fnData.conflicts} updates to review.`
          });
        } else if (fnData.matched > 0) {
          toast({
            title: "All items matched",
            description: `${fnData.matched} items already exist in your knowledge base.`
          });
        } else {
          toast({
            title: "Document processed",
            description: "No extractable items found in this document."
          });
        }
      }

      setUploadProgress(100);

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const recentUploads = uploads.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Smart Upload
        </CardTitle>
        <CardDescription>
          Drop any document or photo — menus, price lists, hours signs, FAQs — and we'll automatically extract the information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
            isUploading && "pointer-events-none opacity-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="space-y-4">
              <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium">Analyzing your document...</p>
                <p className="text-xs text-muted-foreground mt-1">AI is detecting the document type and extracting data</p>
              </div>
              <Progress value={uploadProgress} className="max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <div className="h-14 w-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                <Upload className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">
                Drop your menu, price list, or business photo here
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                We'll automatically figure out what it is and extract the information
              </p>
              <div className="flex items-center justify-center gap-2">
                {formatLabels.map((format) => (
                  <Badge key={format} variant="secondary" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Max file size: 10MB
              </p>
            </>
          )}
        </div>

        {/* Last Upload Result */}
        {lastResult && (
          <Card className="bg-muted/30 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-primary/10">
                      {getTypeLabel(lastResult.detected_type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(lastResult.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-primary">{lastResult.new_items}</p>
                      <p className="text-xs text-muted-foreground">New items</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-amber-500">{lastResult.conflicts}</p>
                      <p className="text-xs text-muted-foreground">Updates</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-emerald-500">{lastResult.matched}</p>
                      <p className="text-xs text-muted-foreground">Matched</p>
                    </div>
                  </div>
                  {(lastResult.new_items > 0 || lastResult.conflicts > 0) && (
                    <Button variant="link" size="sm" className="p-0 h-auto mt-2" asChild>
                      <Link to="/app/business-brain?tab=review">
                        Review extracted items →
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Uploads */}
        {recentUploads.length > 0 && !lastResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Recent Uploads</p>
              {processingCount > 0 && (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {processingCount} processing
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {recentUploads.map((upload) => (
                <div 
                  key={upload.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon fileName={upload.file_name} />
                    <span className="text-sm truncate">{upload.file_name}</span>
                  </div>
                  <UploadStatusBadge status={upload.status} />
                </div>
              ))}
            </div>
            <Button variant="link" size="sm" className="p-0 h-auto" asChild>
              <Link to="/app/business-brain?tab=assets">
                View all uploads →
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    menu_pdf: "Menu",
    menu: "Menu",
    services_doc: "Services",
    services: "Services",
    pricing: "Price List",
    hours: "Operating Hours",
    policies: "Policies",
    faq_doc: "FAQs",
    faq: "FAQs",
    general: "Document"
  };
  return labels[type] || "Document";
}

function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  
  if (ext === "pdf") return <FileText className="h-4 w-4 text-destructive" />;
  if (["png", "jpg", "jpeg"].includes(ext || "")) return <Image className="h-4 w-4 text-primary" />;
  if (["xlsx", "docx"].includes(ext || "")) return <FileSpreadsheet className="h-4 w-4 text-accent-foreground" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function UploadStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "uploading":
    case "processing":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "ready":
      return (
        <Badge variant="default" className="gap-1">
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
