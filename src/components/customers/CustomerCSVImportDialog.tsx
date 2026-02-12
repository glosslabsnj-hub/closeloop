import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CustomerCSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  name: string;
  phone: string;
  email: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vin: string;
  licensePlate: string;
  valid: boolean;
  error?: string;
}

function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.startsWith("+")) return raw.replace(/[^\d+]/g, "");
  return `+${digits}`;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h.includes("name"));
  const phoneIdx = headers.findIndex((h) => h.includes("phone"));
  const emailIdx = headers.findIndex((h) => h.includes("email"));
  const yearIdx = headers.findIndex((h) => h.includes("year"));
  const makeIdx = headers.findIndex((h) => h.includes("make"));
  const modelIdx = headers.findIndex((h) => h.includes("model"));
  const vinIdx = headers.findIndex((h) => h === "vin");
  const plateIdx = headers.findIndex((h) => h.includes("plate") || h.includes("license"));

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const name = nameIdx >= 0 ? cols[nameIdx] || "" : "";
    const phone = phoneIdx >= 0 ? cols[phoneIdx] || "" : "";
    const email = emailIdx >= 0 ? cols[emailIdx] || "" : "";
    const vehicleYear = yearIdx >= 0 ? cols[yearIdx] || "" : "";
    const vehicleMake = makeIdx >= 0 ? cols[makeIdx] || "" : "";
    const vehicleModel = modelIdx >= 0 ? cols[modelIdx] || "" : "";
    const vin = vinIdx >= 0 ? cols[vinIdx] || "" : "";
    const licensePlate = plateIdx >= 0 ? cols[plateIdx] || "" : "";

    const valid = !!name && !!phone;
    return {
      name, phone, email, vehicleYear, vehicleMake, vehicleModel, vin, licensePlate,
      valid,
      error: !name ? "Missing name" : !phone ? "Missing phone" : undefined,
    };
  });
}

export function CustomerCSVImportDialog({ open, onOpenChange }: CustomerCSVImportDialogProps) {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
      setResult(null);
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!tenant?.id) return;
    setImporting(true);
    setProgress(0);
    let imported = 0;
    let skipped = 0;
    const validRows = rows.filter((r) => r.valid);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const phoneE164 = normalizePhoneE164(row.phone);

        // Upsert customer
        const { data: existing } = await (supabase as any)
          .from("customers")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("phone_e164", phoneE164)
          .maybeSingle();

        let customerId: string;
        if (existing) {
          customerId = existing.id;
        } else {
          const { data: newCust, error } = await (supabase as any)
            .from("customers")
            .insert({
              tenant_id: tenant.id,
              full_name: row.name,
              phone_e164: phoneE164,
              phone_raw: row.phone,
              email: row.email || null,
              source: "csv_import",
            })
            .select("id")
            .single();
          if (error) throw error;
          customerId = newCust.id;
        }

        // Add vehicle if make or model provided
        if (row.vehicleMake || row.vehicleModel) {
          await (supabase as any)
            .from("customer_vehicles")
            .insert({
              tenant_id: tenant.id,
              customer_id: customerId,
              year: row.vehicleYear ? parseInt(row.vehicleYear) : null,
              make: row.vehicleMake || null,
              model: row.vehicleModel || null,
              vin: row.vin || null,
              license_plate: row.licensePlate || null,
            });
        }

        imported++;
      } catch {
        skipped++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setResult({ imported, skipped });
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    toast.success(`Imported ${imported} customers`);
  };

  const handleClose = () => {
    setRows([]);
    setResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  const validCount = rows.filter((r) => r.valid).length;
  const hasVehicleData = rows.some((r) => r.vehicleMake || r.vehicleModel);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: Name, Phone, Email, Vehicle Year, Vehicle Make, Vehicle Model, VIN, License Plate
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Drop your CSV here" : "Drag & drop a CSV file, or click to browse"}
            </p>
          </div>
        ) : result ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm">
              <strong>{result.imported}</strong> customers imported
              {result.skipped > 0 && <>, <strong>{result.skipped}</strong> skipped</>}
            </p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{validCount} valid</Badge>
              {rows.length - validCount > 0 && (
                <Badge variant="destructive">{rows.length - validCount} invalid</Badge>
              )}
              {hasVehicleData && <Badge variant="outline">Includes vehicles</Badge>}
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    {hasVehicleData && <TableHead>Vehicle</TableHead>}
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((row, i) => (
                    <TableRow key={i} className={!row.valid ? "opacity-50" : ""}>
                      <TableCell className="text-sm">{row.name || "—"}</TableCell>
                      <TableCell className="text-sm">{row.phone || "—"}</TableCell>
                      <TableCell className="text-sm">{row.email || "—"}</TableCell>
                      {hasVehicleData && (
                        <TableCell className="text-sm">
                          {[row.vehicleYear, row.vehicleMake, row.vehicleModel].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        {!row.valid && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 50 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing first 50 of {rows.length} rows
              </p>
            )}

            {importing && <Progress value={progress} className="h-2" />}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={importing}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importing || validCount === 0}>
                {importing ? `Importing... ${progress}%` : `Import ${validCount} Customers`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
