import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Check, AlertTriangle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DynamicVariablesDebugPanelProps {
  /** The tenant ID being used for the test call */
  tenantId: string | null;
  /** Dynamic variables object from the token endpoint */
  dynamicVariables: Record<string, any> | null;
  /** Whether the panel should be visible (auto-hidden for non-admins) */
  forceShow?: boolean;
}

export function DynamicVariablesDebugPanel({
  tenantId,
  dynamicVariables,
  forceShow = false,
}: DynamicVariablesDebugPanelProps) {
  const { isSuperAdmin, effectiveTenantId } = useAuth();

  // Only show for super admins unless forceShow
  if (!isSuperAdmin && !forceShow) return null;

  const copyToClipboard = () => {
    const data = {
      tenant_id: tenantId,
      expected_tenant_id: effectiveTenantId,
      dynamic_variables: dynamicVariables,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("Copied to clipboard");
  };

  // Validate: tenant ID must be present and match the expected effective tenant
  const hasValidTenant = !!tenantId;
  const tenantMatchesExpected = tenantId === effectiveTenantId;
  const businessName = dynamicVariables?.business_name || dynamicVariables?.businessname;
  const businessMode = dynamicVariables?.business_mode;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bug className="h-4 w-4 text-warning" />
          <span>Dynamic Variables Debug</span>
          <Badge variant="outline" className="ml-auto text-xs">
            Admin Only
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tenant ID Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-24">Tenant ID:</span>
          {hasValidTenant && tenantMatchesExpected ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {tenantId?.slice(0, 8)}...
              </code>
              <Badge variant="outline" className="text-[10px] text-green-600 border-green-500">
                Matches selected
              </Badge>
            </div>
          ) : hasValidTenant && !tenantMatchesExpected ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {tenantId?.slice(0, 8)}...
              </code>
              <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500">
                Mismatch! Expected: {effectiveTenantId?.slice(0, 8)}...
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">Missing tenant ID</span>
            </div>
          )}
        </div>

        {/* Business Name */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-24">Business:</span>
          <span className="text-sm">
            {businessName || <span className="text-muted-foreground">Not set</span>}
          </span>
        </div>

        {/* Business Mode */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium w-24">Mode:</span>
          <Badge variant="secondary" className="text-xs">
            {businessMode || "unknown"}
          </Badge>
        </div>

        {/* Key Variables Summary */}
        {dynamicVariables && (
          <div className="space-y-1 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {Object.keys(dynamicVariables).length} variables loaded
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="h-6 gap-1 text-xs"
              >
                <Copy className="h-3 w-3" />
                Copy JSON
              </Button>
            </div>
            
            {/* Show key variables */}
            <div className="grid grid-cols-2 gap-1 text-xs">
              {["hours_today", "services_pricing", "booking_link", "tone"].map((key) => (
                <div key={key} className="flex items-center gap-1">
                  {dynamicVariables[key] ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">{key}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full JSON (collapsible) */}
        {dynamicVariables && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              View full JSON
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(dynamicVariables, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
