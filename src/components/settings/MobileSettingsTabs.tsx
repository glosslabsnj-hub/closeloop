import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Building2, 
  Clock, 
  Users, 
  CreditCard, 
  Bell, 
  Bug,
  UtensilsCrossed,
  Calendar,
  Truck,
  Stethoscope,
  ChevronDown,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TabConfig {
  value: string;
  label: string;
  icon: React.ElementType;
  visible: boolean;
}

interface MobileSettingsTabsProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function MobileSettingsTabs({ tabs, activeTab, onTabChange }: MobileSettingsTabsProps) {
  const [open, setOpen] = useState(false);
  
  const visibleTabs = tabs.filter(t => t.visible);
  const activeTabConfig = visibleTabs.find(t => t.value === activeTab);
  const ActiveIcon = activeTabConfig?.icon || Building2;

  const handleSelect = (value: string) => {
    onTabChange(value);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-between md:hidden">
          <div className="flex items-center gap-2">
            <ActiveIcon className="h-4 w-4" />
            <span>{activeTabConfig?.label || "Settings"}</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader className="pb-4">
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="space-y-1 overflow-y-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.value === activeTab;
            
            return (
              <button
                key={tab.value}
                onClick={() => handleSelect(tab.value)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Icon mapping for settings tabs
export const settingsTabIcons: Record<string, React.ElementType> = {
  business: Building2,
  hours: Clock,
  team: Users,
  billing: CreditCard,
  notifications: Bell,
  food: UtensilsCrossed,
  "booking-delivery": Calendar,
  "dispatch-delivery": Truck,
  hipaa: Stethoscope,
  developer: Bug
};
