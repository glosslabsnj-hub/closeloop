// Upload component for services/pricing sheets in onboarding Step 2
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileText, 
  Image, 
  FileSpreadsheet,
  Loader2,
  File,
  AlertTriangle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const acceptedFormats = ".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.docx";
const formatLabels = ["PDF", "PNG", "JPG", "CSV", "XLSX", "DOCX"];

interface ServiceUploaderProps {
  tenantId?: string;
  onUploadComplete?: (sourceId: string) => void;
  onConflictsFound?: (count: number) => void;
  compact?: boolean;
}

export function ServiceUploader({ 
  tenantId, 
  onUploadComplete, 
  onConflictsFound,
  compact = false 
}: ServiceUploaderProps) {
  const { tenant } = useAuth();
  const effectiveTenantId = tenantId || tenant?.id;
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  }, [effectiveTenantId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!effectiveTenantId) {
      toast.error("Please complete Step 1 first");
      return;
    }

    // Validate file type
    const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx", ".docx"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      setErrorMessage(`Unsupported file type. Please upload: ${formatLabels.join(", ")}`);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File too large. Please upload a file smaller than 10MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatus("processing");
    setErrorMessage(null);

    try {
      // 1. Create knowledge_sources record
      const { data: source, error: createError } = await supabase
        .from("knowledge_sources")
        .insert({
          tenant_id: effectiveTenantId,
          file_name: file.name,
          source_type: "services_doc",
          status: "uploading",
        })
        .select()
        .single();

      if (createError) throw new Error(createError.message);
      setUploadProgress(20);

      // 2. Upload file to storage
      const filePath = `${effectiveTenantId}/${source.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      setUploadProgress(60);

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from("knowledge-documents")
        .getPublicUrl(filePath);

      // 4. Update record with file URL
      await supabase
        .from("knowledge_sources")
        .update({ file_url: urlData.publicUrl, status: "processing" })
        .eq("id", source.id);
      setUploadProgress(80);

      // 5. Trigger processing edge function
      const { data: processResult, error: fnError } = await supabase.functions.invoke(
        "process-knowledge-upload",
        {
          body: {
            sourceId: source.id,
            tenantId: effectiveTenantId,
            fileUrl: urlData.publicUrl,
            sourceType: "services_doc"
          }
        }
      );

      setUploadProgress(100);

      if (fnError) {
        console.error("Processing error:", fnError);
        setUploadStatus("complete");
        toast.info("Upload complete. Processing may take a moment.");
      } else {
        setUploadStatus("complete");
        
        if (processResult?.conflictsCreated > 0) {
          onConflictsFound?.(processResult.conflictsCreated);
          toast.info(`Found ${processResult.conflictsCreated} items that differ from your entered services.`);
        } else if (processResult?.suggestionsCreated > 0) {
          toast.success(`Extracted ${processResult.suggestionsCreated} services from your document.`);
        } else {
          toast.success("Document processed successfully.");
        }
      }

      onUploadComplete?.(source.id);

    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset after a delay
      setTimeout(() => {
        if (uploadStatus !== "error") {
          setUploadProgress(0);
          setUploadStatus("idle");
        }
      }, 3000);
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>Have an existing pricing sheet? Upload it and we'll extract your services.</span>
        </div>
        
        <div
          className={cn(
            "border border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
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
            <div className="space-y-2">
              <Loader2 className="h-5 w-5 mx-auto animate-spin text-primary" />
              <p className="text-xs">Processing...</p>
              <Progress value={uploadProgress} className="max-w-[200px] mx-auto h-1" />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Drop file or click to upload</span>
            </div>
          )}
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-1">
          {formatLabels.map((format) => (
            <Badge key={format} variant="outline" className="text-xs">
              {format}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Services/Pricing Sheet
          <Badge variant="secondary" className="ml-auto text-xs">Optional</Badge>
        </CardTitle>
        <CardDescription className="text-sm">
          If you upload a sheet, we'll extract services and prices and compare them to what you entered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
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
            <div className="space-y-3">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm font-medium">
                {uploadStatus === "processing" ? "Processing document..." : "Uploading..."}
              </p>
              <Progress value={uploadProgress} className="max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                Drop your pricing sheet here, or click to browse
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                {formatLabels.map((format) => (
                  <Badge key={format} variant="secondary" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Max file size: 10MB
              </p>
            </>
          )}
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  
  if (ext === "pdf") return <FileText className="h-4 w-4 text-destructive" />;
  if (["png", "jpg", "jpeg"].includes(ext || "")) return <Image className="h-4 w-4 text-primary" />;
  if (["xlsx", "csv", "docx"].includes(ext || "")) return <FileSpreadsheet className="h-4 w-4 text-accent-foreground" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}
