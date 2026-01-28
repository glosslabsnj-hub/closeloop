import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy } from "lucide-react";

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
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
  '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00',
];

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${minutes} ${suffix}`;
};

export default function BusinessHoursEditor({ hours, onChange }: BusinessHoursEditorProps) {
  const updateDay = (dayKey: string, field: keyof DayHours, value: string | boolean) => {
    onChange({
      ...hours,
      [dayKey]: { ...hours[dayKey], [field]: value },
    });
  };

  const copyToWeekdays = () => {
    const mondayHours = hours.monday;
    const updated = { ...hours };
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day) => {
      updated[day] = { ...mondayHours };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={copyToWeekdays}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Mon to Weekdays
        </Button>
      </div>
      
      {days.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <div className="w-24 font-medium text-sm">{label}</div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Open</span>
            <Switch
              checked={!hours[key]?.closed}
              onCheckedChange={(checked) => updateDay(key, 'closed', !checked)}
            />
          </div>
          
          {!hours[key]?.closed && (
            <div className="flex items-center gap-2 flex-1">
              <Select
                value={hours[key]?.open || '09:00'}
                onValueChange={(value) => updateDay(key, 'open', value)}
              >
                <SelectTrigger className="w-[110px]">
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
              
              <span className="text-muted-foreground">–</span>
              
              <Select
                value={hours[key]?.close || '17:00'}
                onValueChange={(value) => updateDay(key, 'close', value)}
              >
                <SelectTrigger className="w-[110px]">
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
          
          {hours[key]?.closed && (
            <span className="text-sm text-muted-foreground ml-4">Closed</span>
          )}
        </div>
      ))}
    </div>
  );
}
