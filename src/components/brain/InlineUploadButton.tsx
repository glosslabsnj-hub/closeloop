import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useKnowledgeUploads } from "@/hooks/useKnowledgeUploads";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const acceptedFormats = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx";

interface InlineUploadButtonProps {
  /** The type of content this upload is for - used to hint expected document type */
  contentType: "menu" | "services" | "faqs" | "policies" | "hours" | "general";
  /** Optional callback when upload completes successfully */
  onUploadComplete?: () => void;
  /** Size variant */
  variant?: "default" | "compact";
  /** Custom class name */
  className?: string;
}

/**
 * InlineUploadButton - A compact upload button that can be placed anywhere
 * 
 * Use this to give users a quick way to upload documents to populate data
 * without navigating to the Knowledge tab.
 */
export function InlineUploadButton({
  contentType,
  onUploadComplete,
  variant = "default",
  className
}: InlineUploadButtonProps) {
  const { tenant } = useAuth();
  const { createUpload } = useKnowledgeUploads();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!tenant?.id) {
      toast.error("No tenant found. Please refresh and try again.");
      return;
    }

    // Validate file type
    const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      toast.error("Please upload a PDF, image, or document file.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Please upload a file smaller than 10MB");
      return;
    }

    setIsUploading(true);

    try {
      // Map content type to source type
      const sourceTypeMap: Record<string, string> = {
        menu: "menu_pdf",
        services: "services_doc",
        faqs: "faq_doc",
        policies: "general",
        hours: "general",
        general: "general"
      };

      // 1. Create knowledge_sources record
      const source = await createUpload({
        fileName: file.name,
        sourceType: sourceTypeMap[contentType] as any
      });

      // 2. Upload file to storage
      const filePath = `${tenant.id}/${source.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from("knowledge-documents")
        .getPublicUrl(filePath);

      // 4. Update record with file URL
      await supabase
        .from("knowledge_sources")
        .update({ file_url: urlData.publicUrl, status: "processing" })
        .eq("id", source.id);

      // 5. Trigger processing edge function
      await supabase.functions.invoke("process-knowledge-upload", {
        body: {
          sourceId: source.id,
          tenantId: tenant.id,
          fileUrl: urlData.publicUrl,
          sourceType: "auto",
          autoDetect: true
        }
      });

      toast.success("Document uploaded! Check the Review Queue to approve extracted items.", {
        action: {
          label: "Review",
          onClick: () => window.location.href = "/app/business-brain?tab=review"
        }
      });

      onUploadComplete?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const contentTypeLabels: Record<string, string> = {
    menu: "menu",
    services: "service list",
    faqs: "FAQ document",
    policies: "policies",
    hours: "hours",
    general: "document"
  };

  if (variant === "compact") {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn("gap-2", className)}
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload
        </Button>
      </>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats}
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed",
          "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5",
          "text-sm text-muted-foreground hover:text-primary transition-colors",
          isUploading && "opacity-50 pointer-events-none",
          className
        )}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
        <span>
          {isUploading 
            ? "Processing..." 
            : `Upload a ${contentTypeLabels[contentType]} to auto-fill`
          }
        </span>
      </button>
    </>
  );
}
