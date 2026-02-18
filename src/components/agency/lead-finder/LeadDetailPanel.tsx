import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Globe, Star, MapPin, ExternalLink, Copy, Building2, Bookmark, Check, Rocket } from "lucide-react";
import { toast } from "sonner";
import { getTemperatureColor, getTemperatureIcon, type ScoredLead } from "./leadScoring";
import { SIGNAL_LABELS, STATUS_LABELS } from "./leadConstants";
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
}

interface LeadDetailPanelProps {
  lead: AgencyLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Save functionality
  isSaved?: boolean;
  onSave?: () => void;
  savingInProgress?: boolean;
  // Saved lead tracking
  savedLeadId?: string | null;
  agencyId?: string;
  savedStatus?: string;
  savedNotes?: string;
  // Provision callback
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

  // Reset state when lead/savedLeadId changes
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
  // Allow provisioning from any context — search results or saved leads
  const canProvision = !!onProvisionLead;

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
              {lead.industry && (
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{lead.industry}</p>
              )}
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
          </div>

          {/* Why They Need CloseLoop */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Why They Need CloseLoop</h4>
            <p className="text-sm leading-relaxed">{lead.reason}</p>
          </div>

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
                    <span className="text-sm truncate">{lead.address}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(lead.address!, "Address")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

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
              {lead.website && (
                <Button variant="outline" asChild className="flex-1">
                  <a href={lead.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />Visit Website
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
