import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Network, X } from "lucide-react";
import {
  useReferralNetworkSettings,
  useUpdateReferralNetworkSettings,
} from "@/hooks/useReferralNetwork";

export function ReferralNetworkSettings() {
  const { data: settings, isLoading } = useReferralNetworkSettings();
  const updateSettings = useUpdateReferralNetworkSettings();

  const [enabled, setEnabled] = useState(false);
  const [acceptReferrals, setAcceptReferrals] = useState(true);
  const [sendReferrals, setSendReferrals] = useState(true);
  const [introStyle, setIntroStyle] = useState("enthusiastic");
  const [sameIndustryOk, setSameIndustryOk] = useState(false);
  const [maxPerDay, setMaxPerDay] = useState(20);
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setAcceptReferrals(settings.accept_referrals);
      setSendReferrals(settings.send_referrals);
      setIntroStyle(settings.intro_style || "enthusiastic");
      setSameIndustryOk(settings.same_industry_ok);
      setMaxPerDay(settings.max_referrals_per_day);
      setServices(settings.network_services || []);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      enabled,
      accept_referrals: acceptReferrals,
      send_referrals: sendReferrals,
      intro_style: introStyle,
      same_industry_ok: sameIndustryOk,
      max_referrals_per_day: maxPerDay,
      network_services: services,
    });
  };

  const addService = () => {
    const trimmed = newService.trim();
    if (trimmed && !services.includes(trimmed)) {
      setServices([...services, trimmed]);
      setNewService("");
    }
  };

  const removeService = (s: string) => {
    setServices(services.filter((svc) => svc !== s));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Network className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Referral Network</CardTitle>
              <CardDescription>
                When you can't help a caller, the AI can find another business on Flux Receptionist that can
                and warm-transfer the call with full context.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="referral-enabled" className="font-medium">
              Participate in the Referral Network
            </Label>
            <Switch
              id="referral-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              {/* Mode */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">Network Mode</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="send-referrals" className="text-sm text-muted-foreground">
                      Send referrals (when you can't help, offer to find someone who can)
                    </Label>
                    <Switch
                      id="send-referrals"
                      checked={sendReferrals}
                      onCheckedChange={setSendReferrals}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="accept-referrals" className="text-sm text-muted-foreground">
                      Receive referrals (other businesses can transfer callers to you)
                    </Label>
                    <Switch
                      id="accept-referrals"
                      checked={acceptReferrals}
                      onCheckedChange={setAcceptReferrals}
                    />
                  </div>
                </div>
              </div>

              {/* Services */}
              {acceptReferrals && (
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium">
                    Services You Can Receive Referrals For
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    What services should other businesses know you offer?
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      placeholder="e.g., auto detailing, emergency towing..."
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
                    />
                    <Button variant="outline" size="sm" onClick={addService}>
                      Add
                    </Button>
                  </div>
                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {services.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1">
                          {s}
                          <button onClick={() => removeService(s)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Intro Style */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">Introduction Style</Label>
                <p className="text-xs text-muted-foreground">
                  How should the AI introduce your business when referring callers to you?
                </p>
                <Select value={introStyle} onValueChange={setIntroStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enthusiastic">
                      Enthusiastic - "Great news! I found..."
                    </SelectItem>
                    <SelectItem value="neutral">
                      Neutral - "I found [business], they handle..."
                    </SelectItem>
                    <SelectItem value="minimal">
                      Minimal - "[Business] is nearby and can help."
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Controls */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="same-industry" className="text-sm font-medium">
                      Allow Same-Industry Referrals
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Allow referrals from businesses in the same industry (competitors)
                    </p>
                  </div>
                  <Switch
                    id="same-industry"
                    checked={sameIndustryOk}
                    onCheckedChange={setSameIndustryOk}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Max Referrals Per Day: {maxPerDay}
                  </Label>
                  <Slider
                    value={[maxPerDay]}
                    onValueChange={([v]) => setMaxPerDay(v)}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
              </div>

              {/* Quality Info */}
              {settings && (
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-semibold">{settings.quality_score}</p>
                      <p className="text-xs text-muted-foreground">Quality Score</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{settings.referrals_today}</p>
                      <p className="text-xs text-muted-foreground">Today</p>
                    </div>
                    <div>
                      <Badge variant={settings.go_live_ready ? "default" : "secondary"}>
                        {settings.go_live_ready ? "Ready" : "Not Ready"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Network Status</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
