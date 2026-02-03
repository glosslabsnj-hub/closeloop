import { useState } from "react";
import {
  Users,
  CreditCard,
  Bell,
  Shield,
  Webhook,
  Zap,
  Bug,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { SettingsNavItem } from "./SettingsNavItem";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface SettingsNavConfig {
  showHipaa: boolean;
  showBookingDelivery: boolean;
  showDispatchDelivery: boolean;
  showFoodSettings: boolean;
}

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  config: SettingsNavConfig;
}

interface NavGroup {
  id: string;
  label: string;
  colorClass: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof Users;
  visible?: boolean;
}

export function SettingsSidebar({ activeSection, onSectionChange, config }: SettingsSidebarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Simplified nav groups: Account, Data & Privacy, Notifications, Advanced
  const navGroups: NavGroup[] = [
    {
      id: "account",
      label: "Account",
      colorClass: "text-primary",
      items: [
        { id: "team", label: "Team Members", icon: Users },
        { id: "plan", label: "Plan & Billing", icon: CreditCard },
      ],
    },
    {
      id: "data-privacy",
      label: "Data & Privacy",
      colorClass: "text-violet-500",
      items: [
        { id: "data-privacy", label: "Data Controls", icon: Shield },
      ],
    },
    {
      id: "notifications",
      label: "Notifications",
      colorClass: "text-amber-500",
      items: [
        { id: "alerts", label: "Alerts", icon: Bell },
        { id: "integrations", label: "Integrations", icon: Webhook },
        { id: "automation", label: "Automation", icon: Zap },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r bg-muted/30 p-4 space-y-6 hidden md:block">
      <div className="font-semibold text-lg px-3">Settings</div>

      <nav className="space-y-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.visible !== false);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.id} className="space-y-1">
              <div className={cn("text-xs font-medium px-3 py-1 uppercase tracking-wider", group.colorClass)}>
                {group.label}
              </div>
              {visibleItems.map((item) => (
                <SettingsNavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  isActive={activeSection === item.id}
                  onClick={() => onSectionChange(item.id)}
                />
              ))}
            </div>
          );
        })}

        {/* Advanced Section - Collapsible */}
        <Collapsible open={advancedOpen || activeSection === "developer"} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
            {advancedOpen || activeSection === "developer" ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Advanced
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-1">
            <SettingsNavItem
              icon={Bug}
              label="Developer Tools"
              isActive={activeSection === "developer"}
              onClick={() => onSectionChange("developer")}
            />
          </CollapsibleContent>
        </Collapsible>
      </nav>
    </aside>
  );
}
