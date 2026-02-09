/**
 * Daily Specials Editor
 * 
 * Manage time-limited menu specials:
 * - Day-of-week specials (Taco Tuesday, etc.)
 * - Happy hour deals
 * - Seasonal/limited time offers
 * - Combo deals
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Loader2,
  Info,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Star,
  Calendar,
  Clock,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface MenuSpecial {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  items: Array<{ menu_item_id?: string; name: string; price_cents: number }>;
  schedule_type: "daily" | "weekly" | "date_range" | "always";
  active_days: number[] | null;
  start_time: string | null;
  end_time: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const SCHEDULE_TYPES = [
  { value: "always", label: "Always Available", description: "Show this special all the time" },
  { value: "weekly", label: "Weekly Recurring", description: "Same days every week" },
  { value: "daily", label: "Time-Based", description: "Specific hours (like happy hour)" },
  { value: "date_range", label: "Limited Time", description: "Between specific dates" },
];

interface SpecialFormData {
  name: string;
  description: string;
  items: Array<{ name: string; price_cents: number }>;
  schedule_type: MenuSpecial["schedule_type"];
  active_days: number[];
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
}

const defaultFormData: SpecialFormData = {
  name: "",
  description: "",
  items: [{ name: "", price_cents: 0 }],
  schedule_type: "always",
  active_days: [],
  start_time: "16:00",
  end_time: "18:00",
  start_date: "",
  end_date: "",
};

export function DailySpecialsEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<SpecialFormData>(defaultFormData);
  const [editingFormData, setEditingFormData] = useState<Record<string, SpecialFormData>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSpecial, setDeletingSpecial] = useState<MenuSpecial | null>(null);

  // Fetch specials
  const { data: specials, isLoading } = useQuery({
    queryKey: ["menu-specials", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("menu_specials")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MenuSpecial[];
    },
    enabled: !!tenant?.id,
  });

  const handleCreate = async () => {
    if (!tenant?.id || !formData.name.trim()) return;
    
    setSavingId("new");
    try {
      const { error } = await supabase
        .from("menu_specials")
        .insert({
          tenant_id: tenant.id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          items: formData.items.filter(i => i.name.trim()),
          schedule_type: formData.schedule_type,
          active_days: formData.schedule_type === "weekly" ? formData.active_days : null,
          start_time: formData.schedule_type === "daily" ? formData.start_time : null,
          end_time: formData.schedule_type === "daily" ? formData.end_time : null,
          start_date: formData.schedule_type === "date_range" ? formData.start_date : null,
          end_date: formData.schedule_type === "date_range" ? formData.end_date : null,
          is_active: true,
        });

      if (error) throw error;
      
      toast.success("Special created");
      queryClient.invalidateQueries({ queryKey: ["menu-specials"] });
      setIsCreating(false);
      setFormData(defaultFormData);
    } catch (error: any) {
      toast.error(error.message || "Failed to create");
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdate = async (specialId: string) => {
    if (!tenant?.id) return;
    const data = editingFormData[specialId];
    if (!data?.name.trim()) return;
    
    setSavingId(specialId);
    try {
      const { error } = await supabase
        .from("menu_specials")
        .update({
          name: data.name.trim(),
          description: data.description.trim() || null,
          items: data.items.filter(i => i.name.trim()),
          schedule_type: data.schedule_type,
          active_days: data.schedule_type === "weekly" ? data.active_days : null,
          start_time: data.schedule_type === "daily" ? data.start_time : null,
          end_time: data.schedule_type === "daily" ? data.end_time : null,
          start_date: data.schedule_type === "date_range" ? data.start_date : null,
          end_date: data.schedule_type === "date_range" ? data.end_date : null,
        })
        .eq("id", specialId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      
      toast.success("Special updated");
      queryClient.invalidateQueries({ queryKey: ["menu-specials"] });
      setExpandedId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!tenant?.id || !deletingSpecial) return;
    
    try {
      const { error } = await supabase
        .from("menu_specials")
        .delete()
        .eq("id", deletingSpecial.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      
      toast.success("Special removed");
      queryClient.invalidateQueries({ queryKey: ["menu-specials"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingSpecial(null);
    }
  };

  const handleToggleActive = async (special: MenuSpecial) => {
    if (!tenant?.id) return;
    
    try {
      const { error } = await supabase
        .from("menu_specials")
        .update({ is_active: !special.is_active })
        .eq("id", special.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      
      toast.success(special.is_active ? "Special hidden" : "Special active");
      queryClient.invalidateQueries({ queryKey: ["menu-specials"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    }
  };

  const toggleExpanded = (id: string, special: MenuSpecial) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!editingFormData[id]) {
        setEditingFormData(prev => ({
          ...prev,
          [id]: {
            name: special.name,
            description: special.description || "",
            items: (special.items as any) || [{ name: "", price_cents: 0 }],
            schedule_type: special.schedule_type,
            active_days: special.active_days || [],
            start_time: special.start_time || "16:00",
            end_time: special.end_time || "18:00",
            start_date: special.start_date || "",
            end_date: special.end_date || "",
          },
        }));
      }
    }
    setIsCreating(false);
  };

  const getScheduleLabel = (special: MenuSpecial) => {
    switch (special.schedule_type) {
      case "always":
        return "Always";
      case "weekly":
        return special.active_days?.map(d => DAYS_OF_WEEK[d]?.label).join(", ") || "Weekly";
      case "daily":
        return `${special.start_time} - ${special.end_time}`;
      case "date_range":
        return `${special.start_date} to ${special.end_date}`;
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading specials...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // AI Preview
  const activeSpecials = specials?.filter(s => s.is_active) || [];
  const aiPreview = activeSpecials.length > 0
    ? `Today we have our ${activeSpecials[0].name}! ${activeSpecials[0].description || ""}`
    : "I can tell you about any specials we're running.";

  // Form component
  const SpecialForm = ({
    data,
    onChange,
    onSave,
    onCancel,
    isSaving,
  }: {
    data: SpecialFormData;
    onChange: (data: SpecialFormData) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
  }) => (
    <div className="p-4 space-y-4 border-t bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Special Name *</Label>
          <Input
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="e.g., Taco Tuesday, Happy Hour"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Schedule Type</Label>
          <Select
            value={data.schedule_type}
            onValueChange={(v) => onChange({ ...data, schedule_type: v as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="What makes this special great?"
          rows={2}
        />
      </div>

      {/* Schedule-specific fields */}
      {data.schedule_type === "weekly" && (
        <div className="space-y-2">
          <Label className="text-xs">Active Days</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map(day => (
              <Button
                key={day.value}
                type="button"
                variant={data.active_days.includes(day.value) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newDays = data.active_days.includes(day.value)
                    ? data.active_days.filter(d => d !== day.value)
                    : [...data.active_days, day.value];
                  onChange({ ...data, active_days: newDays.sort() });
                }}
              >
                {day.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {data.schedule_type === "daily" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Start Time</Label>
            <Input
              type="time"
              value={data.start_time}
              onChange={(e) => onChange({ ...data, start_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">End Time</Label>
            <Input
              type="time"
              value={data.end_time}
              onChange={(e) => onChange({ ...data, end_time: e.target.value })}
            />
          </div>
        </div>
      )}

      {data.schedule_type === "date_range" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Start Date</Label>
            <Input
              type="date"
              value={data.start_date}
              onChange={(e) => onChange({ ...data, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">End Date</Label>
            <Input
              type="date"
              value={data.end_date}
              onChange={(e) => onChange({ ...data, end_date: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Items in special */}
      <div className="space-y-2">
        <Label className="text-xs">Items in This Special</Label>
        {data.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item.name}
              onChange={(e) => {
                const newItems = [...data.items];
                newItems[i] = { ...item, name: e.target.value };
                onChange({ ...data, items: newItems });
              }}
              placeholder="Item name"
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                value={(item.price_cents / 100).toFixed(2)}
                onChange={(e) => {
                  const newItems = [...data.items];
                  newItems[i] = { ...item, price_cents: Math.round(parseFloat(e.target.value) * 100) || 0 };
                  onChange({ ...data, items: newItems });
                }}
                className="w-24"
              />
            </div>
            {data.items.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...data, items: [...data.items, { name: "", price_cents: 0 }] })}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Item
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving || !data.name.trim()}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What is this?</p>
            <p className="text-sm text-muted-foreground">
              Create special offers that run on specific days or times. 
              The AI will mention active specials to customers and explain what's included.
            </p>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      {activeSpecials.length > 0 && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <Star className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">What the AI tells customers</p>
              <p className="text-sm italic">"{aiPreview}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Daily Specials & Deals</h4>
          <p className="text-sm text-muted-foreground">
            {specials?.length || 0} specials • {activeSpecials.length} active
          </p>
        </div>
        <Button onClick={() => { setIsCreating(true); setExpandedId(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Special
        </Button>
      </div>

      {/* Create new form */}
      {isCreating && (
        <Card>
          <div className="px-4 py-3 border-b">
            <h4 className="font-medium text-sm">New Special</h4>
          </div>
          <SpecialForm
            data={formData}
            onChange={setFormData}
            onSave={handleCreate}
            onCancel={() => { setIsCreating(false); setFormData(defaultFormData); }}
            isSaving={savingId === "new"}
          />
        </Card>
      )}

      {/* Existing specials */}
      {specials && specials.length > 0 && (
        <div className="space-y-2">
          {specials.map(special => {
            const isExpanded = expandedId === special.id;
            const data = editingFormData[special.id];

            return (
              <Card key={special.id}>
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(special.id, special)}
                >
                  <div className="px-4 py-3 flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-3 flex-1 text-left">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{special.name}</span>
                            {!special.is_active && (
                              <Badge variant="outline" className="text-xs">Hidden</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getScheduleLabel(special)}
                          </p>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={special.is_active}
                        onCheckedChange={() => handleToggleActive(special)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingSpecial(special);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                    {data && (
                      <SpecialForm
                        data={data}
                        onChange={(newData) => setEditingFormData(prev => ({
                          ...prev,
                          [special.id]: newData,
                        }))}
                        onSave={() => handleUpdate(special.id)}
                        onCancel={() => setExpandedId(null)}
                        isSaving={savingId === special.id}
                      />
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isCreating && (!specials || specials.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h4 className="font-medium mb-1">No specials yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create specials like "Taco Tuesday" or "Happy Hour" to attract customers
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Special
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this special?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deletingSpecial?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
