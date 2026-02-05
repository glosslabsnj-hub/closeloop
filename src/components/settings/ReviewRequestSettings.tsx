import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Info, Loader2, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReviewSettings {
  auto_send_reviews: boolean;
  review_delay_hours: number;
  review_channel: "sms" | "email" | "both";
  google_review_url: string;
  yelp_review_url: string;
}

export function ReviewRequestSettings() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState<ReviewSettings>({
    auto_send_reviews: false,
    review_delay_hours: 24,
    review_channel: "both",
    google_review_url: "",
    yelp_review_url: "",
  });

  useEffect(() => {
    if (tenant?.id) {
      loadSettings();
    }
  }, [tenant?.id]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("tenants")
        .select("auto_send_reviews, review_delay_hours, review_channel, google_review_url, yelp_review_url")
        .eq("id", tenant?.id)
        .single();

      if (data) {
        setSettings({
          auto_send_reviews: data.auto_send_reviews ?? false,
          review_delay_hours: data.review_delay_hours ?? 24,
          review_channel: (data.review_channel as "sms" | "email" | "both") ?? "both",
          google_review_url: data.google_review_url ?? "",
          yelp_review_url: data.yelp_review_url ?? "",
        });
      }
    } catch (err) {
      console.error("Error loading review settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!tenant?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          auto_send_reviews: settings.auto_send_reviews,
          review_delay_hours: settings.review_delay_hours,
          review_channel: settings.review_channel,
          google_review_url: settings.google_review_url,
          yelp_review_url: settings.yelp_review_url,
        })
        .eq("id", tenant.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Review request settings have been updated.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-yellow-500">
              <Star className="h-5 w-5 fill-yellow-500" />
            </div>
            <div>
              <CardTitle className="text-base">Review Requests</CardTitle>
              <CardDescription className="text-xs">
                Automatically request reviews after completed jobs
              </CardDescription>
            </div>
          </div>
          <Badge variant={settings.auto_send_reviews ? "default" : "secondary"}>
            {settings.auto_send_reviews ? "Active" : "Off"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-send toggle */}
        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-reviews" className="font-medium">
              Auto-send review requests
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p>
                  Automatically send review request to customers after a job is marked complete.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="auto-reviews"
            checked={settings.auto_send_reviews}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, auto_send_reviews: checked }))
            }
          />
        </div>

        {settings.auto_send_reviews && (
          <>
            {/* Delay setting */}
            <div className="space-y-2">
              <Label htmlFor="delay">Send request after</Label>
              <Select
                value={settings.review_delay_hours.toString()}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, review_delay_hours: parseInt(value) }))
                }
              >
                <SelectTrigger id="delay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="24">24 hours (recommended)</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Channel setting */}
            <div className="space-y-2">
              <Label htmlFor="channel">Send via</Label>
              <Select
                value={settings.review_channel}
                onValueChange={(value: "sms" | "email" | "both") =>
                  setSettings((prev) => ({ ...prev, review_channel: value }))
                }
              >
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS only</SelectItem>
                  <SelectItem value="email">Email only</SelectItem>
                  <SelectItem value="both">Both SMS and Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Review URLs */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="google-url">Google Review URL</Label>
              <a
                href="https://support.google.com/business/answer/7035772"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                How to find <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Input
              id="google-url"
              type="url"
              placeholder="https://g.page/r/..."
              value={settings.google_review_url}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, google_review_url: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="yelp-url">Yelp Review URL</Label>
              <a
                href="https://biz.yelp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                Find on Yelp <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Input
              id="yelp-url"
              type="url"
              placeholder="https://www.yelp.com/writeareview/biz/..."
              value={settings.yelp_review_url}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, yelp_review_url: e.target.value }))
              }
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4">
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
