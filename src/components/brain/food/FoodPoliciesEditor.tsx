/**
 * Food Policies Editor
 * For restaurants, cafes, catering, food trucks
 * Handles orders, refunds, delivery, allergies, reservations, and catering policies
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, ShoppingCart, Undo2, Truck, AlertTriangle, Users, UtensilsCrossed, Wine } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AIPreviewCard } from "../AIPreviewCard";

interface FoodPolicies {
  id?: string;
  tenant_id: string;
  // Order modifications
  order_modification_cutoff_minutes: number;
  order_cancellation_allowed: boolean;
  order_cancellation_cutoff_minutes: number;
  order_cancellation_fee_cents: number;
  // Refunds
  wrong_order_refund_policy: string;
  missing_item_policy: string;
  quality_issue_policy: string;
  // Delivery
  delivery_driver_tip_policy: string;
  contactless_delivery_default: boolean;
  delivery_instructions_required: boolean;
  delivery_photo_proof: boolean;
  // Allergies
  allergy_disclaimer: string;
  cross_contamination_warning: string;
  dietary_accommodation_policy: string;
  nutrition_info_available: boolean;
  // Reservations
  reservation_hold_minutes: number;
  reservation_no_show_fee_cents: number;
  reservation_cancellation_hours: number;
  large_party_minimum: number;
  large_party_deposit_cents: number;
  large_party_deposit_policy: string;
  // Catering
  catering_minimum_guests: number;
  catering_deposit_percentage: number;
  catering_cancellation_days: number;
  catering_cancellation_fee_policy: string;
  catering_final_count_hours: number;
  // Venue
  outside_food_allowed: boolean;
  corkage_fee_cents: number;
  cake_cutting_fee_cents: number;
  private_event_minimum_cents: number;
}

const DEFAULT_POLICIES: Omit<FoodPolicies, 'tenant_id'> = {
  order_modification_cutoff_minutes: 5,
  order_cancellation_allowed: true,
  order_cancellation_cutoff_minutes: 10,
  order_cancellation_fee_cents: 0,
  wrong_order_refund_policy: 'full_refund',
  missing_item_policy: 'refund_or_credit',
  quality_issue_policy: '',
  delivery_driver_tip_policy: '',
  contactless_delivery_default: true,
  delivery_instructions_required: false,
  delivery_photo_proof: false,
  allergy_disclaimer: '',
  cross_contamination_warning: '',
  dietary_accommodation_policy: '',
  nutrition_info_available: false,
  reservation_hold_minutes: 15,
  reservation_no_show_fee_cents: 0,
  reservation_cancellation_hours: 4,
  large_party_minimum: 6,
  large_party_deposit_cents: 0,
  large_party_deposit_policy: '',
  catering_minimum_guests: 10,
  catering_deposit_percentage: 50,
  catering_cancellation_days: 7,
  catering_cancellation_fee_policy: '',
  catering_final_count_hours: 48,
  outside_food_allowed: false,
  corkage_fee_cents: 0,
  cake_cutting_fee_cents: 0,
  private_event_minimum_cents: 0,
};

export function FoodPoliciesEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FoodPolicies | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      loadPolicies();
    }
  }, [tenant?.id]);

  const loadPolicies = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('food_policies')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setFormData(data || { ...DEFAULT_POLICIES, tenant_id: tenant.id });
    } catch (err: any) {
      toast.error("Failed to load policies");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id || !formData) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('food_policies')
        .upsert({
          ...formData,
          tenant_id: tenant.id,
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
      toast.success("Policies saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof FoodPolicies>(field: K, value: FoodPolicies[K]) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const _formatCents = (cents: number) => cents > 0 ? `$${(cents / 100).toFixed(0)}` : 'No fee';

  // Build AI preview
  const buildAIPreview = (): string => {
    if (!formData) return "";
    const parts: string[] = [];
    
    if (formData.order_cancellation_allowed) {
      parts.push(`You can cancel within ${formData.order_cancellation_cutoff_minutes} minutes.`);
    }
    if (formData.reservation_hold_minutes > 0) {
      parts.push(`We hold reservations for ${formData.reservation_hold_minutes} minutes.`);
    }
    if (formData.allergy_disclaimer) {
      parts.push("Please inform us of any allergies.");
    }
    
    return parts.length > 0 ? parts.join(' ') : "No specific food policies configured yet.";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="space-y-6">
      {/* AI Preview */}
      <AIPreviewCard 
        title="How AI explains your food policies"
        preview={buildAIPreview()}
      />

      {/* Order Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Order Modifications
          </CardTitle>
          <CardDescription>
            How customers can change or cancel orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modification Cutoff</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.order_modification_cutoff_minutes}
                  onChange={(e) => updateField('order_modification_cutoff_minutes', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">min</span>
              </div>
              <p className="text-xs text-muted-foreground">After order, can modify within</p>
            </div>

            <div className="space-y-2">
              <Label>Cancellation Cutoff</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.order_cancellation_cutoff_minutes}
                  onChange={(e) => updateField('order_cancellation_cutoff_minutes', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">min</span>
              </div>
              <p className="text-xs text-muted-foreground">After order, can cancel within</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Order Cancellation</Label>
              <p className="text-xs text-muted-foreground">Customers can cancel orders</p>
            </div>
            <Switch
              checked={formData.order_cancellation_allowed}
              onCheckedChange={(v) => updateField('order_cancellation_allowed', v)}
            />
          </div>

          {formData.order_cancellation_allowed && (
            <div className="space-y-2">
              <Label>Cancellation Fee</Label>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.order_cancellation_fee_cents / 100}
                  onChange={(e) => updateField('order_cancellation_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Undo2 className="h-4 w-4" />
            Refunds & Issues
          </CardTitle>
          <CardDescription>
            How to handle order problems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Wrong Order Policy</Label>
              <Select 
                value={formData.wrong_order_refund_policy} 
                onValueChange={(v) => updateField('wrong_order_refund_policy', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_refund">Full Refund</SelectItem>
                  <SelectItem value="remake">Remake Order</SelectItem>
                  <SelectItem value="store_credit">Store Credit</SelectItem>
                  <SelectItem value="case_by_case">Case by Case</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Missing Item Policy</Label>
              <Select 
                value={formData.missing_item_policy} 
                onValueChange={(v) => updateField('missing_item_policy', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund_or_credit">Refund or Credit</SelectItem>
                  <SelectItem value="resend_item">Resend Item</SelectItem>
                  <SelectItem value="credit_only">Credit Only</SelectItem>
                  <SelectItem value="full_order_refund">Refund Full Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quality Issue Policy</Label>
            <Textarea
              value={formData.quality_issue_policy}
              onChange={(e) => updateField('quality_issue_policy', e.target.value)}
              placeholder="If something doesn't taste right, let us know and we'll make it right—whether that's a remake, refund, or credit."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Delivery Settings
          </CardTitle>
          <CardDescription>
            Delivery preferences and instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Contactless Delivery Default</Label>
              <p className="text-xs text-muted-foreground">Leave at door by default</p>
            </div>
            <Switch
              checked={formData.contactless_delivery_default}
              onCheckedChange={(v) => updateField('contactless_delivery_default', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Require Delivery Instructions</Label>
              <p className="text-xs text-muted-foreground">Customer must provide drop-off notes</p>
            </div>
            <Switch
              checked={formData.delivery_instructions_required}
              onCheckedChange={(v) => updateField('delivery_instructions_required', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Photo Proof of Delivery</Label>
              <p className="text-xs text-muted-foreground">Driver takes photo at drop-off</p>
            </div>
            <Switch
              checked={formData.delivery_photo_proof}
              onCheckedChange={(v) => updateField('delivery_photo_proof', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Driver Tip Policy</Label>
            <Textarea
              value={formData.delivery_driver_tip_policy}
              onChange={(e) => updateField('delivery_driver_tip_policy', e.target.value)}
              placeholder="Tips are appreciated but not required. 100% of tips go to your driver."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Allergy & Dietary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Allergies & Dietary
          </CardTitle>
          <CardDescription>
            Food safety and dietary information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Allergy Disclaimer</Label>
            <Textarea
              value={formData.allergy_disclaimer}
              onChange={(e) => updateField('allergy_disclaimer', e.target.value)}
              placeholder="Please inform us of any food allergies. While we take precautions, we cannot guarantee a completely allergen-free environment."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Cross-Contamination Warning</Label>
            <Textarea
              value={formData.cross_contamination_warning}
              onChange={(e) => updateField('cross_contamination_warning', e.target.value)}
              placeholder="Our kitchen handles nuts, dairy, gluten, and shellfish. Cross-contamination is possible."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Dietary Accommodation Policy</Label>
            <Textarea
              value={formData.dietary_accommodation_policy}
              onChange={(e) => updateField('dietary_accommodation_policy', e.target.value)}
              placeholder="We're happy to accommodate dietary restrictions when possible. Let us know your needs when ordering."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Nutrition Info Available</Label>
              <p className="text-xs text-muted-foreground">Calorie and nutrition details on request</p>
            </div>
            <Switch
              checked={formData.nutrition_info_available}
              onCheckedChange={(v) => updateField('nutrition_info_available', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reservation Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Reservations
          </CardTitle>
          <CardDescription>
            Table booking and no-show policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hold Time</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.reservation_hold_minutes}
                  onChange={(e) => updateField('reservation_hold_minutes', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">min</span>
              </div>
              <p className="text-xs text-muted-foreground">How long we hold the table</p>
            </div>

            <div className="space-y-2">
              <Label>Cancellation Notice</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.reservation_cancellation_hours}
                  onChange={(e) => updateField('reservation_cancellation_hours', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">hours</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>No-Show Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.reservation_no_show_fee_cents / 100}
                  onChange={(e) => updateField('reservation_no_show_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Per person or flat</p>
            </div>

            <div className="space-y-2">
              <Label>Large Party Size</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.large_party_minimum}
                  onChange={(e) => updateField('large_party_minimum', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">guests+</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Large Party Deposit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.large_party_deposit_cents / 100}
                  onChange={(e) => updateField('large_party_deposit_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Large Party Policy</Label>
            <Textarea
              value={formData.large_party_deposit_policy}
              onChange={(e) => updateField('large_party_deposit_policy', e.target.value)}
              placeholder="Parties of 6 or more require a credit card to hold the reservation. No-shows may be charged $25 per person."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Catering Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Catering
          </CardTitle>
          <CardDescription>
            Large order and event catering rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Guests</Label>
              <Input
                type="number"
                value={formData.catering_minimum_guests}
                onChange={(e) => updateField('catering_minimum_guests', parseInt(e.target.value || '0'))}
              />
            </div>

            <div className="space-y-2">
              <Label>Deposit Required</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.catering_deposit_percentage}
                  onChange={(e) => updateField('catering_deposit_percentage', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cancellation Notice</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.catering_cancellation_days}
                  onChange={(e) => updateField('catering_cancellation_days', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">days</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Final Headcount Due</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.catering_final_count_hours}
                  onChange={(e) => updateField('catering_final_count_hours', parseInt(e.target.value || '0'))}
                />
                <span className="flex items-center text-sm text-muted-foreground">hours before</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cancellation Fee Policy</Label>
            <Textarea
              value={formData.catering_cancellation_fee_policy}
              onChange={(e) => updateField('catering_cancellation_fee_policy', e.target.value)}
              placeholder="Cancellations less than 7 days out forfeit the deposit. Less than 48 hours is charged in full."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Venue Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wine className="h-4 w-4" />
            Venue & Events
          </CardTitle>
          <CardDescription>
            Private events and special fees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Outside Food Allowed</Label>
              <p className="text-xs text-muted-foreground">Guests can bring external food/desserts</p>
            </div>
            <Switch
              checked={formData.outside_food_allowed}
              onCheckedChange={(v) => updateField('outside_food_allowed', v)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Corkage Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.corkage_fee_cents / 100}
                  onChange={(e) => updateField('corkage_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Per bottle</p>
            </div>

            <div className="space-y-2">
              <Label>Cake Cutting Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.cake_cutting_fee_cents / 100}
                  onChange={(e) => updateField('cake_cutting_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Per person</p>
            </div>

            <div className="space-y-2">
              <Label>Private Event Min</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formData.private_event_minimum_cents / 100}
                  onChange={(e) => updateField('private_event_minimum_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum spend</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Food Policies
        </Button>
      </div>
    </div>
  );
}
