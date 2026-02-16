import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Trash2 } from "lucide-react";

/**
 * Time window representing an open period
 */
export interface TimeWindow {
  open: string;
  close: string;
}

/**
 * Day hours with support for multiple time windows (split shifts)
 * e.g., Restaurant open 7am-11am (breakfast), closed 11am-5pm, open 5pm-10pm (dinner)
 */
export interface DayHours {
  closed: boolean;
  windows: TimeWindow[];
  // Legacy fields for backward compatibility (deprecated, use windows instead)
  open?: string;
  close?: string;
}

export type BusinessHours = Record<string, DayHours>;

interface BusinessHoursEditorProps {
  hours: BusinessHours;
  onChange: (hours: BusinessHours) => void;
}

const days = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const timeOptions = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '23:59',
];

const formatTime = (time: string) => {
  if (time === '23:59') return '12:00 AM (midnight)';
  if (time === '00:00') return '12:00 AM';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${minutes} ${suffix}`;
};

/**
 * Normalize legacy hours format to new windows format
 */
export function normalizeHours(hours: BusinessHours): BusinessHours {
  const normalized: BusinessHours = {};
  
  for (const [day, dayHours] of Object.entries(hours)) {
    if (!dayHours) {
      normalized[day] = { closed: true, windows: [] };
      continue;
    }
    
    // If already has windows array, use it
    if (Array.isArray(dayHours.windows) && dayHours.windows.length > 0) {
      normalized[day] = {
        closed: dayHours.closed ?? false,
        windows: dayHours.windows,
      };
    } 
    // Legacy format: convert open/close to single window
    else if (dayHours.open && dayHours.close) {
      normalized[day] = {
        closed: dayHours.closed ?? false,
        windows: [{ open: dayHours.open, close: dayHours.close }],
      };
    }
    // Closed or empty
    else {
      normalized[day] = {
        closed: dayHours.closed ?? true,
        windows: dayHours.closed ? [] : [{ open: '09:00', close: '17:00' }],
      };
    }
  }
  
  return normalized;
}

export default function BusinessHoursEditor({ hours, onChange }: BusinessHoursEditorProps) {
  // Normalize hours on first render to handle legacy data
  const normalizedHours = normalizeHours(hours);
  
  const updateDay = (dayKey: string, updates: Partial<DayHours>) => {
    onChange({
      ...hours,
      [dayKey]: { ...normalizedHours[dayKey], ...updates },
    });
  };

  const updateWindow = (dayKey: string, windowIndex: number, field: keyof TimeWindow, value: string) => {
    const dayHours = normalizedHours[dayKey];
    const newWindows = [...dayHours.windows];
    newWindows[windowIndex] = { ...newWindows[windowIndex], [field]: value };
    updateDay(dayKey, { windows: newWindows });
  };

  const addWindow = (dayKey: string) => {
    const dayHours = normalizedHours[dayKey];
    const lastWindow = dayHours.windows[dayHours.windows.length - 1];
    // Default new window starts 2 hours after last close
    const lastCloseIndex = timeOptions.indexOf(lastWindow?.close || '12:00');
    const newOpenIndex = Math.min(lastCloseIndex + 4, timeOptions.length - 5); // +2 hours gap
    const newCloseIndex = Math.min(newOpenIndex + 8, timeOptions.length - 1); // 4 hour window
    
    updateDay(dayKey, {
      windows: [
        ...dayHours.windows,
        { open: timeOptions[newOpenIndex], close: timeOptions[newCloseIndex] },
      ],
    });
  };

  const removeWindow = (dayKey: string, windowIndex: number) => {
    const dayHours = normalizedHours[dayKey];
    const newWindows = dayHours.windows.filter((_, i) => i !== windowIndex);
    
    // If no windows left, mark as closed
    if (newWindows.length === 0) {
      updateDay(dayKey, { closed: true, windows: [] });
    } else {
      updateDay(dayKey, { windows: newWindows });
    }
  };

  const toggleClosed = (dayKey: string, isOpen: boolean) => {
    if (isOpen) {
      // Opening: add default window if none
      updateDay(dayKey, {
        closed: false,
        windows: [{ open: '09:00', close: '17:00' }],
      });
    } else {
      // Closing: clear windows
      updateDay(dayKey, { closed: true, windows: [] });
    }
  };

  const copyToWeekdays = () => {
    const mondayHours = normalizedHours.monday;
    const updated = { ...hours };
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
      updated[day] = { ...mondayHours, windows: [...mondayHours.windows] };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-1">
        <Button variant="ghost" size="sm" onClick={copyToWeekdays} className="text-xs text-muted-foreground">
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy Mon → Fri
        </Button>
      </div>
      
      {days.map(({ key, label }) => {
        const dayHours = normalizedHours[key];
        const isClosed = dayHours?.closed ?? true;
        const windows = dayHours?.windows ?? [];
        const firstWindow = windows[0];

        return (
          <div key={key} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
            <div className="w-24 shrink-0">
              <span className="text-sm font-medium">{label}</span>
            </div>
            
            {isClosed ? (
              <span className="flex-1 text-sm text-muted-foreground">Closed</span>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <Select
                  value={firstWindow?.open || '09:00'}
                  onValueChange={(value) => updateWindow(key, 0, 'open', value)}
                >
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <span className="text-sm text-muted-foreground">to</span>
                
                <Select
                  value={firstWindow?.close || '17:00'}
                  onValueChange={(value) => updateWindow(key, 0, 'close', value)}
                >
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Switch
              checked={!isClosed}
              onCheckedChange={(checked) => toggleClosed(key, checked)}
            />
          </div>
        );
      })}
    </div>
  );
}
