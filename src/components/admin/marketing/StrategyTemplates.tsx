import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Megaphone, TrendingUp, Mail, FileText, Handshake, Search,
} from "lucide-react";

const TEMPLATES = [
  {
    title: "7-Day Social Media Calendar",
    description: "Generate a full week of social media posts tailored to CloseLoop's target market — local service businesses.",
    prompt: "Create a detailed 7-day social media calendar for CloseLoop (AI phone receptionist for local businesses). Include posts for LinkedIn, Twitter/X, Facebook, and Instagram. Focus on pain points like missed calls, after-hours inquiries, and booking automation. Include post copy, suggested images/videos, hashtags, and best posting times.",
    category: "social",
    icon: Calendar,
  },
  {
    title: "Google Ads Campaign Builder",
    description: "Build a complete Google Ads campaign targeting SMB owners who are losing calls.",
    prompt: "Build a comprehensive Google Ads campaign for CloseLoop targeting local business owners. Include: campaign structure (search + display), 20 keyword groups with match types, 10 ad copy variations (headlines + descriptions), negative keywords, landing page recommendations, suggested budget allocation, and expected metrics. Focus on industries like towing, HVAC, dental, salon, and restaurants.",
    category: "ads",
    icon: Megaphone,
  },
  {
    title: "Agency Growth Playbook",
    description: "A step-by-step playbook for recruiting and enabling agency partners.",
    prompt: "Create a comprehensive Agency Growth Playbook for CloseLoop. Include: ideal agency partner profile, outreach strategy (cold email + LinkedIn), partnership tiers and commission structure recommendations, onboarding process for new agencies, sales enablement materials needed, KPIs to track, and a 90-day ramp plan. Focus on marketing agencies, IT consultants, and business coaches.",
    category: "outreach",
    icon: TrendingUp,
  },
  {
    title: "Cold Email Outreach Sequence",
    description: "Multi-touch cold email sequence for reaching SMB owners and agency partners.",
    prompt: "Write a 5-email cold outreach sequence for CloseLoop targeting local business owners who are missing calls. Each email should: be under 150 words, have a compelling subject line, focus on one specific pain point, include a clear CTA, and build on the previous email. Also create a separate 3-email sequence for agency partner recruitment. Include send timing recommendations.",
    category: "outreach",
    icon: Mail,
  },
  {
    title: "Case Study Generator",
    description: "Template and framework for creating compelling customer case studies.",
    prompt: "Create a case study framework and 3 example case studies for CloseLoop. Use realistic scenarios: 1) A towing company that was missing 40% of after-hours calls, 2) A dental office that reduced no-shows by 60% with AI booking, 3) A restaurant that automated reservation handling. For each, include: challenge, solution, results (with specific metrics), and customer quote. Also provide a reusable template for future case studies.",
    category: "content",
    icon: FileText,
  },
  {
    title: "Partnership Pitch Deck Outline",
    description: "Outline for a pitch deck to recruit new agency and reseller partners.",
    prompt: "Create a detailed outline for a CloseLoop Agency Partnership pitch deck (12-15 slides). Include: market opportunity (SMBs missing calls), what CloseLoop does, why agencies should partner, commission/revenue model, how it integrates with existing agency services, onboarding support provided, success stories, and next steps. For each slide, provide the key message, supporting data points, and suggested visuals.",
    category: "outreach",
    icon: Handshake,
  },
  {
    title: "SEO Content Strategy",
    description: "Comprehensive SEO strategy with content calendar and keyword targets.",
    prompt: "Develop a 3-month SEO content strategy for CloseLoop. Include: keyword research (30+ target keywords grouped by intent), content calendar with blog post topics, pillar page strategy, internal linking plan, on-page optimization checklist, and link building opportunities. Focus on keywords like 'AI receptionist for [industry]', 'missed call solutions', 'virtual receptionist for small business', etc. Include estimated search volumes and difficulty.",
    category: "content",
    icon: Search,
  },
];

interface StrategyTemplatesProps {
  onSelectTemplate: (prompt: string, category: string) => void;
}

export function StrategyTemplates({ onSelectTemplate }: StrategyTemplatesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Strategy Templates</h3>
        <p className="text-sm text-muted-foreground">
          Click a template to auto-populate the chat with a pre-built marketing prompt.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.title}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onSelectTemplate(template.prompt, template.category)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{template.title}</h4>
                      <Badge variant="secondary" className="text-[10px] capitalize">{template.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
