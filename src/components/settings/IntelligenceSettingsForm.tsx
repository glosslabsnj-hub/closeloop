import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Lock, RefreshCw, Settings2 } from "lucide-react";
import { useIntelligenceSettings } from "@/hooks/useIntelligenceSettings";
import { Link } from "react-router-dom";

export function IntelligenceSettingsForm() {
  const { 
    settings, 
    isLoading, 
    updateSettings,
    toggleMemory,
    toggleCrossLocationSharing,
    isUpdating,
    hipaaMode,
    customerMemoryBlocked
  } = useIntelligenceSettings();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>AI Intelligence</CardTitle>
            <CardDescription>
              Configure how your AI learns and adapts over time
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* HIPAA Notice */}
        {hipaaMode && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Lock className="h-4 w-4 text-amber-500" />
            <p className="text-sm">
              HIPAA mode is active. Customer-specific memory is automatically disabled.
            </p>
          </div>
        )}

        {/* Memory Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="memory-toggle" className="text-sm font-medium">
              Should AI learn from calls?
            </Label>
            <p className="text-xs text-muted-foreground">
              AI notices patterns and improves over time
            </p>
          </div>
          <Switch
            id="memory-toggle"
            checked={settings.memory_enabled}
            onCheckedChange={(checked) => toggleMemory(checked)}
            disabled={isUpdating}
          />
        </div>

        {settings.memory_enabled && (
          <>
            {/* Cross-Location Sharing */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="share-toggle" className="text-sm font-medium">
                  Share learnings with all locations
                </Label>
                <p className="text-xs text-muted-foreground">
                  What AI learns at one location helps all your locations
                </p>
              </div>
              <Switch
                id="share-toggle"
                checked={settings.share_memory_across_locations}
                onCheckedChange={(checked) => toggleCrossLocationSharing(checked)}
                disabled={isUpdating}
              />
            </div>

            {/* Copilot Rule Suggestions */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="copilot-toggle" className="text-sm font-medium">
                  Suggest new rules from patterns
                </Label>
                <p className="text-xs text-muted-foreground">
                  AI notices patterns and suggests rules for you to approve
                </p>
              </div>
              <Switch
                id="copilot-toggle"
                checked={settings.copilot_can_suggest_rules}
                onCheckedChange={(checked) => updateSettings.mutate({ copilot_can_suggest_rules: checked })}
                disabled={isUpdating}
              />
            </div>

            {/* Thresholds */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Learn after seeing pattern...</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.min_observation_threshold}
                    onChange={(e) => updateSettings.mutate({
                      min_observation_threshold: parseInt(e.target.value) || 3
                    })}
                    min={1}
                    max={10}
                    className="w-20"
                    disabled={isUpdating}
                  />
                  <span className="text-xs text-muted-foreground">times</span>
                </div>
                <p className="text-xs text-muted-foreground">Higher = more confident but slower</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Only use patterns AI is...</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={Math.round(settings.min_confidence_threshold * 100)}
                    onChange={(e) => updateSettings.mutate({
                      min_confidence_threshold: (parseInt(e.target.value) || 65) / 100
                    })}
                    min={50}
                    max={100}
                    className="w-20"
                    disabled={isUpdating}
                  />
                  <span className="text-xs text-muted-foreground">% sure about</span>
                </div>
                <p className="text-xs text-muted-foreground">Higher = more cautious AI</p>
              </div>
            </div>
          </>
        )}

        {/* Link to Memory Tab */}
        {settings.memory_enabled && (
          <div className="pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/business-brain?tab=memory">
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Learned Patterns
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
