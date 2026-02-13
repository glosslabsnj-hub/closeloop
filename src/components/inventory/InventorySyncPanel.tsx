import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InventorySyncPanelProps {
  lastSyncedAt: string | null;
}

export function InventorySyncPanel({ lastSyncedAt }: InventorySyncPanelProps) {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState<string[]>([""]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load existing dealer_urls from tenant context_fields_json
  useEffect(() => {
    if (!tenant?.id || loaded) return;
    const contextFields = (tenant as any).context_fields_json as Record<string, any> | null;
    const existing = contextFields?.dealer_urls as string[] | undefined;
    if (existing && existing.length > 0) {
      setUrls(existing);
    }
    setLoaded(true);
  }, [tenant?.id, loaded]);

  const handleAddUrl = () => setUrls((prev) => [...prev, ""]);

  const handleRemoveUrl = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUrlChange = (index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  };

  const cleanUrls = urls.map((u) => u.trim()).filter(Boolean);

  const handleSaveUrls = async () => {
    if (!tenant?.id) return;
    setIsSaving(true);
    try {
      const contextFields = ((tenant as any).context_fields_json as Record<string, any>) || {};
      const updated = { ...contextFields, dealer_urls: cleanUrls };

      const { error } = await (supabase as any)
        .from("tenants")
        .update({ context_fields_json: updated })
        .eq("id", tenant.id);

      if (error) throw error;
      toast({ title: "URLs saved", description: `${cleanUrls.length} dealer URL(s) saved.` });
    } catch (e: any) {
      toast({ title: "Error saving URLs", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    if (!tenant?.id || cleanUrls.length === 0) {
      toast({ title: "No URLs", description: "Add at least one dealer URL first.", variant: "destructive" });
      return;
    }
    setIsSyncing(true);
    setSyncResult(null);
    try {
      // Save URLs first
      await handleSaveUrls();

      const { data, error } = await supabase.functions.invoke("scrape-carsforsale", {
        body: { tenant_id: tenant.id, dealer_urls: cleanUrls, full_sync: true },
      });

      if (error) throw error;

      const count = data?.items_synced ?? data?.count ?? 0;
      setSyncResult({ success: true, message: `Synced ${count} vehicle(s) from ${cleanUrls.length} source(s).` });
      queryClient.invalidateQueries({ queryKey: ["sales-inventory", tenant.id] });
      toast({ title: "Sync complete", description: `${count} vehicles imported.` });
    } catch (e: any) {
      setSyncResult({ success: false, message: e.message || "Sync failed" });
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Import from Web</p>
                <p className="text-xs text-muted-foreground">
                  {lastSyncedAt
                    ? `Last synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
                    : "No sync yet — add your dealer page URLs"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cleanUrls.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {cleanUrls.length} URL{cleanUrls.length !== 1 ? "s" : ""}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3 border-t">
            <p className="text-xs text-muted-foreground pt-3">
              Add your dealer listing page URLs (e.g. carsforsale.com, autotrader). We'll scrape vehicle details automatically every 6 hours.
            </p>

            <div className="space-y-2">
              {urls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="https://www.carsforsale.com/your-dealer"
                    value={url}
                    onChange={(e) => handleUrlChange(i, e.target.value)}
                    className="flex-1"
                  />
                  {urls.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveUrl(i)} className="shrink-0">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleAddUrl}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add URL
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveUrls} disabled={isSaving || cleanUrls.length === 0}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Save
              </Button>
              <Button size="sm" onClick={handleSync} disabled={isSyncing || cleanUrls.length === 0}>
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                )}
                Sync Now
              </Button>
            </div>

            {syncResult && (
              <div className={`flex items-center gap-2 text-xs rounded-md p-2 ${syncResult.success ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                {syncResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {syncResult.message}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
