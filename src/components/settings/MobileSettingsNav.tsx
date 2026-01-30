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

// Section labels for display
const sectionLabels: Record<string, string> = {
  profile: "Profile",
  hours: "Business Hours",
  team: "Team Members",
  "ai-learning": "AI Learning",
  "data-privacy": "Data & Privacy",
  hipaa: "HIPAA Compliance",
  alerts: "Notifications",
  integrations: "Integrations",
  automation: "Automation",
  plan: "Your Plan",
  developer: "Developer Tools",
};

export function MobileSettingsNav({ activeSection, onSectionChange, config }: MobileSettingsNavProps) {
  const [isOpen, setIsOpen] = useState(false);

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
      items: [{ id: "plan", label: "Your Plan", icon: CreditCard }],
    },
    {
      id: "advanced",
      label: "Advanced",
      icon: Bug,
      colorClass: "text-muted-foreground",
      items: [{ id: "developer", label: "Developer Tools", icon: Bug }],
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
