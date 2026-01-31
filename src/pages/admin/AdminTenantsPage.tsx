import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MoreHorizontal } from "lucide-react";

const demoTenants = [
  { id: "1", name: "Mike's Auto Detailing", industry: "detailing", users: 3, status: "active" },
  { id: "2", name: "Elite HVAC", industry: "hvac", users: 5, status: "active" },
  { id: "3", name: "Pro Plumbing", industry: "plumber", users: 2, status: "trial" },
];

export default function AdminTenantsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tenants</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tenants..." className="pl-9" />
      </div>
      <div className="space-y-4">
        {demoTenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{tenant.name}</p>
                <p className="text-sm text-muted-foreground">{tenant.industry} • {tenant.users} users</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={tenant.status === "active" ? "default" : "secondary"}>{tenant.status}</Badge>
                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
