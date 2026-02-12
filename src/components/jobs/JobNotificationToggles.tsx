import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";

interface JobNotificationTogglesProps {
  notifyOnStepComplete: boolean;
  notifyOnAllComplete: boolean;
  onToggleStep: (value: boolean) => void;
  onToggleAll: (value: boolean) => void;
}

export function JobNotificationToggles({
  notifyOnStepComplete,
  notifyOnAllComplete,
  onToggleStep,
  onToggleAll,
}: JobNotificationTogglesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Bell className="h-3.5 w-3.5" />
        Customer Notifications
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="notify-step" className="text-sm cursor-pointer">
          Text after each step completes
        </Label>
        <Switch
          id="notify-step"
          checked={notifyOnStepComplete}
          onCheckedChange={onToggleStep}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="notify-all" className="text-sm cursor-pointer">
          Text when all steps are done
        </Label>
        <Switch
          id="notify-all"
          checked={notifyOnAllComplete}
          onCheckedChange={onToggleAll}
        />
      </div>
    </div>
  );
}
