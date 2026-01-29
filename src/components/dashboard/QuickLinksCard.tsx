import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  Calendar, 
  Users, 
  Wrench,
  UtensilsCrossed,
  Truck,
  Stethoscope,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

interface QuickLink {
  icon: React.ElementType;
  label: string;
  href: string;
  description: string;
  requiredModules?: string[];
}

const allQuickLinks: QuickLink[] = [
  { icon: Phone, label: "Inbox", href: "/app/inbox", description: "Conversations" },
  { icon: Calendar, label: "Bookings", href: "/app/bookings", description: "Appointments", requiredModules: ["booking"] },
  { icon: UtensilsCrossed, label: "Orders", href: "/app/orders", description: "Food orders", requiredModules: ["food_orders"] },
  { icon: Truck, label: "Dispatch", href: "/app/dispatch", description: "Job queue", requiredModules: ["dispatch_queue"] },
  { icon: Stethoscope, label: "Intakes", href: "/app/medical-intake", description: "Patient intake", requiredModules: ["medical_intake"] },
  { icon: Users, label: "Leads", href: "/app/leads", description: "All contacts" },
  { icon: Wrench, label: "Services", href: "/app/services", description: "Your offerings" },
];

export function QuickLinksCard() {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const enabledModules = (Array.isArray(tenant?.enabled_modules) ? tenant.enabled_modules : []) as string[];

  const quickLinks = useMemo(() => {
    return allQuickLinks.filter(link => {
      if (!link.requiredModules) return true;
      return link.requiredModules.some(mod => enabledModules.includes(mod));
    }).slice(0, 4); // Show max 4 links
  }, [enabledModules]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Quick Access</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => (
            <Button
              key={link.label}
              variant="ghost"
              className="h-auto py-3 px-3 justify-start gap-3 hover:bg-muted"
              onClick={() => navigate(link.href)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <link.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium block">{link.label}</span>
                <span className="text-xs text-muted-foreground">{link.description}</span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
