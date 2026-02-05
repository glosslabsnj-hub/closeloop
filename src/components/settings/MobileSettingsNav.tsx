import { useState } from "react";
import {
  Users,
  CreditCard,
  Bell,
  Shield,
  Webhook,
  Zap,
  Bug,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SettingsNavConfig } from "./SettingsSidebar";

interface MobileSettingsNavProps {
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

// Section labels for display
const sectionLabels: Record<string, string> = {
  team: "Team Members",
  plan: "Plan & Billing",
  revenue: "Revenue Tracking",
  "data-privacy": "Data Controls",
  alerts: "Alerts",
  integrations: "Integrations",
  automation: "Automation",
  recovery: "Lead Recovery",
  developer: "Developer Tools",
  danger: "Danger Zone",
};

export function MobileSettingsNav({ activeSection, onSectionChange, config }: MobileSettingsNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      id: "account",
      label: "Account",
      colorClass: "text-primary",
      items: [
        { id: "team", label: "Team Members", icon: Users },
        { id: "plan", label: "Plan & Billing", icon: CreditCard },
        { id: "revenue", label: "Revenue Tracking", icon: DollarSign },
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
    {
      id: "ai-features",
      label: "AI Features",
      colorClass: "text-emerald-500",
      items: [
        { id: "recovery", label: "Lead Recovery", icon: RefreshCw },
      ],
    },
    {
      id: "advanced",
      label: "Advanced",
      colorClass: "text-muted-foreground",
      items: [
        { id: "developer", label: "Developer Tools", icon: Bug },
        { id: "danger", label: "Danger Zone", icon: AlertTriangle },
      ],
    },
  ];

  const handleSelect = (sectionId: string) => {
    onSectionChange(sectionId);
    setIsOpen(false);
  };

  // Find current section info
  const currentLabel = sectionLabels[activeSection] || "Settings";

  return (
    <div className="md:hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg border">
          <span className="font-medium">{currentLabel}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 bg-card border rounded-lg overflow-hidden">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.visible !== false);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.id} className="border-b last:border-0">
                <div className={cn("text-xs font-medium px-4 py-2 bg-muted/30 uppercase tracking-wider", group.colorClass)}>
                  {group.label}
                </div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                        isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
