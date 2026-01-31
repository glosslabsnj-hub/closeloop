import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeadphonesIcon } from "lucide-react";

export default function AdminSupportPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Support</h1>
      <Card>
        <CardHeader><CardTitle>Impersonate Tenant</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Log in as a tenant to troubleshoot issues.</p>
          <Button variant="outline">Select Tenant</Button>
        </CardContent>
      </Card>
    </div>
  );
}
