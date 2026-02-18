import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  HeadphonesIcon,
  ArrowUpRight,
  Users,
  ClipboardCheck,
  ScrollText,
  Bug,
  Phone,
} from "lucide-react";

const quickLinks = [
  {
    label: "Golden Path QA",
    description: "Run end-to-end quality checks",
    href: "/admin/golden-path",
    icon: ClipboardCheck,
  },
  {
    label: "Audit Report",
    description: "View system audit findings",
    href: "/admin/audit-report",
    icon: ScrollText,
  },
  {
    label: "Telephony Debug",
    description: "Debug call routing and Twilio events",
    href: "/debug/telephony",
    icon: Phone,
  },
  {
    label: "AI Context Debug",
    description: "Inspect dynamic variables sent to agents",
    href: "/debug/ai-context",
    icon: Bug,
  },
];

export default function AdminSupportPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Support Tools</h1>

      {/* Tenant Switching */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Switch to Tenant View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the <strong>tenant switcher</strong> in the top-right corner of the admin header
            to impersonate any tenant. This lets you view the app exactly as that tenant sees it,
            including their dashboard, bookings, and settings.
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <link.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1">
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Edge function health and database status are monitored via the Supabase dashboard.
          </p>
          <p>
            Use the <strong>Golden Path QA</strong> runner to verify the full call-to-entity pipeline
            is working end-to-end.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
