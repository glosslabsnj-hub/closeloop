/**
 * Seasonal Knowledge Editor (All Modes)
 * 
 * Allows businesses to configure event/holiday-specific announcements
 * and adjustments.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Loader2, Clock, DollarSign, Repeat } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface SeasonalKnowledge {
  id: string;
  tenant_id: string;
  event_name: string;
  start_date: string | null;
  end_date: string | null;
  special_hours: string | null;
  special_pricing_notes: string | null;
  special_menu_notes: string | null;
  booking_tips: string | null;
  ai_announcement: string | null;
  is_recurring: boolean;
  created_at: string;
}

const COMMON_EVENTS = ["Valentine's Day", "Mother's Day", "Father's Day", "Thanksgiving", "Christmas", "New Year's", "Super Bowl", "Tax Season", "Back to School", "Summer"];

export function SeasonalKnowledgeEditor() {
  const { tenant } = useAuth();
  const { terminology } = useIndustryContext();
  const apptLabel = terminology.appointmentLabel.charAt(0).toUpperCase() + terminology.appointmentLabel.slice(1);
  const [items, setItems] = useState<SeasonalKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SeasonalKnowledge | null>(null);
  
  // Form state
  const [formEventName, setFormEventName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formHours, setFormHours] = useState("");
  const [formPricing, setFormPricing] = useState("");
  const [formMenu, setFormMenu] = useState("");
  const [formBookingTips, setFormBookingTips] = useState("");
  const [formAnnouncement, setFormAnnouncement] = useState("");
  const [formIsRecurring, setFormIsRecurring] = useState(true);

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("seasonal_knowledge")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("event_name");
    if (!error) setItems((data as SeasonalKnowledge[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormEventName("");
    setFormStartDate("");
    setFormEndDate("");
    setFormHours("");
    setFormPricing("");
    setFormMenu("");
    setFormBookingTips("");
    setFormAnnouncement("");
    setFormIsRecurring(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: SeasonalKnowledge) => {
    setEditingItem(item);
    setFormEventName(item.event_name);
    setFormStartDate(item.start_date || "");
    setFormEndDate(item.end_date || "");
    setFormHours(item.special_hours || "");
    setFormPricing(item.special_pricing_notes || "");
    setFormMenu(item.special_menu_notes || "");
    setFormBookingTips(item.booking_tips || "");
    setFormAnnouncement(item.ai_announcement || "");
    setFormIsRecurring(item.is_recurring);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formEventName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        event_name: formEventName.trim(),
        start_date: formStartDate.trim() || null,
        end_date: formEndDate.trim() || null,
        special_hours: formHours.trim() || null,
        special_pricing_notes: formPricing.trim() || null,
        special_menu_notes: formMenu.trim() || null,
        booking_tips: formBookingTips.trim() || null,
        ai_announcement: formAnnouncement.trim() || null,
        is_recurring: formIsRecurring,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("seasonal_knowledge")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Seasonal info updated");
      } else {
        const { error } = await supabase
          .from("seasonal_knowledge")
          .insert(payload);
        if (error) throw error;
        toast.success("Seasonal info added");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant?.id) return;
    try {
      const { error } = await supabase
        .from("seasonal_knowledge")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Seasonal info deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const getAIPreview = () => {
    if (!formAnnouncement) {
      if (!formEventName) return "";
      let preview = `For ${formEventName}, `;
      if (formPricing) preview += `${formPricing} `;
      if (formBookingTips) preview += formBookingTips;
      return preview || `We have special offerings for ${formEventName}.`;
    }
    return formAnnouncement;
  };

  return (
    <>
      <KnowledgeSection
        title="Seasonal & Event Knowledge"
        description="Special information for holidays, events, and seasonal periods."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Event"
        emptyState={{
          icon: Calendar,
          title: "No seasonal info yet",
          description: "Add holidays and events that affect your business.",
        }}
        headerActions={
          <div className="flex flex-wrap gap-2">
            {COMMON_EVENTS.filter(e => !items.some(i => i.event_name === e)).slice(0, 4).map(event => (
              <Badge
                key={event}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => {
                  resetForm();
                  setFormEventName(event);
                  setIsDialogOpen(true);
                }}
              >
                + {event}
              </Badge>
            ))}
          </div>
        }
        renderItem={(item) => (
          <KnowledgeItem
            onEdit={() => openEditDialog(item)}
            onDelete={() => handleDelete(item.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{item.event_name}</span>
              {item.is_recurring && (
                <Badge variant="secondary" className="text-xs">
                  <Repeat className="h-3 w-3 mr-1" />
                  Annual
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
              {item.special_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Special hours
                </span>
              )}
              {item.special_pricing_notes && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Special pricing
                </span>
              )}
              {(item.start_date || item.end_date) && (
                <span>{item.start_date} - {item.end_date}</span>
              )}
            </div>
          </KnowledgeItem>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Event" : "Add Seasonal/Event Info"}</DialogTitle>
            <DialogDescription>
              Configure special announcements and adjustments for this period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Event/Season Name *</Label>
                <Input
                  placeholder="e.g., Valentine's Day, Summer Season"
                  value={formEventName}
                  onChange={(e) => setFormEventName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formIsRecurring} onCheckedChange={setFormIsRecurring} />
                <Label className="text-sm">Recurring annually</Label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date (MM-DD or description)</Label>
                <Input
                  placeholder="e.g., 02-01, Early February"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (MM-DD or description)</Label>
                <Input
                  placeholder="e.g., 02-14, Late February"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special Hours</Label>
              <Input
                placeholder="e.g., Extended hours until 10 PM, Closed Dec 25"
                value={formHours}
                onChange={(e) => setFormHours(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Special Pricing Notes</Label>
              <Input
                placeholder="e.g., 20% off all services, Holiday surcharge applies"
                value={formPricing}
                onChange={(e) => setFormPricing(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Special Menu/Services Notes</Label>
              <Textarea
                placeholder="e.g., Special Valentine's menu available, Limited services during holiday period"
                value={formMenu}
                onChange={(e) => setFormMenu(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{apptLabel} Tips</Label>
              <Input
                placeholder="e.g., Book 2 weeks ahead for best availability"
                value={formBookingTips}
                onChange={(e) => setFormBookingTips(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>AI Announcement (what to proactively mention)</Label>
              <Textarea
                placeholder="e.g., Just so you know, we're offering a special Valentine's package this week that includes..."
                value={formAnnouncement}
                onChange={(e) => setFormAnnouncement(e.target.value)}
                rows={3}
              />
            </div>

            {formEventName && (
              <AIPreviewCard 
                title="AI Preview" 
                preview={getAIPreview()} 
                className="mt-4"
                compact 
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formEventName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
