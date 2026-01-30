import { useGoldenPathChecks, type AutoCheck } from "@/hooks/useGoldenPathChecks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Phone,
  Webhook,
  FileJson,
  Calendar,
  Zap,
  Loader2,
  AlertTriangle,
  Database,
} from "lucide-react";

interface GoldenPathAutoChecksProps {
  tenantId: string | null;
}

const categoryIcons: Record<string, React.ReactNode> = {
  provisioning: <Phone className="h-4 w-4" />,
  telephony: <Phone className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  extraction: <FileJson className="h-4 w-4" />,
  entity: <Database className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  automation: <Zap className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  provisioning: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  telephony: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  webhook: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  extraction: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  entity: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  calendar: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  automation: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export function GoldenPathAutoChecks({ tenantId }: GoldenPathAutoChecksProps) {
  const { checks, loading, refetch } = useGoldenPathChecks(tenantId);

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>Select a tenant to run automated checks</p>
        </CardContent>
      </Card>
    );
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const failedCount = checks.filter((c) => !c.passed).length;
  const passRate = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;

  // Group checks by category
  const groupedChecks: Record<string, AutoCheck[]> = {};
  for (const check of checks) {
    if (!groupedChecks[check.category]) {
      groupedChecks[check.category] = [];
    }
    groupedChecks[check.category].push(check);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Automated Golden Path Checks
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{passRate}%</span>
              <span className="text-sm text-muted-foreground">pass rate</span>
            </div>
            <div className="flex gap-3 mt-1 text-sm">
              <span className="text-primary flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {passedCount} passed
              </span>
              <span className="text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" /> {failedCount} failed
              </span>
            </div>
          </div>
          <Badge
            variant={passRate === 100 ? "default" : passRate >= 70 ? "secondary" : "destructive"}
            className="text-lg px-3 py-1"
          >
            {passRate === 100 ? "All Passed" : passRate >= 70 ? "Partial" : "Needs Work"}
          </Badge>
        </div>

        {/* Checks by Category */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {Object.entries(groupedChecks).map(([category, categoryChecks]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={categoryColors[category]} variant="outline">
                    {categoryIcons[category]}
                    <span className="ml-1.5 capitalize">{category}</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {categoryChecks.filter((c) => c.passed).length}/{categoryChecks.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {categoryChecks.map((check) => (
                    <div
                      key={check.id}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm transition-colors ${
                        check.passed
                          ? "bg-primary/5 border-primary/20"
                          : "bg-destructive/5 border-destructive/20"
                      }`}
                    >
                      {check.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{check.label}</p>
                        <p className="text-xs text-muted-foreground">{check.description}</p>
                        {check.details && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            {check.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
