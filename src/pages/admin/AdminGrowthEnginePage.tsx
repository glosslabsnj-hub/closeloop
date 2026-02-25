import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Settings, Rocket, Search, Mail, Share2, Megaphone,
  Activity, Users, MessageSquare, CheckCircle2, Loader2, Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAdminGrowthSettings } from "@/hooks/useAdminGrowthSettings";
import { useOutreachCampaigns } from "@/hooks/useAdminOutreach";
import { useAdminSocialPosts, useGrowthActivityLog } from "@/hooks/useAdminSocialPosts";
import { GrowthSettingsPanel } from "@/components/admin/growth/GrowthSettingsPanel";
import { GrowthSetupWizard } from "@/components/admin/growth/GrowthSetupWizard";
import { OutreachSequenceEditor } from "@/components/admin/growth/OutreachSequenceEditor";
import { OutreachCampaignManager } from "@/components/admin/growth/OutreachCampaignManager";
import { AdCampaignGenerator } from "@/components/admin/growth/AdCampaignGenerator";
import { AdCampaignList } from "@/components/admin/growth/AdCampaignList";
import { SocialContentCalendar } from "@/components/admin/growth/SocialContentCalendar";

const ACTIVITY_ICONS: Record<string, any> = {
  discovery: Search,
  outreach_sent: Mail,
  outreach_response: MessageSquare,
  social_posted: Share2,
  ad_created: Megaphone,
  enrollment: Users,
  conversion: CheckCircle2,
};

const ACTIVITY_COLORS: Record<string, string> = {
  discovery: "text-blue-600",
  outreach_sent: "text-green-600",
  outreach_response: "text-amber-600",
  social_posted: "text-purple-600",
  ad_created: "text-pink-600",
  enrollment: "text-cyan-600",
  conversion: "text-emerald-600",
};

export default function AdminGrowthEnginePage() {
  const { data: settings, isLoading: _settingsLoading } = useAdminGrowthSettings();
  const { data: campaigns } = useOutreachCampaigns();
  const { data: socialPosts } = useAdminSocialPosts();
  const { data: activityLog, isLoading: activityLoading } = useGrowthActivityLog(100);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const modules = [
    { key: "discovery", label: "Discovery", enabled: settings?.auto_discovery_enabled, icon: Search },
    { key: "outreach", label: "Outreach", enabled: settings?.auto_outreach_enabled, icon: Mail },
    { key: "social", label: "Social", enabled: settings?.auto_social_enabled, icon: Share2 },
    { key: "ads", label: "Ads", enabled: settings?.auto_ads_enabled, icon: Megaphone },
  ];

  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === "active");
  const totalEnrolled = activeCampaigns.reduce((sum, c) => sum + c.total_enrolled, 0);
  const totalResponded = activeCampaigns.reduce((sum, c) => sum + c.total_responded, 0);
  const totalConverted = activeCampaigns.reduce((sum, c) => sum + c.total_converted, 0);
  const scheduledPosts = (socialPosts ?? []).filter((p) => p.status === "scheduled").length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Growth Engine</h1>
            <p className="text-sm text-muted-foreground">Autonomous lead discovery, outreach, and content</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4 mr-2" /> Settings
        </Button>
      </div>

      {/* Autopilot Status Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Badge
              key={mod.key}
              variant="outline"
              className={`text-xs px-3 py-1.5 ${mod.enabled
                ? "bg-green-500/10 text-green-700 border-green-500/30"
                : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {mod.label}
              <span className={`ml-1.5 inline-block h-2 w-2 rounded-full ${mod.enabled ? "bg-green-500" : "bg-muted-foreground/30"}`} />
            </Badge>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Campaigns" value={activeCampaigns.length} icon={Rocket} />
        <StatCard label="Leads Enrolled" value={totalEnrolled} icon={Users} />
        <StatCard label="Responses" value={totalResponded} icon={MessageSquare} />
        <StatCard label="Conversions" value={totalConverted} icon={CheckCircle2} />
      </div>

      {/* Setup Wizard */}
      <GrowthSetupWizard />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs px-4">Activity Feed</TabsTrigger>
          <TabsTrigger value="sequences" className="text-xs px-4">Sequences</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs px-4">Campaigns</TabsTrigger>
          <TabsTrigger value="ads" className="text-xs px-4">Ads</TabsTrigger>
          <TabsTrigger value="social" className="text-xs px-4">Social</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Activity Feed */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Activity Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : !activityLog?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activity yet. Enable autopilot modules in Settings.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-[500px] overflow-y-auto">
                      {activityLog.map((entry) => {
                        const Icon = ACTIVITY_ICONS[entry.activity_type] || Activity;
                        const color = ACTIVITY_COLORS[entry.activity_type] || "text-muted-foreground";
                        return (
                          <div key={entry.id} className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-muted/50 text-xs">
                            <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{entry.title}</span>
                              {entry.description && (
                                <p className="text-muted-foreground truncate">{entry.description}</p>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar: Upcoming */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {scheduledPosts > 0 && (
                    <div className="text-xs flex items-center gap-2">
                      <Share2 className="h-3.5 w-3.5 text-purple-600" />
                      <span>{scheduledPosts} social post{scheduledPosts !== 1 ? "s" : ""} scheduled</span>
                    </div>
                  )}
                  {activeCampaigns.length > 0 && (
                    <div className="text-xs flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-green-600" />
                      <span>{activeCampaigns.length} active outreach campaign{activeCampaigns.length !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                  {!scheduledPosts && !activeCampaigns.length && (
                    <p className="text-xs text-muted-foreground">Nothing scheduled</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Active Campaigns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {activeCampaigns.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active campaigns</p>
                  ) : (
                    activeCampaigns.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="text-muted-foreground">{c.total_enrolled}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sequences" className="mt-4">
          <OutreachSequenceEditor />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <OutreachCampaignManager />
        </TabsContent>

        <TabsContent value="ads" className="mt-4 space-y-4">
          <AdCampaignGenerator />
          <AdCampaignList />
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <SocialContentCalendar />
        </TabsContent>
      </Tabs>

      <GrowthSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
