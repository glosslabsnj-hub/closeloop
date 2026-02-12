/**
 * ExtractedPayloadDisplay
 *
 * Renders extracted_payload as grouped, labeled fields instead of raw JSON.
 * Uses industry-aware field labels from IndustryBrainConfig.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, User, Calendar, MapPin, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboxConfig } from "@/config/industryBrainConfig";

interface ExtractedPayloadDisplayProps {
  payload: Record<string, unknown>;
  inboxConfig: InboxConfig;
  className?: string;
}

// Field groupings for structured display
const FIELD_GROUPS: Array<{
  key: string;
  label: string;
  icon: typeof User;
  pathPrefixes: string[];
}> = [
  {
    key: "customer",
    label: "Customer Info",
    icon: User,
    pathPrefixes: ["customer."],
  },
  {
    key: "booking",
    label: "Service Details",
    icon: Calendar,
    pathPrefixes: ["booking.", "order.", "reservation."],
  },
  {
    key: "dispatch",
    label: "Job Details",
    icon: MapPin,
    pathPrefixes: ["dispatch."],
  },
  {
    key: "callback",
    label: "Callback",
    icon: FileText,
    pathPrefixes: ["callback."],
  },
];

/**
 * Get a nested value from an object using dot-notation path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Format a value for display.
 */
function formatValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    // For order items or arrays of objects
    if (typeof value[0] === "object") {
      return value
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            const name = (item as Record<string, unknown>).name || (item as Record<string, unknown>).item;
            const qty = (item as Record<string, unknown>).quantity || (item as Record<string, unknown>).qty;
            if (name && qty) return `${qty}x ${name}`;
            if (name) return String(name);
          }
          return JSON.stringify(item);
        })
        .join(", ");
    }
    return value.join(", ");
  }
  if (typeof value === "number") {
    // Cents to dollars for total fields
    return String(value);
  }
  return String(value);
}

/**
 * Collect all dot-notation paths from nested payload.
 */
function collectPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...collectPaths(value as Record<string, unknown>, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

interface FieldRowProps {
  label: string;
  value: string;
  isPrimary?: boolean;
}

function FieldRow({ label, value, isPrimary }: FieldRowProps) {
  return (
    <div className={cn("flex items-start gap-3 py-1.5", isPrimary && "font-medium")}>
      <span className="text-xs text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm break-words min-w-0">{value}</span>
    </div>
  );
}

export function ExtractedPayloadDisplay({ payload, inboxConfig, className }: ExtractedPayloadDisplayProps) {
  const [showRawJson, setShowRawJson] = useState(false);

  const allPaths = collectPaths(payload);
  const primaryFieldSet = new Set(inboxConfig.primaryFields);
  const renderedPaths = new Set<string>();

  // Collect fields per group
  const groupedFields: Array<{
    key: string;
    label: string;
    icon: typeof User;
    fields: Array<{ path: string; label: string; value: string; isPrimary: boolean }>;
  }> = [];

  for (const group of FIELD_GROUPS) {
    const fields: Array<{ path: string; label: string; value: string; isPrimary: boolean }> = [];

    for (const path of allPaths) {
      if (!group.pathPrefixes.some((p) => path.startsWith(p))) continue;

      const raw = getNestedValue(payload, path);
      const formatted = formatValue(raw);
      if (!formatted) continue;

      const label = inboxConfig.fieldLabels[path] || path.split(".").pop() || path;
      fields.push({
        path,
        label,
        value: formatted,
        isPrimary: primaryFieldSet.has(path),
      });
      renderedPaths.add(path);
    }

    if (fields.length > 0) {
      // Sort: primary fields first
      fields.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
      groupedFields.push({ ...group, fields });
    }
  }

  // Ungrouped fields (intent, _meta, etc.)
  const ungroupedFields: Array<{ path: string; label: string; value: string }> = [];
  for (const path of allPaths) {
    if (renderedPaths.has(path)) continue;
    if (path.startsWith("_meta.")) continue; // Skip meta in structured view
    if (path === "intent") continue; // Shown separately usually

    const raw = getNestedValue(payload, path);
    const formatted = formatValue(raw);
    if (!formatted) continue;

    const label = inboxConfig.fieldLabels[path] || path.split(".").pop() || path;
    ungroupedFields.push({ path, label, value: formatted });
    renderedPaths.add(path);
  }

  // Intent display
  const intent = payload.intent;
  const intentDisplay = intent && typeof intent === "string" ? intent : null;

  if (groupedFields.length === 0 && ungroupedFields.length === 0 && !intentDisplay) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No extracted data available.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Intent badge */}
      {intentDisplay && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Intent:</span>
          <span className="text-sm font-medium capitalize">{intentDisplay}</span>
        </div>
      )}

      {/* Grouped sections */}
      {groupedFields.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.key} className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {group.label}
              </span>
            </div>
            <div className="pl-5 border-l border-border/50">
              {group.fields.map((field) => (
                <FieldRow
                  key={field.path}
                  label={field.label}
                  value={field.value}
                  isPrimary={field.isPrimary}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Ungrouped fields */}
      {ungroupedFields.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Other Details
          </span>
          <div className="pl-5 border-l border-border/50">
            {ungroupedFields.map((field) => (
              <FieldRow key={field.path} label={field.label} value={field.value} />
            ))}
          </div>
        </div>
      )}

      {/* Debug: Raw JSON (collapsible) */}
      <div className="pt-2 border-t">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowRawJson(!showRawJson)}
        >
          {showRawJson ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Debug Data
        </button>
        {showRawJson && (
          <div className="mt-2 bg-muted/50 rounded-lg p-3 text-xs overflow-x-auto font-mono">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
