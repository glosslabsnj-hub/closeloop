/**
 * Catering Knowledge Editor (Food Mode)
 * 
 * Allows restaurants to add event-specific catering information
 * like minimums, lead times, and setup requirements.
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
import { PartyPopper, Loader2, Users, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeSection } from "@/components/brain/shared/KnowledgeSection";
import { KnowledgeItem } from "@/components/brain/shared/KnowledgeItem";
import { AIPreviewCard } from "@/components/brain/AIPreviewCard";

interface CateringKnowledge {
  id: string;
  tenant_id: string;
  event_type: string;
  min_guests: number | null;
  max_guests: number | null;
  lead_time_days: number | null;
  menu_restrictions: string | null;
  setup_requirements: string | null;
  staffing_included: boolean;
  rental_equipment: string[] | null;
  venue_requirements: string | null;
  deposit_percentage: number | null;
  cancellation_policy: string | null;
  ai_script: string | null;
  created_at: string;
}

const COMMON_EVENT_TYPES = ["Wedding", "Corporate", "Birthday", "Graduation", "Holiday Party", "Bridal Shower", "Baby Shower", "Memorial"];

export function CateringKnowledgeEditor() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<CateringKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CateringKnowledge | null>(null);
  
  // Form state
  const [formEventType, setFormEventType] = useState("");
  const [formMinGuests, setFormMinGuests] = useState<number | null>(null);
  const [formMaxGuests, setFormMaxGuests] = useState<number | null>(null);
  const [formLeadTime, setFormLeadTime] = useState<number | null>(null);
  const [formMenuRestrictions, setFormMenuRestrictions] = useState("");
  const [formSetupReq, setFormSetupReq] = useState("");
  const [formStaffingIncluded, setFormStaffingIncluded] = useState(false);
  const [formEquipment, setFormEquipment] = useState("");
  const [formVenueReq, setFormVenueReq] = useState("");
  const [formDeposit, setFormDeposit] = useState<number | null>(null);
  const [formCancellation, setFormCancellation] = useState("");
  const [formAIScript, setFormAIScript] = useState("");

  useEffect(() => {
    if (tenant?.id) fetchItems();
  }, [tenant?.id]);

  const fetchItems = async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from("catering_knowledge")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("event_type");
    if (!error) setItems((data as CateringKnowledge[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormEventType("");
    setFormMinGuests(null);
    setFormMaxGuests(null);
    setFormLeadTime(null);
    setFormMenuRestrictions("");
    setFormSetupReq("");
    setFormStaffingIncluded(false);
    setFormEquipment("");
    setFormVenueReq("");
    setFormDeposit(null);
    setFormCancellation("");
    setFormAIScript("");
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: CateringKnowledge) => {
    setEditingItem(item);
    setFormEventType(item.event_type);
    setFormMinGuests(item.min_guests);
    setFormMaxGuests(item.max_guests);
    setFormLeadTime(item.lead_time_days);
    setFormMenuRestrictions(item.menu_restrictions || "");
    setFormSetupReq(item.setup_requirements || "");
    setFormStaffingIncluded(item.staffing_included);
    setFormEquipment(item.rental_equipment?.join(", ") || "");
    setFormVenueReq(item.venue_requirements || "");
    setFormDeposit(item.deposit_percentage);
    setFormCancellation(item.cancellation_policy || "");
    setFormAIScript(item.ai_script || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formEventType.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        event_type: formEventType.trim(),
        min_guests: formMinGuests,
        max_guests: formMaxGuests,
        lead_time_days: formLeadTime,
        menu_restrictions: formMenuRestrictions.trim() || null,
        setup_requirements: formSetupReq.trim() || null,
        staffing_included: formStaffingIncluded,
        rental_equipment: formEquipment.split(",").map(s => s.trim()).filter(Boolean),
        venue_requirements: formVenueReq.trim() || null,
        deposit_percentage: formDeposit,
        cancellation_policy: formCancellation.trim() || null,
        ai_script: formAIScript.trim() || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("catering_knowledge")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Catering info updated");
      } else {
        const { error } = await supabase
          .from("catering_knowledge")
          .insert(payload);
        if (error) throw error;
        toast.success("Catering info added");
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
        .from("catering_knowledge")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.success("Catering info deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const getAIPreview = () => {
    if (!formEventType) return "";
    let preview = `For ${formEventType.toLowerCase()} events, `;
    if (formMinGuests && formMaxGuests) {
      preview += `we accommodate ${formMinGuests} to ${formMaxGuests} guests. `;
    } else if (formMinGuests) {
      preview += `we require a minimum of ${formMinGuests} guests. `;
    }
    if (formLeadTime) {
      preview += `We recommend booking at least ${formLeadTime} days in advance. `;
    }
    if (formDeposit) {
      preview += `A ${formDeposit}% deposit is required to secure your date.`;
    }
    return preview;
  };

  return (
    <>
      <KnowledgeSection
        title="Catering by Event Type"
        description="Configure catering requirements for different event types so your AI can provide accurate quotes."
        items={items}
        isLoading={loading}
        onAdd={openAddDialog}
        addButtonLabel="Add Event Type"
        emptyState={{
          icon: PartyPopper,
          title: "No catering info yet",
          description: "Add catering details for weddings, corporate events, parties, and more.",
        }}
        headerActions={
          <div className="flex flex-wrap gap-2">
            {COMMON_EVENT_TYPES.filter(t => !items.some(i => i.event_type === t)).slice(0, 4).map(type => (
              <Badge
                key={type}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => {
                  resetForm();
                  setFormEventType(type);
                  setIsDialogOpen(true);
                }}
              >
                + {type}
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
              <PartyPopper className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{item.event_type}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {(item.min_guests || item.max_guests) && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {item.min_guests && item.max_guests 
                    ? `${item.min_guests}-${item.max_guests} guests`
                    : item.min_guests 
                      ? `Min ${item.min_guests}` 
                      : `Up to ${item.max_guests}`}
                </span>
              )}
              {item.lead_time_days && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.lead_time_days}+ days notice
                </span>
              )}
              {item.deposit_percentage && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {item.deposit_percentage}% deposit
                </span>
              )}
            </div>
          </KnowledgeItem>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Event Type" : "Add Catering Event Type"}</DialogTitle>
            <DialogDescription>
              Configure catering details for this type of event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Event Type *</Label>
              <Input
                placeholder="e.g., Wedding, Corporate Lunch"
                value={formEventType}
                onChange={(e) => setFormEventType(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Minimum Guests</Label>
                <Input
                  type="number"
                  placeholder="e.g., 20"
                  value={formMinGuests || ""}
                  onChange={(e) => setFormMinGuests(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Guests</Label>
                <Input
                  type="number"
                  placeholder="e.g., 200"
                  value={formMaxGuests || ""}
                  onChange={(e) => setFormMaxGuests(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 14"
                  value={formLeadTime || ""}
                  onChange={(e) => setFormLeadTime(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Deposit Required (%)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 25"
                  value={formDeposit || ""}
                  onChange={(e) => setFormDeposit(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formStaffingIncluded} onCheckedChange={setFormStaffingIncluded} />
                <Label>Staffing included in package</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Menu Restrictions</Label>
              <Textarea
                placeholder="e.g., Buffet only for 50+ guests, limited menu for rush orders..."
                value={formMenuRestrictions}
                onChange={(e) => setFormMenuRestrictions(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Setup Requirements</Label>
              <Textarea
                placeholder="e.g., Need access 2 hours before, kitchen facility required..."
                value={formSetupReq}
                onChange={(e) => setFormSetupReq(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Equipment We Provide (comma-separated)</Label>
              <Input
                placeholder="e.g., Chafing dishes, serving utensils, linens"
                value={formEquipment}
                onChange={(e) => setFormEquipment(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Venue Requirements</Label>
              <Input
                placeholder="e.g., Covered area if outdoors, electrical access"
                value={formVenueReq}
                onChange={(e) => setFormVenueReq(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Cancellation Policy</Label>
              <Textarea
                placeholder="e.g., Full refund if cancelled 30+ days out, 50% within 14 days..."
                value={formCancellation}
                onChange={(e) => setFormCancellation(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>AI Script (optional - exactly what to say)</Label>
              <Textarea
                placeholder="For [event type] events, we offer comprehensive catering packages..."
                value={formAIScript}
                onChange={(e) => setFormAIScript(e.target.value)}
                rows={3}
              />
            </div>

            {formEventType && (
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
            <Button onClick={handleSave} disabled={saving || !formEventType.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Event Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
