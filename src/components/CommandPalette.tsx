import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Calendar,
  Brain,
  Settings,
  Zap,
  BarChart3,
  HelpCircle,
  Rocket,
  Bot,
  FileText,
} from "lucide-react";

const pages = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/app/dashboard", group: "Navigate" },
  { label: "Leads & Inbox", icon: Inbox, href: "/app/inbox", group: "Navigate" },
  { label: "Customers", icon: Users, href: "/app/customers", group: "Navigate" },
  { label: "Schedule / Bookings", icon: Calendar, href: "/app/bookings", group: "Navigate" },
  { label: "Business Brain", icon: Brain, href: "/app/business-brain", group: "Navigate" },
  { label: "AI Assistant Settings", icon: Bot, href: "/app/ai-assistant", group: "Navigate" },
  { label: "Integrations", icon: Zap, href: "/app/integrations", group: "Navigate" },
  { label: "Reports & ROI", icon: BarChart3, href: "/app/reports/roi", group: "Navigate" },
  { label: "Go Live / Upgrade", icon: Rocket, href: "/app/go-live", group: "Navigate" },
  { label: "Agreements", icon: FileText, href: "/app/agreements", group: "Navigate" },
  { label: "Settings", icon: Settings, href: "/app/settings", group: "Settings" },
  { label: "Team Members", icon: Users, href: "/app/settings?section=team", group: "Settings" },
  { label: "Plan & Billing", icon: BarChart3, href: "/app/settings?section=billing", group: "Settings" },
  { label: "Help Center", icon: HelpCircle, href: "/app/help", group: "Settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (href: string) => {
      setOpen(false);
      navigate(href);
    },
    [navigate]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, settings..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {pages
            .filter((p) => p.group === "Navigate")
            .map((page) => {
              const Icon = page.icon;
              return (
                <CommandItem
                  key={page.href}
                  onSelect={() => runCommand(page.href)}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {page.label}
                </CommandItem>
              );
            })}
        </CommandGroup>
        <CommandGroup heading="Settings">
          {pages
            .filter((p) => p.group === "Settings")
            .map((page) => {
              const Icon = page.icon;
              return (
                <CommandItem
                  key={page.href}
                  onSelect={() => runCommand(page.href)}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {page.label}
                </CommandItem>
              );
            })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** Hook to open the command palette programmatically */
export function useCommandPalette() {
  return {
    open: () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      );
    },
  };
}
