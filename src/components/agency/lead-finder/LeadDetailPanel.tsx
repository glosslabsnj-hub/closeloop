import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Phone, Globe, Star, MapPin, ExternalLink, Copy, Building2, Bookmark, Check, Rocket,
  Mail, Clock, User, TrendingDown, AlertTriangle, MessageSquare, PhoneOff, Map,
} from "lucide-react";
import { toast } from "sonner";
import { getTemperatureColor, getTemperatureIcon, type ScoredLead } from "./leadScoring";
import { SIGNAL_LABELS, TECH_STACK_LABELS, CONTACT_METHOD_LABELS, STATUS_LABELS } from "./leadConstants";
import { useUpdateSavedLead } from "@/hooks/useAgencyLeads";

export interface AgencyLead {
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  reason: string;
  friction_signals: string[];
  confidence: "high" | "medium" | "low";
  industry?: string;
  employee_estimate?: string | null;
  hours?: string | null;
  score?: ScoredLead;
  // Enriched fields
  email?: string | null;
  google_maps_url?: string | null;
  social_media?: { facebook?: string | null; instagram?: string | null; yelp?: string | null } | null;
  owner_name?: string | null;
  years_in_business?: number | null;
  estimated_monthly_calls?: number | null;
  estimated_missed_call_pct?: number | null;
  pain_points?: string[] | null;
  tech_stack_signals?: string[] | null;
  best_contact_method?: string | null;
  best_contact_time?: string | null;
}

interface LeadDetailPanelProps {
  lead: AgencyLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaved?: boolean;
  onSave?: () => void;
  savingInProgress?: boolean;
  savedLeadId?: string | null;
  agencyId?: string;
  savedStatus?: string;
  savedNotes?: string;
  onProvisionLead?: (lead: { name: string; industry?: string }) => void;
}

export function LeadDetailPanel({
  lead, open, onOpenChange,
  isSaved, onSave, savingInProgress,
  savedLeadId, agencyId, savedStatus, savedNotes,
  onProvisionLead,
}: LeadDetailPanelProps) {
  const [notes, setNotes] = useState(savedNotes || "");
  const [notesChanged, setNotesChanged] = useState(false);
  const updateLead = useUpdateSavedLead(agencyId);

  useEffect(() => {
    setNotes(savedNotes || "");
    setNotesChanged(false);
  }, [savedLeadId, savedNotes]);

  if (!lead) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error(`Failed to copy ${label}`)
    );
  };

  const handleStatusChange = (status: string) => {
    if (savedLeadId) {
      updateLead.mutate({ id: savedLeadId, status });
      toast.success(`Status updated to ${STATUS_LABELS[status]}`);
    }
  };

  const handleSaveNotes = () => {
    if (savedLeadId) {
      updateLead.mutate({ id: savedLeadId, notes });
      setNotesChanged(false);
      toast.success("Notes saved");
    }
  };

  const handleProvision = () => {
    if (onProvisionLead) {
      onProvisionLead({ name: lead.name, industry: lead.industry });
      onOpenChange(false);
    }
  };

  const temp = lead.score;
  const canProvision = !!onProvisionLead;
  const contactMethod = lead.best_contact_method ? CONTACT_METHOD_LABELS[lead.best_contact_method] : null;

  // Generate a quick cold-call script based on lead data
  const generateScript = () => {
    const missedWeekly = lead.estimated_monthly_calls && lead.estimated_missed_call_pct
      ? Math.round((lead.estimated_monthly_calls * (lead.estimated_missed_call_pct / 100)) / 4)
      : null;
    const ownerGreeting = lead.owner_name ? `Hi ${lead.owner_name}, this is` : "Hi, this is";
    const painLine = lead.pain_points?.[0]
      ? `I noticed some of your customers have mentioned ${lead.pain_points[0].toLowerCase()}.`
      : "I noticed you might be missing some calls when you're busy with customers.";
    const missedLine = missedWeekly
      ? `Based on your business size, you could be missing around ${missedWeekly} calls a week — that's potentially $${missedWeekly * 150}-$${missedWeekly * 300} in lost revenue monthly.`
      : "Every missed call is a potential customer going to your competitor.";

    return `${ownerGreeting} [YOUR NAME] with CloseLoop. I work with ${lead.industry || "local"} businesses in your area.

${painLine}

${missedLine}

We have an AI receptionist that answers every call 24/7 — it books appointments, takes messages, and never puts anyone on hold. Would you be open to a quick 5-minute demo?`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left text-lg leading-tight">{lead.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-0.5">
                {lead.industry && (
                  <span className="text-xs text-muted-foreground capitalize">{lead.industry}</span>
                )}
                {lead.years_in_business && (
                  <span className="text-xs text-muted-foreground">• {lead.years_in_business}+ years</span>
                )}
              </div>
            </div>
            {temp && (
              <Badge variant="outline" className={`shrink-0 ${getTemperatureColor(temp.temperature)}`}>
                {getTemperatureIcon(temp.temperature)} {temp.temperature} ({temp.score})
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Save / Status Controls */}
          <div className="flex items-center gap-2">
            {isSaved ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                <Check className="h-3 w-3 mr-1" /> Saved
              </Badge>
            ) : onSave ? (
              <Button size="sm" variant="outline" onClick={onSave} disabled={savingInProgress}>
                <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                Save Lead
              </Button>
            ) : null}

            {savedLeadId && (
              <Select value={savedStatus || "new"} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {contactMethod && (
              <Badge variant="secondary" className="text-xs">
                {contactMethod.emoji} Best: {contactMethod.label}
              </Badge>
            )}
          </div>

          {/* Call Intelligence */}
          {(lead.estimated_monthly_calls || lead.estimated_missed_call_pct) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <PhoneOff className="h-3.5 w-3.5" /> Call Intelligence
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">est.</Badge>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {lead.estimated_monthly_calls && (
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Monthly Calls</div>
                    <div className="font-semibold mt-1 text-lg">~{lead.estimated_monthly_calls}</div>
                  </div>
                )}
                {lead.estimated_missed_call_pct != null && (
                  <div className="rounded-lg border p-3 border-destructive/20">
                    <div className="text-xs text-muted-foreground">Missed Calls</div>
                    <div className="font-semibold mt-1 text-lg text-destructive">~{lead.estimated_missed_call_pct}%</div>
                    {lead.estimated_monthly_calls && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        ~{Math.round((lead.estimated_monthly_calls * (lead.estimated_missed_call_pct / 100)) / 4)}/week
                      </div>
                    )}
                  </div>
                )}
              </div>
              {lead.best_contact_time && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Best time to call: <span className="font-medium text-foreground">{lead.best_contact_time}</span>
                </div>
              )}
            </div>
          )}

          {/* Why They Need CloseLoop */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Why They Need CloseLoop</h4>
            <p className="text-sm leading-relaxed">{lead.reason}</p>
          </div>

          {/* Pain Points */}
          {lead.pain_points && lead.pain_points.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Pain Points (from reviews)
              </h4>
              <div className="space-y-1.5">
                {lead.pain_points.map((point, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <TrendingDown className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scoring Breakdown */}
          {temp && temp.reasons.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Score Breakdown</h4>
              <div className="space-y-1.5">
                {temp.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">+</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Score</span>
                  <span>{temp.score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      temp.temperature === "hot" ? "bg-red-500" :
                      temp.temperature === "warm" ? "bg-amber-500" : "bg-sky-500"
                    }`}
                    style={{ width: `${Math.min(temp.score, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Contact Info */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact Information</h4>
            <div className="space-y-3">
              {lead.owner_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{lead.owner_name}</span>
                  <span className="text-xs text-muted-foreground">(Owner)</span>
                </div>
              )}

              {lead.phone ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${lead.phone}`} className="text-sm hover:underline">{lead.phone}</a>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(lead.phone!, "Phone")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" /><span>No phone found</span>
                </div>
              )}

              {lead.email && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${lead.email}`} className="text-sm hover:underline truncate">{lead.email}</a>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(lead.email!, "Email")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {lead.website ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline truncate">
                      {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(lead.website!, "Website")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" /><span>No website found</span>
                </div>
              )}

              {lead.address && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    {lead.google_maps_url ? (
                      <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline truncate">
                        {lead.address}
                      </a>
                    ) : (
                      <span className="text-sm truncate">{lead.address}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(lead.address!, "Address")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Digital Presence */}
          {lead.social_media && (lead.social_media.facebook || lead.social_media.instagram || lead.social_media.yelp) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Digital Presence</h4>
              <div className="flex flex-wrap gap-2">
                {lead.social_media.facebook && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                    <a href={lead.social_media.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
                  </Button>
                )}
                {lead.social_media.instagram && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                    <a href={lead.social_media.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
                  </Button>
                )}
                {lead.social_media.yelp && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                    <a href={lead.social_media.yelp} target="_blank" rel="noopener noreferrer">Yelp</a>
                  </Button>
                )}
                {lead.google_maps_url && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                    <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer">
                      <Map className="h-3 w-3 mr-1" /> Google Maps
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Business Details */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Business Details</h4>
            <div className="grid grid-cols-2 gap-3">
              {lead.rating != null && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Rating</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{lead.rating}</span>
                    {lead.review_count != null && (
                      <span className="text-xs text-muted-foreground">({lead.review_count} reviews)</span>
                    )}
                  </div>
                </div>
              )}
              {lead.employee_estimate && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Team Size</div>
                  <div className="font-semibold mt-1 text-sm">{lead.employee_estimate}</div>
                </div>
              )}
              {lead.hours && (
                <div className="rounded-lg border p-3 col-span-2">
                  <div className="text-xs text-muted-foreground">Hours</div>
                  <div className="text-sm mt-1">{lead.hours}</div>
                </div>
              )}
            </div>
          </div>

          {/* Friction Signals */}
          {lead.friction_signals?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Friction Signals</h4>
              <div className="flex flex-wrap gap-1.5">
                {lead.friction_signals.map((signal) => (
                  <Badge key={signal} variant="secondary" className="text-xs">
                    {SIGNAL_LABELS[signal] || signal}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tech Stack Signals */}
          {lead.tech_stack_signals && lead.tech_stack_signals.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tech Gaps</h4>
              <div className="flex flex-wrap gap-1.5">
                {lead.tech_stack_signals.map((signal) => (
                  <Badge key={signal} variant="outline" className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-400">
                    {TECH_STACK_LABELS[signal] || signal}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Cold Call Script */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Outreach Script
            </h4>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm whitespace-pre-line leading-relaxed">{generateScript()}</p>
              <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => copyToClipboard(generateScript(), "Script")}>
                <Copy className="h-3 w-3 mr-1" /> Copy Script
              </Button>
            </div>
          </div>

          {/* Notes (saved leads only) */}
          {savedLeadId && (
            <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</h4>
                <Textarea
                  placeholder="Add notes about this lead (what they said, follow-up date, etc.)"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesChanged(true); }}
                  className="min-h-[80px] text-sm"
                />
                {notesChanged && (
                  <Button size="sm" className="mt-2" onClick={handleSaveNotes} disabled={updateLead.isPending}>
                    Save Notes
                  </Button>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {canProvision && (
              <Button onClick={handleProvision}>
                <Rocket className="h-4 w-4 mr-2" />
                Set Up as Client
              </Button>
            )}
            <div className="flex gap-2">
              {lead.phone && (
                <Button asChild className="flex-1" variant={canProvision ? "outline" : "default"}>
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="h-4 w-4 mr-2" />Call
                  </a>
                </Button>
              )}
              {lead.email && (
                <Button variant="outline" asChild className="flex-1">
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4 mr-2" />Email
                  </a>
                </Button>
              )}
              {lead.website && (
                <Button variant="outline" asChild className="flex-1">
                  <a href={lead.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />Website
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
