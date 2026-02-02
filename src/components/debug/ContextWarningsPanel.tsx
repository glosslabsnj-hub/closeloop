import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface WarningItem {
  id: string;
  label: string;
  isMissing: boolean;
  deepLink?: string;
  deepLinkLabel?: string;
}

interface ContextWarningsPanelProps {
  warnings: WarningItem[];
}

export function ContextWarningsPanel({ warnings }: ContextWarningsPanelProps) {
  const missingItems = warnings.filter((w) => w.isMissing);
  const presentItems = warnings.filter((w) => !w.isMissing);

  return (
    <Card className={missingItems.length > 0 ? "border-destructive/30" : "border-primary/30"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {missingItems.length > 0 ? (
            <>
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>{missingItems.length} Missing Field{missingItems.length !== 1 ? "s" : ""}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>All Required Fields Present</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {missingItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {item.deepLink && (
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link to={item.deepLink}>
                  {item.deepLinkLabel || "Fix"}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        ))}

        {presentItems.length > 0 && missingItems.length > 0 && (
          <div className="pt-2 mt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Present:</p>
            <div className="flex flex-wrap gap-1.5">
              {presentItems.map((item) => (
                <Badge key={item.id} variant="secondary" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {missingItems.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presentItems.map((item) => (
              <Badge key={item.id} variant="secondary" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                {item.label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
