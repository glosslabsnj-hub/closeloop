import { useState } from "react";
import {
  Building2,
  Clock,
  Users,
  CreditCard,
  Bell,
  Brain,
  Shield,
  Stethoscope,
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
  icon: typeof Building2;
  colorClass: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  icon: typeof Building2;
  visible?: boolean;
}

export function SettingsSidebar({ activeSection, onSectionChange, config }: SettingsSidebarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      id: "business",
      label: "Your Business",
      icon: Building2,
      colorClass: "text-primary",
      items: [
        { id: "profile", label: "Profile", icon: Building2 },
        { id: "hours", label: "Business Hours", icon: Clock },
        { id: "team", label: "Team Members", icon: Users },
      ],
    },
    {
      id: "ai-privacy",
      label: "AI & Privacy",
      icon: Brain,
      colorClass: "text-violet-500",
      items: [
        { id: "ai-learning", label: "AI Learning", icon: Brain },
        { id: "ai-rules", label: "Required Questions", icon: Brain },
        { id: "data-privacy", label: "Data & Privacy", icon: Shield },
        { id: "hipaa", label: "HIPAA Compliance", icon: Stethoscope, visible: config.showHipaa },
      ],
    },
    {
      id: "notifications",
      label: "Notifications & Delivery",
      icon: Bell,
      colorClass: "text-amber-500",
      items: [
        { id: "alerts", label: "How You Get Notified", icon: Bell },
        { id: "integrations", label: "Where Things Go", icon: Webhook },
        { id: "automation", label: "Automation Rules", icon: Zap },
      ],
    },
    {
      id: "billing",
      label: "Plan & Billing",
      icon: CreditCard,
      colorClass: "text-emerald-500",
      items: [
        { id: "plan", label: "Your Plan", icon: CreditCard },
      ],
    },
  ];

  // Check if current section is in a group
  const getGroupForSection = (sectionId: string): string | null => {
    for (const group of navGroups) {
      if (group.items.some((item) => item.id === sectionId)) {
        return group.id;
      }
    }
    return null;
  };

  return (
    <aside className="w-64 shrink-0 border-r bg-muted/30 p-4 space-y-6 hidden md:block">
      <div className="font-semibold text-lg px-3">Settings</div>

      <nav className="space-y-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.visible !== false);
          if (visibleItems.length === 0) return null;

          const isGroupActive = visibleItems.some((item) => item.id === activeSection);

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
