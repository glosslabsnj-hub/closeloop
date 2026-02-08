import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useKnowledgeUploads } from "@/hooks/useKnowledgeUploads";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Wand2, FileText, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const acceptedFormats = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx";
const MAX_TEXT_LENGTH = 50000; // 50k characters max for pasted text

interface InlineUploadButtonProps {
  /** The type of content this upload is for - used to hint expected document type */
  contentType: "menu" | "services" | "faqs" | "policies" | "hours" | "general";
  /** Optional callback when upload completes successfully */
  onUploadComplete?: () => void;
  /** Size variant: compact (small button), default (dashed border), prominent (highlighted card) */
  variant?: "default" | "compact" | "prominent";
  /** Custom class name */
  className?: string;
}

/**
 * InlineUploadButton - Upload files or paste text to auto-fill data
 */
export function InlineUploadButton({
  contentType,
  onUploadComplete,
  variant = "default",
  className
}: InlineUploadButtonProps) {
  const { tenant } = useAuth();
  const { createUpload } = useKnowledgeUploads();
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contentTypeLabels: Record<string, string> = {
    menu: "menu",
    services: "service list",
    faqs: "FAQ document",
    policies: "policies",
    hours: "hours",
    general: "document"
  };

  const sourceTypeMap: Record<string, string> = {
    menu: "menu_pdf",
    services: "services_doc",
    faqs: "faq_doc",
    policies: "general",
    hours: "general",
    general: "general"
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!tenant?.id) {
      toast.error("No tenant found. Please refresh and try again.");
      return;
    }

    const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      toast.error("Please upload a PDF, image, or document file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Please upload a file smaller than 10MB");
      return;
    }

    setIsProcessing(true);

    try {
      const source = await createUpload({
        fileName: file.name,
        sourceType: sourceTypeMap[contentType] as any
      });

      const filePath = `${tenant.id}/${source.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("knowledge-documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("knowledge-documents")
        .getPublicUrl(filePath);

      await supabase
        .from("knowledge_sources")
        .update({ file_url: urlData.publicUrl, status: "processing" })
        .eq("id", source.id);

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
          onClick: () => window.location.href = "/app/business-brain?section=knowledge"
        }
      });

      setDialogOpen(false);
      onUploadComplete?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!tenant?.id) {
      toast.error("No tenant found. Please refresh and try again.");
      return;
    }

    const trimmedText = pastedText.trim();
    if (!trimmedText) {
      toast.error("Please paste some text first.");
      return;
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      toast.error(`Text is too long. Maximum ${MAX_TEXT_LENGTH.toLocaleString()} characters allowed.`);
      return;
    }

    setIsProcessing(true);

    try {
      // Create a knowledge source record for pasted text
      const source = await createUpload({
        fileName: `Pasted ${contentTypeLabels[contentType]} (${new Date().toLocaleDateString()})`,
        sourceType: sourceTypeMap[contentType] as any
      });

      // Update status to processing
      await supabase
        .from("knowledge_sources")
        .update({ status: "processing" })
        .eq("id", source.id);

      // Call the edge function with the raw text instead of a file URL
      await supabase.functions.invoke("process-knowledge-upload", {
        body: {
          sourceId: source.id,
          tenantId: tenant.id,
          rawText: trimmedText,
          sourceType: sourceTypeMap[contentType],
          autoDetect: true
        }
      });

      toast.success("Text processed! Check the Review Queue to approve extracted items.", {
        action: {
          label: "Review",
          onClick: () => window.location.href = "/app/business-brain?section=knowledge"
        }
      });

      setPastedText("");
      setDialogOpen(false);
      onUploadComplete?.();
    } catch (error) {
      console.error("Text processing error:", error);
      toast.error(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const openDialog = () => {
    setDialogOpen(true);
    setActiveTab("upload");
    setPastedText("");
  };

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept={acceptedFormats}
      onChange={handleFileSelect}
      className="hidden"
    />
  );

  const uploadDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import your {contentTypeLabels[contentType]}</DialogTitle>
          <DialogDescription>
            Upload a file or paste text — AI will extract and organize the information for you.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "paste")} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <FileText className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="paste" className="gap-2">
              <ClipboardPaste className="h-4 w-4" />
              Paste Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                "hover:border-primary/50 hover:bg-primary/5",
                isProcessing && "opacity-50 pointer-events-none"
              )}
            >
              {fileInput}
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Processing your file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Click to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF, image, Word, or Excel file
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="paste" className="mt-4 space-y-4">
            <div>
              <Textarea
                placeholder={`Paste your ${contentTypeLabels[contentType]} here...\n\nFor example, copy your menu from your website, a list of services with prices, or FAQ content.`}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-[200px] resize-none"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {pastedText.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} characters
              </p>
            </div>
            <Button
              onClick={handleTextSubmit}
              disabled={isProcessing || !pastedText.trim()}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Extract & Import
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );

  if (variant === "compact") {
    return (
      <>
        {uploadDialog}
        <Button
          variant="outline"
          size="sm"
          onClick={openDialog}
          disabled={isProcessing}
          className={cn("gap-2", className)}
        >
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Import
        </Button>
      </>
    );
  }

  if (variant === "prominent") {
    return (
      <>
        {uploadDialog}
        <button
          onClick={openDialog}
          disabled={isProcessing}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed",
            "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50",
            "text-left transition-all duration-200 group",
            isProcessing && "opacity-50 pointer-events-none",
            className
          )}
        >
          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            {isProcessing ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : (
              <Wand2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">
              {isProcessing ? "Processing your content..." : `Import your ${contentTypeLabels[contentType]}`}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isProcessing 
                ? "AI is extracting items — check Review Queue when done"
                : "Upload a file or paste text — AI will extract and organize it"
              }
            </p>
          </div>
          {!isProcessing && (
            <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          )}
        </button>
      </>
    );
  }

  // Default variant
  return (
    <>
      {uploadDialog}
      <button
        onClick={openDialog}
        disabled={isProcessing}
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed",
          "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5",
          "text-sm text-muted-foreground hover:text-primary transition-colors",
          isProcessing && "opacity-50 pointer-events-none",
          className
        )}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
        <span>
          {isProcessing 
            ? "Processing..." 
            : `Import ${contentTypeLabels[contentType]} to auto-fill`
          }
        </span>
      </button>
    </>
  );
}
