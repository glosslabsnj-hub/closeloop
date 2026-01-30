import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useKnowledgeUploads, KnowledgeSourceType } from "@/hooks/useKnowledgeUploads";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  UtensilsCrossed,
  Briefcase,
  HelpCircle,
  FileCheck,
  File
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DocumentTypeOption {
  value: KnowledgeSourceType;
  label: string;
  description: string;
  icon: React.ElementType;
  modes?: string[];
}

const documentTypes: DocumentTypeOption[] = [
  {
    value: "menu_pdf",
    label: "Menu",
    description: "Price list, menu PDF, or photos of your menu boards",
    icon: UtensilsCrossed,
    modes: ["food"]
  },
  {
    value: "services_doc",
    label: "Services & Pricing",
    description: "Service catalogs, pricing sheets, or rate cards",
    icon: Briefcase,
    modes: ["service", "dispatch", "medical", "general"]
  },
  {
    value: "pricing",
    label: "Price List",
    description: "General pricing document for any business type",
    icon: FileSpreadsheet
  },
  {
    value: "faq_doc",
    label: "FAQs",
    description: "Frequently asked questions document or knowledge base export",
    icon: HelpCircle
  },
  {
    value: "general",
    label: "Photos / Images",
    description: "Menu boards, storefront signs, or any business photos with text",
    icon: Image
  }
];

const acceptedFormats = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx";
const formatLabels = ["PDF", "PNG", "JPG", "DOCX", "XLSX"];

export function KnowledgeUploadHub() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { uploads, processingCount, createUpload, isCreating } = useKnowledgeUploads();
  const [selectedType, setSelectedType] = useState<KnowledgeSourceType>("general");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter document types based on business mode
  const availableTypes = documentTypes.filter(dt => 
    !dt.modes || dt.modes.includes(businessMode)
  );

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
  }, [selectedType]);

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

    try {
      // 1. Create knowledge_sources record
      const source = await createUpload({
        fileName: file.name,
        sourceType: selectedType
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
      const { error: fnError } = await supabase.functions.invoke("process-knowledge-upload", {
        body: {
          sourceId: source.id,
          tenantId: tenant.id,
          fileUrl: urlData.publicUrl,
          sourceType: selectedType
        }
      });

      if (fnError) {
        console.error("Processing error:", fnError);
        // Don't throw - the file is uploaded, processing will show in updates tab
      }

      setUploadProgress(100);
      toast({
        title: "Upload started",
        description: "Your document is being processed. Check the Updates tab for progress."
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const recentUploads = uploads.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
        <CardDescription>
          Speed up AI setup by uploading existing business documents. Your Business Brain is the source of truth — uploads are reviewed before updating your AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Type Selector */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select 
            value={selectedType} 
            onValueChange={(v) => setSelectedType(v as KnowledgeSourceType)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <p className="text-sm text-muted-foreground flex-1">
            {availableTypes.find(t => t.value === selectedType)?.description}
          </p>
        </div>

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
              <p className="text-sm font-medium">Uploading...</p>
              <Progress value={uploadProgress} className="max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                Drop your file here, or click to browse
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
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

        {/* Recent Uploads */}
        {recentUploads.length > 0 && (
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
              <Link to="/app/business-brain?tab=updates">
                View all uploads →
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
