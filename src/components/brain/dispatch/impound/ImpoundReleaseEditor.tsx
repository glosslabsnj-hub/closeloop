/**
 * ImpoundReleaseEditor - Configure release requirements
 * 
 * Allows dispatch businesses to set up what's needed to release a vehicle:
 * - Required documents (ID, registration, title, etc.)
 * - Special requirements (lien release, police release)
 * - Custom requirements
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileCheck, Plus, X, Sparkles } from "lucide-react";

interface ReleaseRequirement {
  id: string;
  label: string;
  description: string;
  isBuiltIn: boolean;
}

const BUILT_IN_REQUIREMENTS: ReleaseRequirement[] = [
  { id: "valid_id", label: "Valid ID", description: "Government-issued photo ID", isBuiltIn: true },
  { id: "registration", label: "Vehicle Registration", description: "Current registration or title", isBuiltIn: true },
  { id: "insurance", label: "Proof of Insurance", description: "Valid insurance card", isBuiltIn: true },
  { id: "payment", label: "Payment in Full", description: "All fees must be paid", isBuiltIn: true },
  { id: "lien_release", label: "Lien Release", description: "If vehicle has a lienholder", isBuiltIn: true },
  { id: "police_release", label: "Police Release", description: "For police-ordered tows", isBuiltIn: true },
];

export function ImpoundReleaseEditor() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [customRequirements, setCustomRequirements] = useState<ReleaseRequirement[]>([]);
  const [newCustom, setNewCustom] = useState({ label: "", description: "" });

  useEffect(() => {
    if (tenant?.id) {
      loadSettings();
    }
  }, [tenant?.id]);

  const loadSettings = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("impound_settings")
        .select("default_release_requirements")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;

      const requirements = data?.default_release_requirements || ["valid_id", "registration", "payment"];
      
      // Separate built-in from custom
      const builtInIds = BUILT_IN_REQUIREMENTS.map(r => r.id);
      const selected = requirements.filter((r: string) => builtInIds.includes(r));
      const custom = requirements
        .filter((r: string) => !builtInIds.includes(r))
        .map((r: string) => ({
          id: r,
          label: r.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
          description: "",
          isBuiltIn: false,
        }));

      setSelectedRequirements(selected);
      setCustomRequirements(custom);
    } catch (error) {
      console.error("Failed to load release requirements:", error);
      toast.error("Failed to load requirements");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      const allRequirements = [
        ...selectedRequirements,
        ...customRequirements.map(r => r.id),
      ];

      const { error } = await supabase
        .from("impound_settings")
        .upsert({
          tenant_id: tenant.id,
          default_release_requirements: allRequirements,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" });

      if (error) throw error;
      toast.success("Release requirements saved");
    } catch (error: any) {
      console.error("Failed to save:", error);
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleRequirement = (id: string) => {
    setSelectedRequirements(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const addCustomRequirement = () => {
    if (!newCustom.label.trim()) return;
    const id = newCustom.label.toLowerCase().replace(/\s+/g, "_");
    setCustomRequirements(prev => [
      ...prev,
      { id, label: newCustom.label.trim(), description: newCustom.description.trim(), isBuiltIn: false },
    ]);
    setNewCustom({ label: "", description: "" });
  };

  const removeCustomRequirement = (id: string) => {
    setCustomRequirements(prev => prev.filter(r => r.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Build preview list
  const allActiveRequirements = [
    ...BUILT_IN_REQUIREMENTS.filter(r => selectedRequirements.includes(r.id)),
    ...customRequirements,
  ];

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary mb-1">What the AI tells customers</p>
            <p className="text-sm italic">
              "To pick up your vehicle, you'll need to bring 
              {allActiveRequirements.length > 0 
                ? ` ${allActiveRequirements.map(r => r.description || r.label.toLowerCase()).join(" and ")}.`
                : " a valid ID and payment."
              }"
            </p>
          </div>
        </div>
      </div>

      {/* Standard Requirements */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Standard Requirements</h4>
          </div>

          <div className="space-y-3">
            {BUILT_IN_REQUIREMENTS.map((req) => (
              <label
                key={req.id}
                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedRequirements.includes(req.id)}
                  onCheckedChange={() => toggleRequirement(req.id)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium">{req.label}</span>
                  <p className="text-xs text-muted-foreground">{req.description}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Requirements */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium">Custom Requirements</h4>
          <p className="text-sm text-muted-foreground">
            Add additional requirements specific to your business.
          </p>

          {customRequirements.length > 0 && (
            <div className="space-y-2">
              {customRequirements.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div>
                    <span className="text-sm font-medium">{req.label}</span>
                    {req.description && (
                      <p className="text-xs text-muted-foreground">{req.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomRequirement(req.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Requirement name"
                value={newCustom.label}
                onChange={(e) => setNewCustom(prev => ({ ...prev, label: e.target.value }))}
              />
              <Input
                placeholder="Description (optional)"
                value={newCustom.description}
                onChange={(e) => setNewCustom(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <Button
              variant="outline"
              onClick={addCustomRequirement}
              disabled={!newCustom.label.trim()}
              className="self-start"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Requirements
        </Button>
      </div>
    </div>
  );
}
