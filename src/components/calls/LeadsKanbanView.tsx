/**
 * LeadsKanbanView — Pipeline board for lead management.
 *
 * Columns: New → Contacted → Quoted → Won → Lost
 * Each column shows leads filtered by followup_status (or outcome for Won/Lost).
 * Leads can be moved between stages via dropdown on the detail panel.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeadKanbanCard } from "./LeadKanbanCard";
import type { PriorityConfig } from "@/config/industryBrainConfig";
import { computeCallPriority } from "@/lib/priorityScoring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CallSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  caller_phone: string | null;
  call_direction: "inbound" | "outbound";
  outcome: string | null;
  summary: string | null;
  context_json: Record<string, unknown> | null;
  extracted_payload: Record<string, unknown> | null;
  customer_id: string | null;
  followup_status?: string | null;
  customer?: {
    id: string;
    full_name: string;
    phone_e164: string;
  } | null;
}

export type PipelineStage = "new" | "contacted" | "quoted" | "won" | "lost";

interface StageConfig {
  id: PipelineStage;
  label: string;
  color: string;
  dotColor: string;
  bgColor: string;
}

const STAGES: StageConfig[] = [
  { id: "new", label: "New", color: "text-blue-400", dotColor: "bg-blue-400", bgColor: "bg-blue-500/5" },
  { id: "contacted", label: "Contacted", color: "text-amber-400", dotColor: "bg-amber-400", bgColor: "bg-amber-500/5" },
  { id: "quoted", label: "Quoted", color: "text-purple-400", dotColor: "bg-purple-400", bgColor: "bg-purple-500/5" },
  { id: "won", label: "Won", color: "text-emerald-400", dotColor: "bg-emerald-400", bgColor: "bg-emerald-500/5" },
  { id: "lost", label: "Lost", color: "text-red-400", dotColor: "bg-red-400", bgColor: "bg-red-500/5" },
];

function getLeadStage(call: CallSession): PipelineStage {
  // Terminal outcomes override followup_status
  if (call.outcome === "booked") return "won";
  if (call.outcome === "lost") return "lost";

  // Use followup_status for pipeline stage
  const status = call.followup_status;
  if (status === "contacted") return "contacted";
  if (status === "quoted") return "quoted";
  if (status === "won") return "won";
  if (status === "lost") return "lost";

  // Default: new lead
  return "new";
}

interface LeadsKanbanViewProps {
  leads: CallSession[];
  getCustomerName: (call: CallSession) => string;
  onSelectCall: (call: CallSession) => void;
  priorityConfig: PriorityConfig;
  tenantId: string;
}

export function LeadsKanbanView({
  leads,
  getCustomerName,
  onSelectCall,
  priorityConfig,
  tenantId,
}: LeadsKanbanViewProps) {
  const queryClient = useQueryClient();

  const stageLeads = useMemo(() => {
    const grouped: Record<PipelineStage, CallSession[]> = {
      new: [],
      contacted: [],
      quoted: [],
      won: [],
      lost: [],
    };

    for (const lead of leads) {
      const stage = getLeadStage(lead);
      grouped[stage].push(lead);
    }

    // Sort each stage by priority desc, then recency desc
    for (const stage of Object.keys(grouped) as PipelineStage[]) {
      grouped[stage].sort((a, b) => {
        const callbackA = !!(a.extracted_payload as Record<string, unknown> | null)?.callback;
        const callbackB = !!(b.extracted_payload as Record<string, unknown> | null)?.callback;
        const pA = computeCallPriority({ outcome: a.outcome, started_at: a.started_at, callbackRequested: callbackA }, priorityConfig);
        const pB = computeCallPriority({ outcome: b.outcome, started_at: b.started_at, callbackRequested: callbackB }, priorityConfig);
        if (pB.score !== pA.score) return pB.score - pA.score;
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      });
    }

    return grouped;
  }, [leads, priorityConfig]);

  const handleStageChange = async (callId: string, newStage: PipelineStage) => {
    // Map stage to followup_status and optionally outcome
    let followup_status: string | null = newStage;
    let outcome: string | undefined;

    if (newStage === "won") {
      outcome = "booked";
      followup_status = "won";
    } else if (newStage === "lost") {
      outcome = "lost";
      followup_status = "lost";
    } else if (newStage === "new") {
      followup_status = null;
    }

    const updateData: Record<string, unknown> = { followup_status };
    if (outcome) updateData.outcome = outcome;

    const { error } = await supabase
      .from("ai_call_sessions")
      .update(updateData)
      .eq("id", callId);

    if (error) {
      toast.error("Failed to update lead stage");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["inbox_calls", tenantId] });
    toast.success(`Lead moved to ${STAGES.find(s => s.id === newStage)?.label}`);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
      {STAGES.map((stage) => {
        const items = stageLeads[stage.id];
        return (
          <div
            key={stage.id}
            className={cn(
              "flex-shrink-0 w-[260px] rounded-xl border border-border/30 flex flex-col max-h-[calc(100vh-16rem)]",
              stage.bgColor,
            )}
          >
            {/* Column header */}
            <div className="px-3 py-2.5 border-b border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", stage.dotColor)} />
                <span className={cn("text-sm font-semibold", stage.color)}>
                  {stage.label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                {items.length}
              </span>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 text-center py-6">
                    No leads
                  </p>
                ) : (
                  items.map((call) => (
                    <div key={call.id} className="space-y-1">
                      <LeadKanbanCard
                        call={call}
                        customerName={getCustomerName(call)}
                        onClick={() => onSelectCall(call)}
                        priorityConfig={priorityConfig}
                      />
                      {/* Stage change dropdown */}
                      <Select
                        value={getLeadStage(call)}
                        onValueChange={(val) => handleStageChange(call.id, val as PipelineStage)}
                      >
                        <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent hover:bg-muted/40 px-2 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              <span className="flex items-center gap-2">
                                <span className={cn("w-1.5 h-1.5 rounded-full", s.dotColor)} />
                                Move to {s.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
