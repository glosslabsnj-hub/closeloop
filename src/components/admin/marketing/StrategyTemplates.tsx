import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Megaphone, TrendingUp, Mail, FileText, Handshake, Search,
  Target, Zap, BarChart3, Video, Mic, DollarSign, Users, Globe,
} from "lucide-react";

const TEMPLATES = [
  // --- SOCIAL MEDIA ---
  {
    title: "30-Day Social Media Launch Plan",
    description: "Complete day-by-day content calendar with exact post copy, hashtags, images, and scheduling for all platforms.",
    prompt: `Create a complete 30-day social media launch plan for CloseLoop (AI phone receptionist for local businesses like towing, HVAC, dental, salons, restaurants). 

For EACH of the 30 days, provide:
1. **Platform** (rotate LinkedIn, Instagram, TikTok, Facebook, X/Twitter)
2. **Content Type** (carousel, video script, story, poll, thread, reel)
3. **Exact Post Copy** (ready to copy-paste, including emojis)
4. **Hashtags** (10-15 per post)
5. **Visual Direction** (what the image/video should show)
6. **Best Posting Time** (with timezone)
7. **Engagement Tactic** (CTA, question, poll option)

Week 1: Pain point awareness ("You're losing $10K/month in missed calls")
Week 2: Social proof & case studies  
Week 3: Product demos & how-it-works
Week 4: Urgency & conversion ("Limited spots for beta pricing")

Include 5 viral-potential TikTok/Reel scripts showing before/after scenarios of businesses missing calls vs. using CloseLoop.`,
    category: "social",
    icon: Calendar,
    tag: "Done for You",
  },
  {
    title: "LinkedIn Thought Leadership Playbook",
    description: "20 ready-to-post LinkedIn articles and posts positioning you as the AI receptionist authority.",
    prompt: `Write 20 complete LinkedIn posts for CloseLoop's founder to establish thought leadership in the AI receptionist space. Mix of formats:

- 5 **Story Posts** (personal experiences, lessons learned, customer wins)
- 5 **Data Posts** (industry stats about missed calls, SMB revenue loss)
- 5 **How-To Posts** (actionable tips for business owners)
- 5 **Controversial/Hot Takes** (bold opinions about AI in small business)

Each post must include:
1. **Hook line** (first line that stops the scroll)
2. **Full post copy** (200-400 words, formatted with line breaks)
3. **CTA** (comment prompt, link to demo, etc.)
4. **Best day/time to post**
5. **Engagement strategy** (who to tag, which comments to reply to)

Write these so they're immediately publishable — no placeholders, no "[insert X]".`,
    category: "social",
    icon: Users,
    tag: "Ready to Post",
  },

  // --- PAID ADS ---
  {
    title: "Google Ads Campaign (Full Build)",
    description: "Complete Google Ads structure: campaigns, ad groups, keywords, ad copy, extensions, and budget allocation.",
    prompt: `Build a COMPLETE Google Ads campaign for CloseLoop ready to import. Include:

**Campaign Structure:**
- 4 campaigns (Search Brand, Search Non-Brand, Search Competitor, Display Remarketing)
- 3-5 ad groups per campaign

**For Each Ad Group:**
- 15-20 keywords with match types (exact, phrase, broad)
- 3 responsive search ads (15 headlines + 4 descriptions each)
- Negative keyword lists (shared + campaign-specific)
- Ad extensions (sitelinks, callouts, structured snippets, call extensions)

**Industry-Specific Ad Groups for:**
Towing, HVAC, Dental, Salon, Restaurant, Plumber, Auto Repair

**Budget Recommendations:**
- Daily budget per campaign
- Bid strategy recommendations
- Expected CPC, CTR, and conversion rates by industry
- Monthly spend scenarios ($500, $2,000, $5,000)

**Landing Page Requirements:**
- Hero headline and subheadline for each industry
- Above-the-fold elements needed
- Social proof placement

Make all ad copy compliant with Google policies. Include exact character counts.`,
    category: "ads",
    icon: Megaphone,
    tag: "Campaign Ready",
  },
  {
    title: "Meta Ads (Facebook + Instagram) Funnel",
    description: "Full-funnel Meta ad campaign with audiences, creatives, and copy for every stage.",
    prompt: `Design a complete Meta Ads (Facebook + Instagram) funnel for CloseLoop:

**TOFU (Awareness) — $50/day:**
- 3 video ad scripts (15s, 30s, 60s) showing missed call pain
- 3 static image ad concepts with exact copy
- Audience targeting: interests, behaviors, lookalikes
- Placement optimization recommendations

**MOFU (Consideration) — $30/day:**
- 3 carousel ads showing features/benefits
- 2 lead magnet ads (free guide: "The Hidden Cost of Missed Calls")
- Retargeting audiences from TOFU
- Landing page copy for lead magnet

**BOFU (Conversion) — $20/day:**
- 3 testimonial/case study ads
- 2 limited-time offer ads
- Retargeting audiences from MOFU
- Direct demo booking ads

For EACH ad provide:
1. Primary text (exact copy)
2. Headline
3. Description
4. CTA button choice
5. Visual description/script
6. Audience targeting details
7. Estimated CPL and ROAS`,
    category: "ads",
    icon: Target,
    tag: "Full Funnel",
  },

  // --- CONTENT ---
  {
    title: "10 Blog Posts + SEO Strategy",
    description: "Complete blog posts with titles, outlines, meta descriptions, and internal linking strategy.",
    prompt: `Write 10 complete, SEO-optimized blog posts for CloseLoop's website. Each post should be 1,500-2,000 words.

**Post Topics (with target keywords):**
1. "How Much Revenue Are You Losing From Missed Calls?" (missed calls revenue loss)
2. "AI Receptionist vs. Virtual Receptionist: Complete Comparison" (AI receptionist vs virtual receptionist)
3. "Why Every Towing Company Needs an AI Phone System" (towing company phone system)
4. "The Ultimate Guide to Never Missing a Customer Call Again" (never miss a call)
5. "How AI is Transforming the Dental Office Front Desk" (dental office AI receptionist)
6. "5 Signs Your HVAC Business is Losing Customers to Missed Calls" (HVAC missed calls)
7. "Restaurant Reservations on Autopilot: How AI Handles Booking" (restaurant AI booking)
8. "The Small Business Owner's Guide to AI Phone Automation" (small business AI phone)
9. "How to Choose the Best AI Receptionist for Your Business" (best AI receptionist)
10. "ROI Calculator: What an AI Receptionist is Worth to Your Business" (AI receptionist ROI)

For EACH post provide:
- SEO title tag (under 60 chars)
- Meta description (under 160 chars)
- H1, H2, H3 structure
- Full article copy
- Internal linking suggestions
- CTA placement
- Featured image description`,
    category: "content",
    icon: FileText,
    tag: "SEO Ready",
  },
  {
    title: "Video Content Scripts (YouTube + TikTok)",
    description: "15 complete video scripts for YouTube tutorials, TikTok virals, and customer testimonial formats.",
    prompt: `Write 15 complete video scripts for CloseLoop:

**YouTube (Long-form, 5-8 min each):**
1. "I Built an AI Receptionist That Answers Calls 24/7 — Here's What Happened"
2. "How This Towing Company Doubled Revenue with AI"
3. "5 Ways AI is Replacing the Traditional Receptionist"
4. "Stop Losing $10K/Month: The Missed Call Crisis in Small Business"
5. "CloseLoop Demo: Watch Our AI Book an Appointment in Real-Time"

**TikTok/Reels (15-60 sec each):**
6. "POV: Your AI receptionist handles a 2am emergency towing call"
7. "Business owner checks phone: 47 missed calls. Here's the fix."
8. "What if your best employee never slept, never called in sick?"
9. "I replaced my receptionist with AI. The results shocked me."
10. "Small business owners: you're losing money while you sleep"

**Customer Testimonial Format (2-3 min):**
11-15. Template scripts for: towing, dental, HVAC, salon, restaurant

For each script include: hook, full dialogue/narration, B-roll suggestions, on-screen text, music mood, CTA, and thumbnail concept.`,
    category: "content",
    icon: Video,
    tag: "Script Ready",
  },

  // --- OUTREACH ---
  {
    title: "Cold Email + LinkedIn DM Sequences",
    description: "Complete multi-touch outreach sequences for SMBs and agency partners with A/B variants.",
    prompt: `Create complete outreach sequences for CloseLoop:

**SEQUENCE 1: Direct to SMB Owners (7-touch, 21 days)**
For each email:
- Subject line (with A/B variant)
- Full email body (under 120 words)
- PS line
- Send timing (day of week + time)
- Follow-up trigger conditions

Touch 1: Pain point intro (missed calls)
Touch 2: Industry-specific case study
Touch 3: LinkedIn connection request + message
Touch 4: Value-add (send industry report)
Touch 5: Social proof (testimonial share)
Touch 6: Break-up email
Touch 7: Last chance with special offer

**SEQUENCE 2: Agency Partner Recruitment (5-touch, 14 days)**
Same format, focused on revenue opportunity for agencies.

**SEQUENCE 3: LinkedIn DM Campaign (5-message)**
For warm leads who viewed your profile or engaged with content.

For each message provide exact copy, no placeholders. Include personalization variables like {{first_name}}, {{company}}, {{industry}}.`,
    category: "outreach",
    icon: Mail,
    tag: "Copy-Paste Ready",
  },
  {
    title: "Partnership & Channel Strategy",
    description: "Complete playbook for building an agency reseller channel with commission structure and enablement materials.",
    prompt: `Create a comprehensive Partnership Channel Strategy for CloseLoop:

**1. Partner Tiers & Economics:**
- Referral Partner (10% recurring commission)
- Reseller Partner (20% recurring, white-label option)
- Strategic Partner (25%+ custom, co-marketing)
- Revenue projections per tier (10, 25, 50 clients)

**2. Partner Recruitment Playbook:**
- Ideal partner profile (agency size, services, client base)
- Outreach channels and messaging
- Partnership application process
- Vetting criteria and scoring

**3. Sales Enablement Kit:**
- One-pager (exact copy)
- Pitch deck outline (slide by slide with key messages)
- Demo script for partners to use
- FAQ sheet (15 common objections with rebuttals)
- ROI calculator walkthrough

**4. Partner Onboarding (30-day plan):**
- Week 1: Training and certification
- Week 2: First client identification
- Week 3: Co-selling support
- Week 4: Independent selling

**5. Partner Marketing Support:**
- Co-branded email templates
- Social media posts partners can use
- Webinar series plan
- Commission tracking and payout process`,
    category: "outreach",
    icon: Handshake,
    tag: "Full Playbook",
  },

  // --- SCALING ---
  {
    title: "0 to 100 Customers Acquisition Plan",
    description: "Detailed 90-day plan with exact tactics, budgets, and milestones to hit 100 paying customers.",
    prompt: `Create an extremely detailed 90-day plan to acquire the first 100 paying customers for CloseLoop (AI phone receptionist, $249-$2,999/mo plans):

**Phase 1: Days 1-30 (Target: 15 customers)**
- Exact daily actions (hour by hour for week 1)
- Channel allocation: cold outreach (40%), content (20%), paid (20%), partnerships (20%)
- Budget: $3,000 total
- Cold outreach: 50 personalized emails/day + 20 LinkedIn DMs
- Content: 3 blog posts, 10 social posts, 2 video scripts
- Paid: $1,000 Google Ads budget with exact campaign setup
- Partnerships: 10 agency outreach conversations
- KPIs to track daily

**Phase 2: Days 31-60 (Target: 35 cumulative)**
- Scale what's working from Phase 1
- Add referral program launch
- Launch webinar series (2 per month)
- Increase paid to $2,000/mo
- Start PR/podcast outreach (15 pitches)

**Phase 3: Days 61-90 (Target: 100 cumulative)**
- Scale paid to $3,000/mo
- Activate partner channel (5 active agencies)
- Launch affiliate program
- Community building (Facebook group, Discord)
- Case study marketing (5 published)

For each phase include: exact budget breakdown, expected CAC, expected LTV, and conversion rates at each funnel stage.`,
    category: "scaling",
    icon: TrendingUp,
    tag: "Full Roadmap",
  },
  {
    title: "Pricing & Positioning Strategy",
    description: "Competitive analysis, pricing psychology, and positioning framework for maximum conversion.",
    prompt: `Develop a comprehensive Pricing & Positioning Strategy for CloseLoop:

**1. Competitive Landscape Analysis:**
- Map all competitors (Ruby, Smith.ai, Nexa, Dialzara, etc.)
- Feature comparison matrix
- Pricing comparison table
- CloseLoop's competitive moat

**2. Positioning Framework:**
- Category: What category do we own?
- Target: Who is the primary buyer persona? (detailed profile)
- Differentiation: What makes us uniquely valuable?
- Proof: What evidence supports our claims?
- Tagline options (5 alternatives with rationale)

**3. Pricing Psychology:**
- Anchoring strategy (show enterprise price first)
- Decoy pricing analysis (which plan is the decoy?)
- Annual vs monthly discount strategy
- Free trial vs freemium analysis
- Overage pricing optimization

**4. Sales Page Framework:**
- Above-the-fold formula
- Social proof placement strategy
- Objection handling section
- Urgency/scarcity tactics (ethical)
- CTA optimization

**5. Industry-Specific Value Props:**
For towing, dental, HVAC, restaurant, salon — specific ROI calculations and messaging.`,
    category: "scaling",
    icon: DollarSign,
    tag: "Strategic",
  },
  {
    title: "Webinar & Podcast Launch Kit",
    description: "Complete webinar scripts, podcast pitch templates, and guest appearance strategy.",
    prompt: `Create a complete Webinar & Podcast Strategy for CloseLoop:

**WEBINAR SERIES (4 webinars):**

Webinar 1: "The $120K Leak: How Missed Calls Are Killing Your Business"
- Full script (45 min presentation + 15 min Q&A)
- Slide-by-slide outline with key talking points
- Demo section script
- Offer/CTA at the end
- Registration page copy
- 5 promotional emails
- Social media promotion plan

Webinar 2: "AI Reception for [Industry]: Live Demo"
- Rotate industries monthly
- Full interactive demo script
- Audience participation elements

Webinar 3: "Agency Partners: Add $50K ARR to Your Business"
- For recruiting reseller partners

Webinar 4: "Customer Success Stories: Real Businesses, Real Results"
- Panel format with customers

**PODCAST GUEST STRATEGY:**
- 20 podcast targets (with why each is a fit)
- 3 pitch email templates
- 5 talking point frameworks
- Bio and one-liner for each pitch
- Follow-up sequence after appearance`,
    category: "content",
    icon: Mic,
    tag: "Full Scripts",
  },
  {
    title: "SEO & Local Marketing Domination",
    description: "Complete SEO strategy with keyword map, content clusters, and local SEO tactics for each vertical.",
    prompt: `Build a complete SEO and Local Marketing strategy for CloseLoop:

**1. Keyword Strategy (100+ keywords):**
Group by intent:
- Informational: "what is an AI receptionist", "missed call statistics"
- Commercial: "best AI receptionist for dentists", "virtual receptionist pricing"
- Transactional: "AI receptionist free trial", "buy AI phone system"
- Local: "AI receptionist [city]" for top 50 US cities

For each keyword: search volume estimate, difficulty, content type needed, priority score.

**2. Content Cluster Strategy:**
- 5 pillar pages with 8-10 cluster articles each
- Internal linking map
- Content production calendar (6 months)

**3. Technical SEO Checklist:**
- Site structure recommendations
- Schema markup (FAQ, Product, Review)
- Core Web Vitals optimization
- Mobile optimization priorities

**4. Link Building Plan:**
- 10 HARO response templates
- 15 guest post targets with pitch emails
- Resource page link opportunities
- Industry directory submissions (50 directories)

**5. Industry-Specific Landing Pages:**
- For each of 15 industries: headline, subheadline, 3 bullets, CTA, testimonial placement, FAQ section`,
    category: "content",
    icon: Search,
    tag: "Full Strategy",
  },
];

interface StrategyTemplatesProps {
  onSelectTemplate: (prompt: string, category: string) => void;
}

const TAG_COLORS: Record<string, string> = {
  "Done for You": "bg-green-500/10 text-green-700 border-green-500/20",
  "Ready to Post": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Campaign Ready": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Full Funnel": "bg-purple-500/10 text-purple-700 border-purple-500/20",
  "SEO Ready": "bg-teal-500/10 text-teal-700 border-teal-500/20",
  "Script Ready": "bg-pink-500/10 text-pink-700 border-pink-500/20",
  "Copy-Paste Ready": "bg-amber-500/10 text-amber-700 border-amber-500/20",
  "Full Playbook": "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  "Full Roadmap": "bg-red-500/10 text-red-700 border-red-500/20",
  "Strategic": "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  "Full Scripts": "bg-violet-500/10 text-violet-700 border-violet-500/20",
  "Full Strategy": "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

export function StrategyTemplates({ onSelectTemplate }: StrategyTemplatesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Strategy Templates</h3>
        <p className="text-sm text-muted-foreground">
          Click any template to generate a comprehensive, ready-to-execute marketing strategy. Each produces detailed, actionable output — not vague advice.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.title}
              className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
              onClick={() => onSelectTemplate(template.prompt, template.category)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">{template.title}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">{template.category}</Badge>
                      {template.tag && (
                        <Badge variant="outline" className={`text-[10px] ${TAG_COLORS[template.tag] || ""}`}>
                          {template.tag}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{template.description}</p>
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
