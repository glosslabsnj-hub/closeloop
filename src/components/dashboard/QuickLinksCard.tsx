import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  Calendar, 
  Bot, 
  MessageSquare, 
  Users, 
  Wrench,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const quickLinks = [
  { icon: Phone, label: "Inbox", href: "/app/inbox", description: "Conversations" },
  { icon: Calendar, label: "Bookings", href: "/app/bookings", description: "Appointments" },
  { icon: Users, label: "Leads", href: "/app/leads", description: "All contacts" },
  { icon: Wrench, label: "Services", href: "/app/services", description: "Your offerings" },
];

export function QuickLinksCard() {
  const navigate = useNavigate();

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
