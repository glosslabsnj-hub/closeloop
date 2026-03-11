import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertTriangle,
  XCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Severity = "error" | "warning" | "ok";

interface HealthAlert {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, ok: 2 };

// How long the green "All systems operational" banner stays visible (ms)
const GREEN_DISMISS_MS = 5000;

// Keys for sessionStorage-based dismiss tracking
const DISMISS_KEY = "flux_health_dismissed";

function getDismissedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
  } catch {
    // sessionStorage unavailable
  }
}

export function SystemHealthBanner() {
  const { tenant, effectiveTenantId } = useAuth();
  const tenantId = effectiveTenantId || tenant?.id || null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getDismissedIds);
  const [greenAutoDismissed, setGreenAutoDismissed] = useState(false);

  // ── 1. Delivery attempt failures (last 24h) ─────────────────────────
  const { data: deliveryFailures } = useQuery({
    queryKey: ["system-health-delivery", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("delivery_attempts")
        .select("id, status, error_message, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "failed")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 5 * 60 * 1000,
  });

  // ── 2. Integration OAuth token status ────────────────────────────────
  const { data: tokenIssues } = useQuery({
    queryKey: ["system-health-tokens", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("integration_oauth_tokens")
        .select("id, provider, status, expires_at, error_message")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // ── 3. A2P SMS registration status ──────────────────────────────────
  const { data: a2pStatus } = useQuery({
    queryKey: ["system-health-a2p", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("a2p_registrations")
        .select("status, failure_reason")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // ── 4. Phone number provisioning ────────────────────────────────────
  const { data: phoneNumbers } = useQuery({
    queryKey: ["system-health-phone", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("phone_numbers")
        .select("id, phone_e164, status")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // ── Build alerts ────────────────────────────────────────────────────
  const alerts: HealthAlert[] = [];

  // Delivery failures
  if (deliveryFailures && deliveryFailures.length > 0) {
    const recentCount = deliveryFailures.filter((f) => {
      const age = Date.now() - new Date(f.created_at).getTime();
      return age < 60 * 60 * 1000; // last hour
    }).length;

    const description =
      recentCount > 0
        ? `${recentCount} notification${recentCount !== 1 ? "s" : ""} failed in the last hour`
        : `${deliveryFailures.length} notification${deliveryFailures.length !== 1 ? "s" : ""} failed in the last 24 hours`;

    alerts.push({
      id: "delivery-failures",
      severity: "error",
      title: "Notification delivery failures",
      description,
      actionLabel: "View Settings",
      actionLink: "/app/settings?tab=notifications",
    });
  }

  // Token issues
  if (tokenIssues) {
    for (const token of tokenIssues) {
      const providerLabel =
        token.provider.charAt(0).toUpperCase() + token.provider.slice(1).replace(/_/g, " ");

      if (token.status === "error" || token.status === "revoked") {
        alerts.push({
          id: `token-error-${token.id}`,
          severity: "error",
          title: `${providerLabel} disconnected`,
          description: token.error_message || "Reconnect this integration to restore functionality.",
          actionLabel: "Reconnect",
          actionLink: "/app/integrations",
        });
      } else if (token.expires_at) {
        const expiresIn = new Date(token.expires_at).getTime() - Date.now();
        const hoursLeft = expiresIn / (1000 * 60 * 60);
        if (hoursLeft < 24 && hoursLeft > 0) {
          alerts.push({
            id: `token-expiring-${token.id}`,
            severity: "warning",
            title: `${providerLabel} token expiring soon`,
            description: `Connection expires in ${Math.round(hoursLeft)} hour${Math.round(hoursLeft) !== 1 ? "s" : ""}. Reconnect to avoid disruption.`,
            actionLabel: "Refresh",
            actionLink: "/app/integrations",
          });
        } else if (expiresIn <= 0) {
          alerts.push({
            id: `token-expired-${token.id}`,
            severity: "error",
            title: `${providerLabel} token expired`,
            description: "This integration has stopped working. Reconnect to restore it.",
            actionLabel: "Reconnect",
            actionLink: "/app/integrations",
          });
        }
      }
    }
  }

  // A2P SMS status
  if (a2pStatus) {
    const pendingStatuses = ["pending_data", "pending_profile", "pending_brand", "pending_campaign"];
    if (a2pStatus.status === "failed") {
      alerts.push({
        id: "a2p-failed",
        severity: "error",
        title: "SMS registration failed",
        description: a2pStatus.failure_reason || "SMS messaging is not available. Contact support.",
        actionLabel: "View Details",
        actionLink: "/app/settings?tab=notifications",
      });
    } else if (pendingStatuses.includes(a2pStatus.status)) {
      alerts.push({
        id: "a2p-pending",
        severity: "warning",
        title: "SMS pending approval",
        description:
          "Your SMS registration is under review. Customers may not receive text notifications until approved.",
        actionLabel: "Check Status",
        actionLink: "/app/settings?tab=notifications",
      });
    }
  }

  // Phone number
  if (phoneNumbers !== undefined) {
    const provisioned = phoneNumbers.filter((p) => p.status === "provisioned");
    if (provisioned.length === 0 && phoneNumbers.length === 0) {
      alerts.push({
        id: "no-phone",
        severity: "error",
        title: "No phone number configured",
        description: "Your AI receptionist cannot receive calls without a phone number.",
        actionLabel: "Set Up Phone",
        actionLink: "/app/go-live",
      });
    }
  }

  // Sort: errors first, then warnings
  alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  // Filter out dismissed alerts (only dismiss if the issue still exists)
  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  const allClear = alerts.length === 0;

  // Auto-dismiss the green banner after a delay
  useEffect(() => {
    if (!allClear) {
      setGreenAutoDismissed(false);
      return;
    }
    const timer = setTimeout(() => setGreenAutoDismissed(true), GREEN_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [allClear]);

  // Re-surface dismissed alerts when the underlying issue changes
  // (e.g., new failures appear after user dismissed the old batch)
  useEffect(() => {
    if (dismissedIds.size === 0) return;
    // If a dismissed ID no longer exists in alerts, clean it from dismissed set
    const activeIds = new Set(alerts.map((a) => a.id));
    let changed = false;
    const next = new Set(dismissedIds);
    for (const id of dismissedIds) {
      if (!activeIds.has(id)) {
        next.delete(id);
        changed = true;
      }
    }
    if (changed) {
      setDismissedIds(next);
      persistDismissedIds(next);
    }
  }, [alerts.map((a) => a.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = useCallback(
    (alertId: string) => {
      const next = new Set(dismissedIds);
      next.add(alertId);
      setDismissedIds(next);
      persistDismissedIds(next);
    },
    [dismissedIds]
  );

  // ── Render ──────────────────────────────────────────────────────────

  // All clear: brief green confirmation, then disappear
  if (allClear) {
    if (greenAutoDismissed) return null;
    return (
      <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 backdrop-blur-sm border-border/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full shrink-0 bg-emerald-500/10 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              All systems operational
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Nothing visible (all dismissed)
  if (visibleAlerts.length === 0) return null;

  const primaryAlert = visibleAlerts[0];
  const secondaryAlerts = visibleAlerts.slice(1);
  const hasError = visibleAlerts.some((a) => a.severity === "error");

  const iconForSeverity = (severity: Severity) => {
    switch (severity) {
      case "error":
        return XCircle;
      case "warning":
        return AlertTriangle;
      default:
        return CheckCircle;
    }
  };

  const PrimaryIcon = iconForSeverity(primaryAlert.severity);

  return (
    <Card
      className={cn(
        "border-l-4 backdrop-blur-sm border-border/30",
        hasError
          ? "border-l-destructive bg-destructive/5"
          : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-4">
          {/* Primary Alert */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full shrink-0",
                primaryAlert.severity === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-500/10 text-amber-600"
              )}
            >
              <PrimaryIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{primaryAlert.title}</p>
                {visibleAlerts.length > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    +{visibleAlerts.length - 1} more
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{primaryAlert.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {primaryAlert.actionLink && (
                <Button
                  asChild
                  size="sm"
                  variant={primaryAlert.severity === "error" ? "destructive" : "outline"}
                >
                  <Link to={primaryAlert.actionLink}>
                    {primaryAlert.actionLabel}
                    <ExternalLink className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleDismiss(primaryAlert.id)}
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </Button>

              {secondaryAlerts.length > 0 && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {/* Secondary Alerts (collapsible) */}
          <CollapsibleContent>
            {secondaryAlerts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/20 space-y-3">
                {secondaryAlerts.map((alert) => {
                  const AlertIcon = iconForSeverity(alert.severity);
                  return (
                    <div key={alert.id} className="flex items-center gap-3">
                      <AlertIcon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          alert.severity === "error" ? "text-destructive" : "text-amber-600"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {alert.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {alert.actionLink && (
                          <Button asChild size="sm" variant="ghost" className="shrink-0">
                            <Link to={alert.actionLink}>{alert.actionLabel}</Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDismiss(alert.id)}
                          aria-label="Dismiss alert"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
