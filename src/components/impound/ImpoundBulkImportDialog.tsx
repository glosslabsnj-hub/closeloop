/**
 * ImpoundBulkImportDialog - CSV import for existing impound inventory
 * 
 * Supports common spreadsheet formats with column mapping
 */

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Download 
} from "lucide-react";

interface ImpoundBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLotId?: string;
  onSuccess: () => void;
}

type ParsedRow = {
  license_plate?: string;
  license_plate_state?: string;
  vin?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  towed_from_address?: string;
  tow_reason?: string;
  towed_at?: string;
  notes?: string;
};

const COLUMN_ALIASES: Record<string, string[]> = {
  license_plate: ["plate", "license", "tag", "plate number", "license plate"],
  license_plate_state: ["state", "plate state", "st"],
  vin: ["vin", "vin number", "vehicle id"],
  vehicle_year: ["year", "yr", "model year"],
  vehicle_make: ["make", "manufacturer", "brand"],
  vehicle_model: ["model", "vehicle model"],
  vehicle_color: ["color", "colour", "vehicle color"],
  towed_from_address: ["address", "location", "towed from", "pickup address", "from"],
  tow_reason: ["reason", "tow reason", "cause"],
  towed_at: ["date", "tow date", "towed date", "towed at", "impound date"],
  notes: ["notes", "comments", "remarks"],
};

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function mapColumns(row: Record<string, string>): ParsedRow {
  const result: ParsedRow = {};
  
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (row[alias] !== undefined && row[alias] !== "") {
        (result as any)[field] = row[alias];
        break;
      }
    }
  }
  
  return result;
}

function parseDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {}
  
  return new Date().toISOString();
}

export function ImpoundBulkImportDialog({
  open,
  onOpenChange,
  defaultLotId,
  onSuccess,
}: ImpoundBulkImportDialogProps) {
  const { tenant } = useAuth();
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importStats, setImportStats] = useState<{ success: number; errors: number } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setImportStats(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows } = parseCSV(text);
      const mapped = rows.map(mapColumns).filter((r) => r.license_plate || r.vin);
      setParsedData(mapped);
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (parsedData.length === 0) throw new Error("No data to import");

      let success = 0;
      let errors = 0;

      for (const row of parsedData) {
        try {
          const { error } = await supabase.from("impound_vehicles").insert({
            tenant_id: tenant.id,
            lot_id: defaultLotId || null,
            license_plate: row.license_plate?.toUpperCase().replace(/\s/g, "") || null,
            license_plate_state: row.license_plate_state?.toUpperCase() || null,
            vin: row.vin?.toUpperCase() || null,
            vehicle_year: row.vehicle_year || null,
            vehicle_make: row.vehicle_make || null,
            vehicle_model: row.vehicle_model || null,
            vehicle_color: row.vehicle_color || null,
            towed_from_address: row.towed_from_address || null,
            tow_reason: row.tow_reason || null,
            notes: row.notes || null,
            towed_at: parseDate(row.towed_at),
            status: "in_lot",
          });

          if (error) {
            console.error("Import row error:", error);
            errors++;
          } else {
            success++;
          }
        } catch (err) {
          errors++;
        }
      }

      setImportStats({ success, errors });
      return { success, errors };
    },
    onSuccess: ({ success, errors }) => {
      if (errors === 0) {
        toast.success(`Imported ${success} vehicles successfully`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.warning(`Imported ${success} vehicles, ${errors} failed`);
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const downloadTemplate = () => {
    const template = `license_plate,state,vin,year,make,model,color,towed_from_address,tow_reason,towed_at,notes
ABC1234,CA,1HGBH41JXMN109186,2020,Honda,Civic,Blue,123 Main St,police_request,2024-01-15,Sample note
XYZ5678,TX,,2019,Toyota,Camry,White,456 Oak Ave,abandoned,2024-01-16,`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "impound_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setParsedData([]);
    setFileName("");
    setImportStats(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Impound Inventory
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import your existing impound lot inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Dropzone */}
          {parsedData.length === 0 ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? "Drop the CSV file here..."
                  : "Drag & drop a CSV file here, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports: license plate, VIN, year, make, model, color, address, tow reason
              </p>
            </div>
          ) : (
            <>
              {/* Preview */}
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  <strong>{fileName}</strong> - {parsedData.length} vehicles ready to import
                </AlertDescription>
              </Alert>

              <ScrollArea className="h-48 rounded border p-2">
                <div className="space-y-2 text-sm">
                  {parsedData.slice(0, 10).map((row, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <span className="font-mono font-medium">
                        {row.license_plate || row.vin?.slice(-6) || "—"}
                      </span>
                      <span className="text-muted-foreground">
                        {[row.vehicle_year, row.vehicle_make, row.vehicle_model]
                          .filter(Boolean)
                          .join(" ") || "Unknown vehicle"}
                      </span>
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <p className="text-center text-muted-foreground">
                      ...and {parsedData.length - 10} more
                    </p>
                  )}
                </div>
              </ScrollArea>

              {/* Import Stats */}
              {importStats && (
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{importStats.success} imported</span>
                  </div>
                  {importStats.errors > 0 && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{importStats.errors} failed</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {parsedData.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setParsedData([]);
                    setFileName("");
                    setImportStats(null);
                  }}
                >
                  Clear
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import {parsedData.length} Vehicles
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
