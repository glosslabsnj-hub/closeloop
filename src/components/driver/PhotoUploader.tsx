import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, ImagePlus, X, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  tenantId: string;
  entityType: "impound" | "dispatch";
  entityId?: string;
  onPhotosChange?: (urls: string[]) => void;
  maxPhotos?: number;
  className?: string;
}

export function PhotoUploader({
  tenantId,
  entityType,
  entityId,
  onPhotosChange,
  maxPhotos = 5,
  className,
}: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadPhoto = async (file: File) => {
    if (photos.length >= maxPhotos) {
      toast({
        variant: "destructive",
        title: "Maximum photos reached",
        description: `You can only upload up to ${maxPhotos} photos.`,
      });
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${tenantId}/${entityType}/${entityId || "new"}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("dispatch-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("dispatch-photos")
        .getPublicUrl(filePath);

      const newPhotos = [...photos, urlData.publicUrl];
      setPhotos(newPhotos);
      onPhotosChange?.(newPhotos);

      toast({
        title: "Photo uploaded",
        description: "Photo added successfully.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadPhoto(files[0]);
    }
    // Reset input value so the same file can be uploaded again
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onPhotosChange?.(newPhotos);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img 
                src={url} 
                alt={`Photo ${index + 1}`} 
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 h-6 w-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Buttons */}
      {photos.length < maxPhotos && (
        <div className="grid grid-cols-2 gap-3">
          {/* Camera Button */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
            <span className="text-xs font-medium">Take Photo</span>
          </Button>

          {/* Gallery Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ImagePlus className="h-6 w-6" />
            )}
            <span className="text-xs font-medium">From Gallery</span>
          </Button>
        </div>
      )}

      {/* Photo Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {photos.length > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          {photos.length} of {maxPhotos} photos
        </span>
        {photos.length === 0 && (
          <span className="text-muted-foreground/70">Optional but recommended</span>
        )}
      </div>
    </div>
  );
}
