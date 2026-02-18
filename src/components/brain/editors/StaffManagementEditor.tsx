import { useState } from "react";
import { useStaffMembers, type StaffMember } from "@/hooks/useStaffMembers";
import { useServices } from "@/hooks/useServices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
] as const;

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

export default function StaffManagementEditor() {
  const { staff, activeStaff, isLoading, createStaffMember, updateStaffMember, deleteStaffMember } = useStaffMembers();
  const { services } = useServices();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"owner" | "manager" | "staff">("staff");

  const handleAdd = () => {
    if (!newName.trim()) return;
    createStaffMember.mutate(
      {
        full_name: newName.trim(),
        role: newRole,
        is_active: true,
        email: null,
        phone: null,
        hours_json: null,
        service_ids: null,
        calendar_connection_id: null,
        color: COLORS[staff.length % COLORS.length],
        sort_order: staff.length,
      },
      {
        onSuccess: () => {
          setNewName("");
          setNewRole("staff");
          setShowAddForm(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {activeStaff.length === 0
              ? "No team members — operating as solo"
              : `${activeStaff.length} active team member${activeStaff.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Add Member
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="new-name">Name</Label>
                <Input
                  id="new-name"
                  placeholder="e.g. Sarah Johnson"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoFocus
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || createStaffMember.isPending}>
                {createStaffMember.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewName(""); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {staff.length === 0 && !showAddForm && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No team members added yet.</p>
            <p className="mt-1">Add team members to enable multi-staff scheduling.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {staff.map((member) => (
          <StaffCard
            key={member.id}
            member={member}
            expanded={expandedId === member.id}
            onToggle={() => setExpandedId(expandedId === member.id ? null : member.id)}
            services={services ?? []}
            onUpdate={(updates) => updateStaffMember.mutate({ id: member.id, ...updates })}
            onDelete={() => deleteStaffMember.mutate(member.id)}
          />
        ))}
      </div>
    </div>
  );
}

function StaffCard({
  member,
  expanded,
  onToggle,
  services,
  onUpdate,
  onDelete,
}: {
  member: StaffMember;
  expanded: boolean;
  onToggle: () => void;
  services: { id: string; name: string }[];
  onUpdate: (updates: Partial<StaffMember>) => void;
  onDelete: () => void;
}) {
  const allServices = !member.service_ids || member.service_ids.length === 0;

  return (
    <Card className={cn(!member.is_active && "opacity-60")}>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-3 text-left"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: member.color || "#6366f1" }}
            />
            <div>
              <p className="text-sm font-medium">{member.full_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-xs capitalize">
                  {member.role}
                </Badge>
                {!member.is_active && (
                  <Badge variant="outline" className="text-xs">Inactive</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {allServices ? "All services" : `${member.service_ids!.length} service${member.service_ids!.length !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="px-3 pb-3 space-y-3 border-t pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  value={member.email || ""}
                  onChange={(e) => onUpdate({ email: e.target.value || null })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={member.phone || ""}
                  onChange={(e) => onUpdate({ phone: e.target.value || null })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={member.is_active}
                onCheckedChange={(checked) => onUpdate({ is_active: checked })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Services</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => onUpdate({ service_ids: allServices ? services.map((s) => s.id) : null })}
                >
                  {allServices ? "Pick specific" : "Reset to all"}
                </button>
              </div>
              {!allServices && (
                <div className="flex flex-wrap gap-1.5">
                  {services.map((svc) => {
                    const selected = member.service_ids?.includes(svc.id) ?? false;
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => {
                          const current = member.service_ids ?? [];
                          const updated = selected
                            ? current.filter((id) => id !== svc.id)
                            : [...current, svc.id];
                          onUpdate({ service_ids: updated.length > 0 ? updated : null });
                        }}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full border transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {svc.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
