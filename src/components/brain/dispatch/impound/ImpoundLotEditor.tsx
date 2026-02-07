/**
 * ImpoundLotEditor - Configure impound lot details
 * 
 * Allows dispatch businesses to set up their impound lot information:
 * - Lot name, address, phone
 * - Operating hours
 * - Directions for customers
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Phone, Building, Navigation, ExternalLink, Car, Clock } from "lucide-react";

interface HoursEntry {
  open: string | null;
  close: string | null;
}

interface ImpoundLot {
  id?: string;
  tenant_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  directions: string | null;
  hours_json: Record<string, HoursEntry>;
  is_default: boolean;
  is_active: boolean;
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const DEFAULT_HOURS: Record<string, HoursEntry> = {
  monday: { open: "08:00", close: "17:00" },
  tuesday: { open: "08:00", close: "17:00" },
  wednesday: { open: "08:00", close: "17:00" },
  thursday: { open: "08:00", close: "17:00" },
  friday: { open: "08:00", close: "17:00" },
  saturday: { open: "09:00", close: "12:00" },
  sunday: { open: null, close: null },
};

export function ImpoundLotEditor() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lot, setLot] = useState<ImpoundLot | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      loadLot();
    }
  }, [tenant?.id]);

  const loadLot = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("impound_lots")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLot({
          id: data.id,
          tenant_id: data.tenant_id,
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          phone: data.phone,
          directions: data.directions as string | null,
          hours_json: (data.hours_json as unknown as Record<string, HoursEntry>) || DEFAULT_HOURS,
          is_default: data.is_default,
          is_active: data.is_active,
        });
      } else {
        // Initialize with defaults
        setLot({
          tenant_id: tenant.id,
          name: "Main Impound Lot",
          address: "",
          city: "",
          state: "",
          zip: "",
          phone: null,
          directions: null,
          hours_json: DEFAULT_HOURS,
          is_default: true,
          is_active: true,
        });
      }
    } catch (error) {
      console.error("Failed to load impound lot:", error);
      toast.error("Failed to load lot details");
    } finally {
      setLoading(false);
    }
  };

  const saveLot = async () => {
    if (!tenant?.id || !lot) return;
    setSaving(true);
    try {
      if (lot.id) {
        const updateData = {
          name: lot.name,
          address: lot.address,
          city: lot.city,
          state: lot.state,
          zip: lot.zip,
          phone: lot.phone,
          directions: lot.directions,
          hours_json: JSON.parse(JSON.stringify(lot.hours_json)),
          is_active: lot.is_active,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("impound_lots")
          .update(updateData)
          .eq("id", lot.id);
        if (error) throw error;
      } else {
        const insertData = {
          tenant_id: tenant.id,
          name: lot.name,
          address: lot.address,
          city: lot.city,
          state: lot.state,
          zip: lot.zip,
          phone: lot.phone,
          directions: lot.directions,
          hours_json: JSON.parse(JSON.stringify(lot.hours_json)),
          is_default: true,
          is_active: true,
        };
        const { data, error } = await supabase
          .from("impound_lots")
          .insert([insertData])
          .select()
          .single();
        if (error) throw error;
        setLot({ ...lot, id: data.id });
      }
      toast.success("Lot details saved");
    } catch (error: any) {
      console.error("Failed to save lot:", error);
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof ImpoundLot>(field: K, value: ImpoundLot[K]) => {
    if (!lot) return;
    setLot({ ...lot, [field]: value });
  };

  const updateHours = (day: string, field: "open" | "close", value: string | null) => {
    if (!lot) return;
    setLot({
      ...lot,
      hours_json: {
        ...lot.hours_json,
        [day]: { ...lot.hours_json[day], [field]: value },
      },
    });
  };

  const toggleDayClosed = (day: string, isClosed: boolean) => {
    if (!lot) return;
    if (isClosed) {
      updateHours(day, "open", null);
      updateHours(day, "close", null);
    } else {
      setLot({
        ...lot,
        hours_json: {
          ...lot.hours_json,
          [day]: { open: "08:00", close: "17:00" },
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lot) return null;

  return (
    <div className="space-y-6">
      {/* Quick Link to Inventory */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Manage Impound Inventory</p>
                <p className="text-sm text-muted-foreground">
                  Add vehicles, process releases, and track storage fees
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link to="/app/impound-lot">
                Open Impound Lot
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location Details */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Location Details</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            The AI tells callers this address when they ask where to pick up their vehicle.
          </p>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Lot Name</Label>
              <Input
                value={lot.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Main Impound Lot"
              />
              <p className="text-xs text-muted-foreground">
                Example: "Downtown Impound", "ABC Towing Storage Lot"
              </p>
            </div>

            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input
                value={lot.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="456 Storage Lane"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={lot.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Austin"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={lot.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  placeholder="TX"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input
                  value={lot.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                  placeholder="78701"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                Lot Phone Number
              </Label>
              <Input
                value={lot.phone || ""}
                onChange={(e) => updateField("phone", e.target.value || null)}
                placeholder="(512) 555-1234"
              />
              <p className="text-xs text-muted-foreground">
                If different from your main business number. AI will give this for impound-specific calls.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Driving Directions</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            The AI reads this word-for-word when callers ask "How do I get there?" Write it like you're giving directions over the phone.
          </p>
          <Textarea
            value={lot.directions || ""}
            onChange={(e) => updateField("directions", e.target.value || null)}
            placeholder="We're located off Highway 183, behind the Shell gas station on the corner of 5th and Main. Look for the large blue sign that says 'ABC Towing'. The entrance is on the right side of the building."
            rows={4}
          />
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Include landmarks, cross streets, and what to look for. Avoid abbreviations like "Hwy" — write "Highway" so it sounds natural when spoken.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hours */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Vehicle Release Hours</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            When can customers pick up their vehicles? The AI will tell callers these hours and whether you're currently open.
          </p>

          <div className="space-y-3">
            {DAYS.map(({ key, label }) => {
              const hours = lot.hours_json[key];
              const isClosed = !hours?.open && !hours?.close;
              
              return (
                <div key={key} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium">{label}</div>
                  <Switch
                    checked={!isClosed}
                    onCheckedChange={(checked) => toggleDayClosed(key, !checked)}
                  />
                  {isClosed ? (
                    <span className="text-sm text-muted-foreground">Closed — no pickups</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hours?.open || "08:00"}
                        onChange={(e) => updateHours(key, "open", e.target.value)}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={hours?.close || "17:00"}
                        onChange={(e) => updateHours(key, "close", e.target.value)}
                        className="w-28"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="rounded-lg border bg-amber-500/10 border-amber-500/20 p-3 mt-4">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <strong>After-hours pickups:</strong> If you offer gate fees for after-hours releases, configure that in the Fee Structure section below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={saveLot} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Lot Details
        </Button>
      </div>
    </div>
  );
}
