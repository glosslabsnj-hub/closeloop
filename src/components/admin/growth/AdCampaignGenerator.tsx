import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useGenerateAdCopy } from "@/hooks/useAdminAdCampaigns";

const PLATFORMS = [
  { value: "google", label: "Google Ads" },
  { value: "meta", label: "Meta Ads (Facebook/Instagram)" },
  { value: "linkedin", label: "LinkedIn Ads" },
];

const OBJECTIVES = [
  { value: "leads", label: "Lead Generation" },
  { value: "awareness", label: "Brand Awareness" },
  { value: "conversions", label: "Conversions" },
  { value: "traffic", label: "Website Traffic" },
];

const INDUSTRIES = [
  "towing", "plumber", "hvac", "electrician", "locksmith",
  "auto repair", "dental", "med spa", "salon", "pest control",
  "landscaping", "roofing", "mobile detailing", "cleaning service",
  "restaurant", "veterinary", "real estate", "insurance agency",
  "law firm", "fitness studio", "general",
];

export function AdCampaignGenerator() {
  const [platform, setPlatform] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [objective, setObjective] = useState("");
  const generateAd = useGenerateAdCopy();

  const handleGenerate = () => {
    if (!platform || !industry || !location || !objective) return;
    generateAd.mutate({ platform, industry, location, objective });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Ad Campaign
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind} className="capitalize">{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1"
              placeholder="e.g. Austin, TX"
            />
          </div>
          <div>
            <Label className="text-xs">Objective</Label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select objective" /></SelectTrigger>
              <SelectContent>
                {OBJECTIVES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateAd.isPending || !platform || !industry || !location || !objective}
          className="w-full"
        >
          {generateAd.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Generate Ad Copy</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
