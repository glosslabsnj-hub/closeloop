import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { createService } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface ServiceCSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  name: string;
  description: string;
  duration_minutes: number;
  price_amount: string;
  price_type: string;
}

interface ValidationError {
  row: number;
  message: string;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });

  return { headers, rows };
}

const CSV_TEMPLATE = `name,description,duration_minutes,price,price_type
"Full Detail","Complete interior and exterior detail",180,250,starting_at
"Interior Detail","Deep clean of all interior surfaces",120,150,fixed
"Exterior Wash & Wax","Hand wash with wax finish",60,75,fixed
"Paint Correction","Multi-stage paint correction","","",quote_only`;

const VALID_PRICE_TYPES = ["fixed", "starting_at", "quote_only"];

export function ServiceCSVImportDialog({ open, onOpenChange }: ServiceCSVImportDialogProps) {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "services_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { headers, rows } = parseCSV(text);

      const headerMap: Record<string, number> = {};
      headers.forEach((h, i) => { headerMap[h] = i; });

      const parsed: ParsedRow[] = rows.map((row) => ({
        name: row[headerMap["name"]] || "",
        description: row[headerMap["description"]] || "",
        duration_minutes: parseInt(row[headerMap["duration_minutes"] ?? headerMap["duration"]] || "60") || 60,
        price_amount: row[headerMap["price"] ?? headerMap["price_amount"]] || "",
        price_type: row[headerMap["price_type"]] || "fixed",
      }));

      const validationErrors: ValidationError[] = [];
      parsed.forEach((row, i) => {
        if (!row.name) {
          validationErrors.push({ row: i + 2, message: "Name is required" });
        }
        if (row.price_type && !VALID_PRICE_TYPES.includes(row.price_type.toLowerCase())) {
          validationErrors.push({ row: i + 2, message: `Invalid price type: "${row.price_type}"` });
        }
      });

      setParsedRows(parsed);
      setErrors(validationErrors);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (errors.length > 0 || !tenant?.id) return;

    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of parsedRows) {
      try {
        const priceType = (VALID_PRICE_TYPES.includes(row.price_type.toLowerCase())
          ? row.price_type.toLowerCase()
          : "fixed") as "fixed" | "starting_at" | "quote_only";

        await createService(tenant.id, {
          name: row.name,
          description: row.description || undefined,
          duration_minutes: row.duration_minutes,
          price_type: priceType,
          price_amount: row.price_amount ? parseFloat(row.price_amount) : undefined,
        });
        success++;
      } catch {
        failed++;
      }
    }

    setImporting(false);
    setResult({ success, failed });
    queryClient.invalidateQueries({ queryKey: ["services"] });
    queryClient.invalidateQueries({ queryKey: ["business-context"] });
    toast.success(`${success} service${success !== 1 ? "s" : ""} imported!`);
  };

  const handleClose = () => {
    setParsedRows([]);
    setErrors([]);
    setResult(null);
    onOpenChange(false);
  };

  const formatPrice = (row: ParsedRow) => {
    if (row.price_type.toLowerCase() === "quote_only") return "Quote";
    if (!row.price_amount) return "—";
    const prefix = row.price_type.toLowerCase() === "starting_at" ? "From " : "";
    return `${prefix}$${row.price_amount}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Services from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-3.5 w-3.5 mr-2" />
            Download Template
          </Button>

          <div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-2" />
              Upload CSV
            </Button>
          </div>

          {parsedRows.length > 0 && (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Price</th>
                    <th className="text-left p-2 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 15).map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">{row.name || "—"}</td>
                      <td className="p-2">
                        <Badge variant="secondary" className="text-[10px]">{formatPrice(row)}</Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{row.duration_minutes}min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 15 && (
                <p className="text-xs text-muted-foreground p-2 text-center">
                  ...and {parsedRows.length - 15} more rows
                </p>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md space-y-1">
              <div className="flex items-center gap-2 font-medium text-sm">
                <AlertCircle className="h-4 w-4" />
                {errors.length} validation error{errors.length !== 1 ? "s" : ""}
              </div>
              {errors.slice(0, 5).map((err, i) => (
                <p key={i} className="text-xs">Row {err.row}: {err.message}</p>
              ))}
            </div>
          )}

          {result && (
            <div className="bg-primary/10 text-primary p-3 rounded-md flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">
                {result.success} imported{result.failed > 0 && `, ${result.failed} failed`}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? "Done" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={parsedRows.length === 0 || errors.length > 0 || importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import {parsedRows.length} Service{parsedRows.length !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
