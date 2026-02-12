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
import { useActiveJobs } from "@/hooks/useActiveJobs";
import { useJobLabels } from "@/hooks/useJobLabels";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  customer_name: string;
  customer_phone: string;
  title: string;
  priority: string;
  notes: string;
  services: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
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

function validateRows(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const validPriorities = ["normal", "rush", "urgent"];

  rows.forEach((row, i) => {
    if (!row.title) {
      errors.push({ row: i + 2, field: "title", message: "Title is required" });
    }
    if (!row.customer_name) {
      errors.push({ row: i + 2, field: "customer_name", message: "Customer name is required" });
    }
    if (row.priority && !validPriorities.includes(row.priority.toLowerCase())) {
      errors.push({ row: i + 2, field: "priority", message: `Invalid priority: "${row.priority}"` });
    }
  });

  return errors;
}

const CSV_TEMPLATE = `customer_name,customer_phone,title,priority,notes,services
"John Smith","+15551234567","2019 Honda Civic Oil Change","normal","Customer requested synthetic oil","Oil Change;Tire Rotation;Brake Inspection"
"Jane Doe","+15559876543","MacBook Pro Screen Repair","rush","Cracked screen - needs ASAP",""`;

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const { createJob } = useActiveJobs();
  const labels = useJobLabels();
  const { toast } = useToast();
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
    a.download = "job_import_template.csv";
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
      headers.forEach((h, i) => {
        headerMap[h.toLowerCase().replace(/\s+/g, "_")] = i;
      });

      const parsed: ParsedRow[] = rows.map((row) => ({
        customer_name: row[headerMap["customer_name"]] || "",
        customer_phone: row[headerMap["customer_phone"]] || "",
        title: row[headerMap["title"]] || "",
        priority: row[headerMap["priority"]] || "normal",
        notes: row[headerMap["notes"]] || "",
        services: row[headerMap["services"]] || "",
      }));

      const validationErrors = validateRows(parsed);
      setParsedRows(parsed);
      setErrors(validationErrors);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (errors.length > 0) return;

    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of parsedRows) {
      try {
        const services = row.services
          ? row.services.split(";").map((s) => s.trim()).filter(Boolean).map((title) => ({ title }))
          : [];

        await createJob.mutateAsync({
          title: row.title,
          customer_name: row.customer_name || undefined,
          customer_phone: row.customer_phone || undefined,
          priority: (["normal", "rush", "urgent"].includes(row.priority.toLowerCase())
            ? row.priority.toLowerCase()
            : "normal") as "normal" | "rush" | "urgent",
          notes: row.notes || undefined,
          intake_method: "csv_import",
          services,
        });
        success++;
      } catch {
        failed++;
      }
    }

    setImporting(false);
    setResult({ success, failed });
    toast({
      title: "Import complete",
      description: `${success} ${labels.pluralJobs.toLowerCase()} imported${failed > 0 ? `, ${failed} failed` : ""}.`,
    });
  };

  const handleClose = () => {
    setParsedRows([]);
    setErrors([]);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {labels.pluralJobs} from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template download */}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-3.5 w-3.5 mr-2" />
            Download Template
          </Button>

          {/* File upload */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-2" />
              Upload CSV
            </Button>
          </div>

          {/* Preview */}
          {parsedRows.length > 0 && (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Customer</th>
                    <th className="text-left p-2 font-medium">Title</th>
                    <th className="text-left p-2 font-medium">Priority</th>
                    <th className="text-left p-2 font-medium">{labels.serviceSteps}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2">{row.customer_name || "-"}</td>
                      <td className="p-2">{row.title || "-"}</td>
                      <td className="p-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {row.priority || "normal"}
                        </Badge>
                      </td>
                      <td className="p-2 max-w-[200px] truncate">
                        {row.services || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 10 && (
                <p className="text-xs text-muted-foreground p-2 text-center">
                  ...and {parsedRows.length - 10} more rows
                </p>
              )}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md space-y-1">
              <div className="flex items-center gap-2 font-medium text-sm">
                <AlertCircle className="h-4 w-4" />
                {errors.length} validation error{errors.length !== 1 ? "s" : ""}
              </div>
              {errors.slice(0, 5).map((err, i) => (
                <p key={i} className="text-xs">
                  Row {err.row}: {err.message}
                </p>
              ))}
            </div>
          )}

          {/* Result */}
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
            <Button
              onClick={handleImport}
              disabled={parsedRows.length === 0 || errors.length > 0 || importing}
            >
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import {parsedRows.length} {parsedRows.length === 1 ? labels.singularJob : labels.pluralJobs}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
