import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useKnowledgeUploads } from "@/hooks/useKnowledgeUploads";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  Upload,
  FileText,
  HelpCircle,
  Clock,
  Briefcase,
  UtensilsCrossed,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Loader2,
} from "lucide-react";
import { QuickAddFAQDialog } from "./QuickAddFAQDialog";
import { QuickAddServiceDialog } from "./QuickAddServiceDialog";
import { QuickAddPolicyDialog } from "./QuickAddPolicyDialog";

export function TeachAISection() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { businessMode } = useTenantConfig();
  const { context } = useBusinessContext(tenant?.id || null);
  const { createUpload, processingCount } = useKnowledgeUploads();

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!tenant?.id || files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        if (!allowedTypes.includes(file.type)) {
          toast({
            variant: "destructive",
            title: "Unsupported file type",
            description: `${file.name} is not supported. Use PDF, images, Word, or Excel.`,
          });
          continue;
        }

        // Upload to Supabase storage
        const fileName = `${tenant.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("knowledge-uploads")
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("knowledge-uploads")
          .getPublicUrl(fileName);

        // Create knowledge source record
        await createUpload({
          fileName: file.name,
          fileUrl: publicUrl,
          sourceType: "general",
        });

        // Trigger processing
        await supabase.functions.invoke("process-knowledge-upload", {
          body: { tenant_id: tenant.id, file_url: publicUrl, file_name: file.name },
        });
      }

      toast({
        title: "Files uploaded!",
        description: "AI is now extracting knowledge from your documents.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  }, [tenant?.id, createUpload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Knowledge summary
  const servicesCount = context?.services?.length || 0;
  const faqsCount = context?.faqs?.length || 0;
  const hasHours = context?.hours && Object.keys(context.hours).length > 0;
  const hasPolicies = !!(context?.policies.cancellation || context?.policies.deposit);

  // Missing items
  const missingItems: string[] = [];
  if (!context?.business.name) missingItems.push("Business name");
  if (!hasHours) missingItems.push("Business hours");
  if (faqsCount < 3) missingItems.push("FAQs");
  if (!hasPolicies) missingItems.push("Policies");
  if (businessMode === 'food' && servicesCount < 5) missingItems.push("Menu items");
  if (businessMode !== 'food' && servicesCount < 3) missingItems.push("Services");

  const quickAddButtons = [
    {
      icon: businessMode === 'food' ? UtensilsCrossed : Briefcase,
      label: businessMode === 'food' ? 'Menu Item' : 'Service',
      onClick: () => setServiceDialogOpen(true),
    },
    {
      icon: HelpCircle,
      label: 'FAQ',
      onClick: () => setFaqDialogOpen(true),
    },
    {
      icon: Clock,
      label: 'Hours',
      onClick: () => navigate('/app/settings'),
    },
    {
      icon: FileText,
      label: 'Policy',
      onClick: () => setPolicyDialogOpen(true),
    },
  ];

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Brain className="h-5 w-5 text-primary" />
            Teach Your AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm font-medium">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium mb-1">Drop files here to upload</p>
                <p className="text-xs text-muted-foreground">
                  PDF, Images, Word, Excel — we'll extract the knowledge
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </>
            )}
          </div>

          {/* Processing indicator */}
          {processingCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
              <span className="text-sm text-amber-400">
                Processing {processingCount} file{processingCount > 1 ? 's' : ''}...
              </span>
            </div>
          )}

          {/* Quick Add Section */}
          <div>
            <p className="text-xs text-muted-foreground text-center mb-3">— OR QUICK ADD —</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickAddButtons.map((btn) => (
                <Button
                  key={btn.label}
                  variant="outline"
                  size="sm"
                  className="gap-2 h-auto py-2.5"
                  onClick={btn.onClick}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Knowledge Summary */}
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">What AI knows:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={servicesCount > 0 ? 'text-emerald-400 border-emerald-500/30' : ''}>
                {servicesCount > 0 && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {servicesCount} {businessMode === 'food' ? 'Menu items' : 'Services'}
              </Badge>
              <Badge variant="outline" className={faqsCount > 0 ? 'text-emerald-400 border-emerald-500/30' : ''}>
                {faqsCount > 0 && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {faqsCount} FAQs
              </Badge>
              <Badge variant="outline" className={hasHours ? 'text-emerald-400 border-emerald-500/30' : ''}>
                {hasHours && <CheckCircle2 className="h-3 w-3 mr-1" />}
                Hours
              </Badge>
              <Badge variant="outline" className={hasPolicies ? 'text-emerald-400 border-emerald-500/30' : ''}>
                {hasPolicies && <CheckCircle2 className="h-3 w-3 mr-1" />}
                Policies
              </Badge>
            </div>

            {/* Missing items alert */}
            {missingItems.length > 0 && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-amber-400">
                    Missing: {missingItems.slice(0, 2).join(', ')}
                    {missingItems.length > 2 && ` +${missingItems.length - 2} more`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-amber-400 hover:text-amber-300 px-2"
                  onClick={() => navigate('/app/business-brain')}
                >
                  Fix
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Dialogs */}
      <QuickAddFAQDialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen} />
      <QuickAddServiceDialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen} />
      <QuickAddPolicyDialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen} />
    </>
  );
}
