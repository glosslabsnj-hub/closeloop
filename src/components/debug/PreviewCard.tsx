import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Database, Zap, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PreviewSource = "variables" | "snapshot" | "missing";

interface PreviewCardProps {
  title: string;
  value: string | null | undefined;
  source: PreviewSource;
  icon?: React.ReactNode;
  className?: string;
}

const sourceConfig: Record<PreviewSource, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" }> = {
  variables: {
    label: "Variables",
    icon: <Zap className="h-3 w-3" />,
    variant: "default",
  },
  snapshot: {
    label: "Snapshot",
    icon: <Database className="h-3 w-3" />,
    variant: "secondary",
  },
  missing: {
    label: "Missing",
    icon: <XCircle className="h-3 w-3" />,
    variant: "destructive",
  },
};

export function PreviewCard({ title, value, source, icon, className }: PreviewCardProps) {
  const _config = sourceConfig[source];
  const isEmpty = !value || value.trim() === "";
  const effectiveSource = isEmpty ? "missing" : source;
  const effectiveConfig = sourceConfig[effectiveSource];

  return (
    <Card className={cn(
      "transition-all",
      effectiveSource === "missing" && "border-destructive/30 bg-destructive/5",
      className
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
          <Badge 
            variant={effectiveConfig.variant} 
            className="text-xs gap-1 font-normal"
          >
            {effectiveConfig.icon}
            {effectiveConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isEmpty ? (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Missing — AI may ask extra questions</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
