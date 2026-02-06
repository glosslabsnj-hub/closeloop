import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Settings,
  Users,
  Bot,
  FileText,
  Search,
  Plus,
  Phone,
  Truck,
  UtensilsCrossed,
  Clock,
  BarChart3,
  HelpCircle,
  FlaskConical,
} from "lucide-react";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  keywords?: string[];
}

const navigationItems: SearchItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/app/dashboard", keywords: ["home", "overview"] },
  { id: "inbox", label: "Inbox", description: "Calls & Sessions", icon: MessageSquare, href: "/app/inbox", keywords: ["calls", "messages", "leads"] },
  { id: "bookings", label: "Bookings", icon: Calendar, href: "/app/bookings", keywords: ["appointments", "schedule"] },
  { id: "dispatch", label: "Dispatch Jobs", icon: Truck, href: "/app/dispatch", keywords: ["towing", "jobs", "drivers"] },
  { id: "orders", label: "Orders", icon: UtensilsCrossed, href: "/app/orders", keywords: ["food", "delivery"] },
  { id: "reservations", label: "Reservations", icon: Clock, href: "/app/reservations", keywords: ["tables", "dining"] },
  { id: "customers", label: "Customers", icon: Users, href: "/app/customers", keywords: ["contacts", "clients"] },
  { id: "brain", label: "Business Brain", description: "AI Assistant & Knowledge", icon: Bot, href: "/app/business-brain", keywords: ["ai", "assistant", "knowledge"] },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3, href: "/app/reports/roi", keywords: ["analytics", "revenue", "metrics"] },
  { id: "settings", label: "Settings", icon: Settings, href: "/app/settings", keywords: ["preferences", "account"] },
  { id: "help", label: "Help & Support", icon: HelpCircle, href: "/app/help", keywords: ["support", "documentation"] },
  { id: "simulator", label: "Test Calls", description: "Call Simulator", icon: FlaskConical, href: "/app/simulator", keywords: ["test", "demo", "preview"] },
];

const quickActions: SearchItem[] = [
  { id: "new-booking", label: "Create Booking", icon: Plus, href: "/app/bookings?action=new", keywords: ["add", "new", "schedule"] },
  { id: "new-customer", label: "Add Customer", icon: Plus, href: "/app/customers?action=new", keywords: ["add", "new", "contact"] },
  { id: "view-calls", label: "View Today's Calls", icon: Phone, href: "/app/inbox?filter=today", keywords: ["recent", "calls"] },
  { id: "test-call", label: "Start Test Call", icon: FlaskConical, href: "/app/simulator", keywords: ["demo", "simulate"] },
];

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const handleSelect = useCallback((item: SearchItem) => {
    onOpenChange(false);
    if (item.href) {
      navigate(item.href);
    } else if (item.action) {
      item.action();
    }
  }, [navigate, onOpenChange]);

  const filterItems = (items: SearchItem[]) => {
    if (!search) return items;
    const query = search.toLowerCase();
    return items.filter(item => 
      item.label.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.keywords?.some(k => k.includes(query))
    );
  };

  const filteredNavigation = filterItems(navigationItems);
  const filteredActions = filterItems(quickActions);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search pages, actions, or customers..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center text-sm">
            <Search className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No results found</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Try a different search term</p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        {filteredActions.length > 0 && (
          <CommandGroup heading="Quick Actions">
            {filteredActions.map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredActions.length > 0 && filteredNavigation.length > 0 && (
          <CommandSeparator />
        )}

        {/* Navigation */}
        {filteredNavigation.length > 0 && (
          <CommandGroup heading="Navigation">
            {filteredNavigation.map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => handleSelect(item)}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recent Searches - placeholder for future */}
        {!search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent">
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Your recent searches will appear here
                </p>
              </div>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
