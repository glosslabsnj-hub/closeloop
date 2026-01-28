import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, ArrowRight, Edit2, Undo } from "lucide-react";
import { useKnowledgeConflicts, type KnowledgeConflict } from "@/hooks/useKnowledgeConflicts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const conflictTypeLabels: Record<string, string> = {
  price_mismatch: "Price Difference",
  description_mismatch: "Description Difference",
  name_mismatch: "Name Difference",
  duration_mismatch: "Duration Difference",
  other: "Other Difference",
};

const entityTypeLabels: Record<string, string> = {
  service: "Service",
  menu_item: "Menu Item",
  faq: "FAQ",
  policy: "Policy",
};

function ConflictCard({
  conflict,
  onKeepExisting,
  onAcceptUpload,
  onCustomMerge,
  isResolving,
}: {
  conflict: KnowledgeConflict;
  onKeepExisting: () => void;
  onAcceptUpload: () => void;
  onCustomMerge: (data: Record<string, any>) => void;
  isResolving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [mergedData, setMergedData] = useState<Record<string, any>>(conflict.existing_data);

  const renderFieldComparison = (field: string) => {
    const existingValue = conflict.existing_data[field];
    const proposedValue = conflict.proposed_data[field];
    const isDifferent = conflict.differing_fields.includes(field);

    const formatValue = (val: any) => {
      if (val === null || val === undefined) return "—";
      if (typeof val === "number" && field.includes("price")) {
        return `$${(val / 100).toFixed(2)}`;
      }
      if (typeof val === "number" && field.includes("duration")) {
        return `${val} min`;
      }
      return String(val);
    };

    return (
      <div key={field} className={cn("grid grid-cols-2 gap-4 py-2", isDifferent && "bg-yellow-50 dark:bg-yellow-950/20 -mx-3 px-3 rounded")}>
        <div>
          <span className={cn("text-sm", isDifferent && "font-medium")}>
            {formatValue(existingValue)}
          </span>
        </div>
        <div>
          <span className={cn("text-sm", isDifferent && "font-medium text-primary")}>
            {formatValue(proposedValue)}
          </span>
        </div>
      </div>
    );
  };

  const renderEditForm = () => {
    const fields = [...new Set([...Object.keys(conflict.existing_data), ...Object.keys(conflict.proposed_data)])];
    
    return (
      <div className="space-y-3 mt-4 p-3 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Custom Merge</Label>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            <Undo className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
        {fields.map((field) => {
          if (field === "id" || field === "tenant_id" || field === "created_at") return null;
          
          const value = mergedData[field] ?? "";
          const isTextArea = field === "description" || field === "content" || field === "answer";
          
          return (
            <div key={field}>
              <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
              {isTextArea ? (
                <Textarea
                  value={value}
                  onChange={(e) => setMergedData({ ...mergedData, [field]: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              ) : (
                <Input
                  value={value}
                  onChange={(e) => setMergedData({ ...mergedData, [field]: e.target.value })}
                  className="mt-1"
                />
              )}
            </div>
          );
        })}
        <Button
          size="sm"
          className="w-full"
          onClick={() => onCustomMerge(mergedData)}
          disabled={isResolving}
        >
          <Check className="h-4 w-4 mr-1" />
          Save Custom Merge
        </Button>
      </div>
    );
  };

  const allFields = [...new Set([...Object.keys(conflict.existing_data), ...Object.keys(conflict.proposed_data)])].filter(
    (f) => !["id", "tenant_id", "created_at", "updated_at"].includes(f)
  );

  return (
    <Card className="border-yellow-500/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            {entityTypeLabels[conflict.entity_type] || conflict.entity_type}
          </CardTitle>
          <Badge variant="outline" className="text-yellow-600 border-yellow-500/50">
            {conflictTypeLabels[conflict.conflict_type] || conflict.conflict_type}
          </Badge>
        </div>
        <CardDescription>
          Differences found in: {conflict.differing_fields.map(f => f.replace(/_/g, " ")).join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comparison Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted text-xs font-medium uppercase tracking-wide">
            <div>Current (AI uses this)</div>
            <div>From Upload</div>
          </div>
          <div className="divide-y">
            {allFields.map((field) => renderFieldComparison(field))}
          </div>
        </div>

        {/* Actions */}
        {isEditing ? (
          renderEditForm()
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onKeepExisting}
              disabled={isResolving}
              className="flex-1"
            >
              Keep Existing
            </Button>
            <Button
              size="sm"
              onClick={onAcceptUpload}
              disabled={isResolving}
              className="flex-1"
            >
              Accept Upload
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={isResolving}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KnowledgeConflictResolver() {
  const { unresolvedConflicts, isLoading, keepExisting, acceptUpload, customMerge, isResolving } =
    useKnowledgeConflicts();

  const handleKeepExisting = async (id: string) => {
    try {
      await keepExisting(id);
      toast.success("Kept existing data. AI will continue using current settings.");
    } catch (error) {
      toast.error("Failed to resolve conflict");
    }
  };

  const handleAcceptUpload = async (id: string) => {
    try {
      await acceptUpload(id);
      toast.success("Updated with uploaded data. AI will use the new values.");
    } catch (error) {
      toast.error("Failed to accept upload");
    }
  };

  const handleCustomMerge = async (id: string, data: Record<string, any>) => {
    try {
      await customMerge({ conflictId: id, mergedData: data });
      toast.success("Custom merge saved. AI will use your edited values.");
    } catch (error) {
      toast.error("Failed to save custom merge");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading conflicts...
        </CardContent>
      </Card>
    );
  }

  if (unresolvedConflicts.length === 0) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="p-6 text-center">
          <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="font-medium text-green-700 dark:text-green-400">
            All conflicts resolved!
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your AI knowledge is now updated and consistent.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Review these conflicts. The AI will keep using your existing data until you choose what's correct.
      </div>
      {unresolvedConflicts.map((conflict) => (
        <ConflictCard
          key={conflict.id}
          conflict={conflict}
          onKeepExisting={() => handleKeepExisting(conflict.id)}
          onAcceptUpload={() => handleAcceptUpload(conflict.id)}
          onCustomMerge={(data) => handleCustomMerge(conflict.id, data)}
          isResolving={isResolving}
        />
      ))}
    </div>
  );
}
