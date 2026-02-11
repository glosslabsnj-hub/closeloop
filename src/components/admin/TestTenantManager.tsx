import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
  RefreshCw,
  Play,
  Zap,
} from "lucide-react";
import {
  TEST_TENANT_MATRIX,
  getTestTenantsByMode,
  type TestTenantConfig,
} from "@/data/testTenantMatrix";
import type { BusinessMode } from "@/types/database";

const modeLabels: Record<BusinessMode, string> = {
  service: "Service",
  dispatch: "Dispatch",
  food: "Food",
  medical: "Medical",
  general: "General",
  sales: "Sales",
};

const modeColors: Record<BusinessMode, string> = {
  service: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  dispatch: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  food: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  medical: "bg-red-500/10 text-red-600 border-red-500/30",
  general: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  sales: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
};

export function TestTenantManager() {
  const { setActiveTenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [seedingSlug, setSeedingSlug] = useState<string | null>(null);
  const [seedAllProgress, setSeedAllProgress] = useState<{ current: number; total: number } | null>(null);

  // Fetch existing test tenants to check status
  const { data: existingTenants, refetch: refetchTenants } = useQuery({
    queryKey: ["test-tenant-status"],
    queryFn: async () => {
      const names = TEST_TENANT_MATRIX.map((t) => t.name);
      const { data } = await supabase
        .from("tenants")
        .select("id, name, business_mode")
        .in("name", names);
      return (data || []) as { id: string; name: string; business_mode: string }[];
    },
  });

  const existingByName = new Map(
    (existingTenants || []).map((t) => [t.name, t])
  );

  const seedTenant = async (config: TestTenantConfig, action: "create_and_seed" | "reseed" | "delete") => {
    setSeedingSlug(config.slug);
    try {
      const { data, error } = await supabase.functions.invoke("seed-test-tenants", {
        body: { action, config },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      await refetchTenants();
      queryClient.invalidateQueries({ queryKey: ["admin-tenants-by-mode"] });

      toast({
        title: action === "delete" ? "Tenant deleted" : action === "reseed" ? "Tenant reseeded" : "Tenant created",
        description: `${config.name}: ${data?.status}`,
      });

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        variant: "destructive",
        title: "Seed failed",
        description: `${config.name}: ${message}`,
      });
      return null;
    } finally {
      setSeedingSlug(null);
    }
  };

  const handleSeedAll = async () => {
    const toSeed = TEST_TENANT_MATRIX.filter(
      (t) => !existingByName.has(t.name)
    );

    if (toSeed.length === 0) {
      toast({ title: "All tenants already seeded" });
      return;
    }

    setSeedAllProgress({ current: 0, total: toSeed.length });

    for (let i = 0; i < toSeed.length; i++) {
      setSeedAllProgress({ current: i + 1, total: toSeed.length });
      await seedTenant(toSeed[i], "create_and_seed");
    }

    setSeedAllProgress(null);
    toast({
      title: "Seed complete",
      description: `${toSeed.length} test tenants created`,
    });
  };

  const handleSwitchTo = async (config: TestTenantConfig) => {
    const existing = existingByName.get(config.name);
    if (existing) {
      await setActiveTenantId(existing.id);
      toast({ title: `Switched to ${config.name}` });
    }
  };

  const byMode = getTestTenantsByMode();
  const seededCount = TEST_TENANT_MATRIX.filter((t) => existingByName.has(t.name)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-warning" />
              <CardTitle>Test Tenant Matrix</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {seededCount}/{TEST_TENANT_MATRIX.length} seeded
              </Badge>
              <Button
                size="sm"
                onClick={handleSeedAll}
                disabled={!!seedAllProgress || !!seedingSlug}
              >
                {seedAllProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    {seedAllProgress.current}/{seedAllProgress.total}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    Seed All
                  </>
                )}
              </Button>
            </div>
          </div>
          {seedAllProgress && (
            <Progress
              value={(seedAllProgress.current / seedAllProgress.total) * 100}
              className="mt-3 h-2"
            />
          )}
        </CardHeader>
      </Card>

      {/* Grouped by mode */}
      {(Object.entries(byMode) as [BusinessMode, TestTenantConfig[]][]).map(
        ([mode, configs]) => (
          <Card key={mode}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={modeColors[mode]}
                >
                  {modeLabels[mode]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {configs.length} {configs.length === 1 ? "tenant" : "tenants"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {configs.map((config) => {
                const existing = existingByName.get(config.name);
                const isSeeded = !!existing;
                const isLoading = seedingSlug === config.slug;

                return (
                  <div
                    key={config.slug}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    {isSeeded ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{config.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {config.scenario}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config.scenarioTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] h-4 px-1.5"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : isSeeded ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleSwitchTo(config)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Switch
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => seedTenant(config, "reseed")}
                            disabled={!!seedingSlug}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reseed
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => seedTenant(config, "delete")}
                            disabled={!!seedingSlug}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => seedTenant(config, "create_and_seed")}
                          disabled={!!seedingSlug}
                        >
                          Seed
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
