/**
 * TeamSetupStep — Onboarding step for capturing team/staff information.
 *
 * Solo operators can skip. Others add team members with name, role, and
 * optionally which services they can perform. This data seeds the
 * staff_members table (Phase 3) and informs multi-resource availability.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, User, Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditableService } from "./ServicePreviewStep";

export interface TeamMember {
  name: string;
  role: "owner" | "manager" | "staff";
  phone: string;
  email: string;
  canPerformAllServices: boolean;
  serviceNames: string[]; // service names they can perform (if not all)
}

interface TeamSetupStepProps {
  isSolo: boolean;
  onSoloChange: (solo: boolean) => void;
  members: TeamMember[];
  onChange: (members: TeamMember[]) => void;
  services: EditableService[];
}

const roleLabels: Record<TeamMember["role"], string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

export function TeamSetupStep({
  isSolo,
  onSoloChange,
  members,
  onChange,
  services,
}: TeamSetupStepProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const enabledServices = services.filter((s) => s.enabled && s.name.trim());

  const addMember = () => {
    onChange([
      ...members,
      {
        name: "",
        role: "staff",
        phone: "",
        email: "",
        canPerformAllServices: true,
        serviceNames: [],
      },
    ]);
    setExpandedIdx(members.length);
  };

  const removeMember = (idx: number) => {
    onChange(members.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const updateMember = (idx: number, updates: Partial<TeamMember>) => {
    const updated = [...members];
    updated[idx] = { ...updated[idx], ...updates };
    onChange(updated);
  };

  const toggleServiceForMember = (idx: number, serviceName: string) => {
    const member = members[idx];
    const current = member.serviceNames;
    const updated = current.includes(serviceName)
      ? current.filter((s) => s !== serviceName)
      : [...current, serviceName];
    updateMember(idx, { serviceNames: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Who's on your team?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Tell us about your team so we can set up scheduling for each person.
          You can always add or edit team members later.
        </p>
      </div>

      {/* Solo toggle */}
      <Card className={cn(isSolo && "border-primary bg-primary/5")}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">I'm the only one</p>
                <p className="text-xs text-muted-foreground">
                  Solo operator — no team members to add
                </p>
              </div>
            </div>
            <Switch checked={isSolo} onCheckedChange={onSoloChange} />
          </div>
        </CardContent>
      </Card>

      {/* Team members list */}
      {!isSolo && (
        <>
          {members.length > 0 && (
            <div className="space-y-3">
              {members.map((member, idx) => (
                <Card key={idx} className="transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {expandedIdx === idx ? (
                          <div className="space-y-3">
                            <Input
                              value={member.name}
                              onChange={(e) =>
                                updateMember(idx, { name: e.target.value })
                              }
                              placeholder="Team member name"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Input
                                value={member.phone}
                                onChange={(e) =>
                                  updateMember(idx, { phone: e.target.value })
                                }
                                placeholder="Phone (optional)"
                                className="flex-1"
                              />
                              <Input
                                value={member.email}
                                onChange={(e) =>
                                  updateMember(idx, { email: e.target.value })
                                }
                                placeholder="Email (optional)"
                                className="flex-1"
                              />
                            </div>
                            {/* Role selection */}
                            <div className="flex gap-2">
                              {(
                                ["owner", "manager", "staff"] as const
                              ).map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => updateMember(idx, { role: r })}
                                  className={cn(
                                    "px-3 py-1 rounded-md text-xs font-medium border transition-colors",
                                    member.role === r
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border hover:bg-muted/50"
                                  )}
                                >
                                  {roleLabels[r]}
                                </button>
                              ))}
                            </div>
                            {/* Service assignment */}
                            {enabledServices.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Which services can they perform?
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateMember(idx, {
                                        canPerformAllServices:
                                          !member.canPerformAllServices,
                                      })
                                    }
                                    className={cn(
                                      "text-xs px-2 py-0.5 rounded border transition-colors",
                                      member.canPerformAllServices
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground"
                                    )}
                                  >
                                    All services
                                  </button>
                                </div>
                                {!member.canPerformAllServices && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {enabledServices.map((s) => (
                                      <button
                                        key={s.name}
                                        type="button"
                                        onClick={() =>
                                          toggleServiceForMember(idx, s.name)
                                        }
                                        className={cn(
                                          "text-xs px-2 py-1 rounded-full border transition-colors",
                                          member.serviceNames.includes(s.name)
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground hover:bg-muted/50"
                                        )}
                                      >
                                        {s.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedIdx(null)}
                              className="text-xs"
                            >
                              Done
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-left w-full"
                            onClick={() => setExpandedIdx(idx)}
                          >
                            <p className="text-sm font-medium">
                              {member.name || "New team member"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px]">
                                {roleLabels[member.role]}
                              </Badge>
                              {member.canPerformAllServices ? (
                                <span className="text-xs text-muted-foreground">
                                  All services
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {member.serviceNames.length} service
                                  {member.serviceNames.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </button>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={addMember}
            className="w-full gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add team member
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {members.length === 0
              ? "Add your team members so we can schedule them individually"
              : `${members.length} team member${members.length !== 1 ? "s" : ""} added`}
          </p>
        </>
      )}
    </div>
  );
}
