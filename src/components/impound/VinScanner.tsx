/**
 * VinScanner - Camera capture + OCR for VIN extraction
 * Uses Lovable AI vision to extract VIN from photos
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface VinScannerProps {
  onVinDetected: (vin: string) => void;
  disabled?: boolean;
}

export function VinScanner({ onVinDetected, disabled }: VinScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      setPreview(base64);
      
      // Call edge function for OCR
      const response = await fetch("/api/vin-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to process image");
      }
      
      const data = await response.json();
      
      if (data.vin) {
        onVinDetected(data.vin);
        toast.success(`VIN detected: ${data.vin}`);
      } else {
        toast.error("Could not detect VIN in image. Try a clearer photo.");
      }
    } catch (error) {
      console.error("VIN OCR error:", error);
      toast.error("Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  }, [onVinDetected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Camera capture button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isProcessing}
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          Scan VIN
        </Button>
        
        {/* File upload button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isProcessing}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Preview */}
      {preview && (
        <div className="relative rounded-md overflow-hidden border">
          <img src={preview} alt="VIN scan" className="w-full h-24 object-cover" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 bg-background/80"
            onClick={clearPreview}
          >
            <X className="h-3 w-3" />
          </Button>
          {isProcessing && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
