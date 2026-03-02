import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  CalendarDays,
  Plus,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIndustryContext } from "@/hooks/useIndustryContext";

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface CalendarSyncSettingsProps {
  onSyncComplete?: () => void;
}

export default function CalendarSyncSettings({ onSyncComplete }: CalendarSyncSettingsProps) {
  const { tenant, assistantSettings } = useAuth();
  const { toast } = useToast();
  const { terminology } = useIndustryContext();
  
  const [provider, setProvider] = useState<string>('closeloop');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [tenant?.id]);

  const loadSettings = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    
    try {
      // Load provider from assistant settings
      if (assistantSettings) {
        setProvider(assistantSettings.calendar_provider || 'closeloop');
      }

      // Load availability slots
      const { data: slotsData, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      if (slotsData && slotsData.length > 0) {
        setSlots(slotsData);
      } else {
        // Create default slots (Mon-Fri 9-5)
        const defaultSlots: AvailabilitySlot[] = [];
        for (let day = 1; day <= 5; day++) {
          defaultSlots.push({
            day_of_week: day,
            start_time: '09:00',
            end_time: '17:00',
            is_available: true,
          });
        }
        setSlots(defaultSlots);
      }
    } catch (error: any) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id) return;
    
    setSaving(true);
    try {
      // Delete existing slots
      await supabase
        .from('availability_slots')
        .delete()
        .eq('tenant_id', tenant.id);

      // Insert new slots
      const slotsToInsert = slots.map(slot => ({
        tenant_id: tenant.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
      }));

      if (slotsToInsert.length > 0) {
        const { error } = await supabase
          .from('availability_slots')
          .insert(slotsToInsert);

        if (error) throw error;
      }

      toast({ title: "Availability saved!" });
      onSyncComplete?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    const existingSlot = slots.find(s => s.day_of_week === dayIndex);
    if (existingSlot) {
      setSlots(slots.map(s => 
        s.day_of_week === dayIndex 
          ? { ...s, is_available: !s.is_available }
          : s
      ));
    } else {
      setSlots([...slots, {
        day_of_week: dayIndex,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
      }]);
    }
  };

  const updateSlotTime = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setSlots(slots.map(s => 
      s.day_of_week === dayIndex 
        ? { ...s, [field]: value }
        : s
    ));
  };

  const getSlotForDay = (dayIndex: number): AvailabilitySlot | undefined => {
    return slots.find(s => s.day_of_week === dayIndex);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading availability...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Your Availability
        </CardTitle>
        <CardDescription>
          Set when you're available. AI will only schedule {terminology.appointmentLabel}s during these times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Schedule */}
        <div className="space-y-3">
          {dayNames.map((dayName, index) => {
            const slot = getSlotForDay(index);
            const isAvailable = slot?.is_available ?? false;

            return (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isAvailable ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isAvailable}
                    onCheckedChange={() => toggleDay(index)}
                  />
                  <span className={`font-medium ${!isAvailable ? 'text-muted-foreground' : ''}`}>
                    {dayName}
                  </span>
                </div>

                {isAvailable && slot && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlotTime(index, 'start_time', e.target.value)}
                      className="w-28 h-8 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlotTime(index, 'end_time', e.target.value)}
                      className="w-28 h-8 text-sm"
                    />
                  </div>
                )}

                {!isAvailable && (
                  <Badge variant="secondary" className="text-xs">Closed</Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Provider Info */}
        {provider === 'google' && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Synced with Google Calendar</p>
              <p className="text-muted-foreground mt-1">
                Your busy times from Google Calendar will be automatically blocked.
              </p>
            </div>
          </div>
        )}

        {/* How AI uses this */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2 border-t pt-6">
          <p className="text-sm font-medium">AI booking behavior:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>AI only offers times during your available hours</li>
            <li>AI respects buffer time between {terminology.appointmentLabel}s</li>
            <li>AI checks for conflicts with existing {terminology.appointmentLabel}s</li>
            <li>AI schedules directly into your Flux Receptionist calendar</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Availability'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
