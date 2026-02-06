import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantSettings, useAvailabilitySlots } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const BUSINESS_TYPES = [
  { value: "service", label: "Service Business (Appointments)" },
  { value: "food", label: "Food & Restaurant" },
  { value: "dispatch", label: "Dispatch & Delivery" },
  { value: "medical", label: "Medical & Healthcare" },
  { value: "general", label: "General Business" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_OPTIONS = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM",
];

// Convert 12h format to 24h format for DB storage
function to24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") hours = "00";
  if (modifier === "PM") hours = String(parseInt(hours) + 12);
  return `${hours.padStart(2, "0")}:${minutes}:00`;
}

// Convert 24h format from DB to 12h format for display
function to12Hour(time24h: string): string {
  const [hours, minutes] = time24h.split(":");
  let h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
}

interface HoursState {
  [key: number]: {
    isOpen: boolean;
    start: string;
    end: string;
  };
}

export function BusinessProfileSettings() {
  const { tenant } = useAuth();
  const { updateTenant, isUpdating } = useTenantSettings();
  const { slots, saveSlots, isSaving: isSavingSlots, isLoading: isLoadingSlots } = useAvailabilitySlots();

  const [formData, setFormData] = useState({
    name: "",
    business_mode: "service",
    phone_public: "",
    tagline: "",
    website_url: "",
    address: "",
  });

  const [hours, setHours] = useState<HoursState>(() => {
    const initial: HoursState = {};
    DAYS_OF_WEEK.forEach((day) => {
      initial[day.value] = {
        isOpen: day.value !== 0, // Closed Sundays by default
        start: "9:00 AM",
        end: day.value === 6 ? "5:00 PM" : "7:00 PM",
      };
    });
    return initial;
  });

  // Load tenant data
  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || "",
        business_mode: tenant.business_mode || "service",
        phone_public: tenant.phone_public || "",
        tagline: tenant.tagline || "",
        website_url: tenant.website_url || "",
        address: tenant.address || "",
      });
    }
  }, [tenant]);

  // Load availability slots
  useEffect(() => {
    if (slots.length > 0) {
      const newHours: HoursState = {};
      DAYS_OF_WEEK.forEach((day) => {
        const slot = slots.find((s) => s.day_of_week === day.value);
        if (slot) {
          newHours[day.value] = {
            isOpen: slot.is_available ?? true,
            start: to12Hour(slot.start_time),
            end: to12Hour(slot.end_time),
          };
        } else {
          newHours[day.value] = {
            isOpen: day.value !== 0,
            start: "9:00 AM",
            end: day.value === 6 ? "5:00 PM" : "7:00 PM",
          };
        }
      });
      setHours(newHours);
    }
  }, [slots]);

  const handleSave = async () => {
    try {
      // Save tenant profile
      await updateTenant.mutateAsync({
        name: formData.name,
        business_mode: formData.business_mode as any,
        phone_public: formData.phone_public || null,
        tagline: formData.tagline || null,
        website_url: formData.website_url || null,
        address: formData.address || null,
      });

      // Save availability slots
      const slotsToSave = DAYS_OF_WEEK.map((day) => ({
        day_of_week: day.value,
        is_available: hours[day.value].isOpen,
        start_time: to24Hour(hours[day.value].start),
        end_time: to24Hour(hours[day.value].end),
      }));

      await saveSlots.mutateAsync(slotsToSave);

      toast.success("Business profile saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const isSaving = isUpdating || isSavingSlots;

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Your business name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_type">Business Type</Label>
            <Select
              value={formData.business_mode}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, business_mode: value }))
              }
            >
              <SelectTrigger id="business_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_public">Phone Number (Public)</Label>
              <Input
                id="phone_public"
                value={formData.phone_public}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone_public: e.target.value }))
                }
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                }
                placeholder="Your business slogan"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Website</Label>
            <Input
              id="website_url"
              value={formData.website_url}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, website_url: e.target.value }))
              }
              placeholder="https://yourbusiness.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Full Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="123 Main Street, Suite 100, Springfield, IL 62701"
            />
            <p className="text-xs text-muted-foreground">
              Enter your complete business address including city, state, and ZIP
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSlots ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.value}
                  className="flex items-center gap-4"
                >
                  <div className="w-8">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={hours[day.value]?.isOpen ?? false}
                      onCheckedChange={(checked) => {
                        setHours((prev) => ({
                          ...prev,
                          [day.value]: {
                            ...prev[day.value],
                            isOpen: !!checked,
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="w-28">
                    <Label
                      htmlFor={`day-${day.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {day.label}
                    </Label>
                  </div>
                  {hours[day.value]?.isOpen ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Select
                        value={hours[day.value]?.start}
                        onValueChange={(value) => {
                          setHours((prev) => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], start: value },
                          }));
                        }}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">to</span>
                      <Select
                        value={hours[day.value]?.end}
                        onValueChange={(value) => {
                          setHours((prev) => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], end: value },
                          }));
                        }}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">CLOSED</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" className="gap-2 mt-4">
            <Plus className="h-4 w-4" />
            Add Holiday Hours
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
