import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoldenPathTestRunner } from "@/components/admin/GoldenPathTestRunner";
import { GoldenPathAutoChecks } from "@/components/admin/GoldenPathAutoChecks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Zap, Play, Briefcase, UtensilsCrossed, Truck, Stethoscope, Phone } from "lucide-react";
import { useEffect } from "react";

interface Tenant {
  id: string;
  name: string;
  business_mode: string;
}

const modeIcons: Record<string, React.ReactNode> = {
  service: <Briefcase className="h-4 w-4" />,
  food: <UtensilsCrossed className="h-4 w-4" />,
  dispatch: <Truck className="h-4 w-4" />,
  medical: <Stethoscope className="h-4 w-4" />,
  general: <Phone className="h-4 w-4" />,
};

export default function AdminGoldenPathPage() {
  const [activeTab, setActiveTab] = useState("runner");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    const loadTenants = async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, name, business_mode")
        .order("name");
      setTenants(data || []);
    };
    loadTenants();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />
          Golden Path QA
        </h1>
        <p className="text-muted-foreground">
          Automated end-to-end validation across all business modes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="runner" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Test Runner
          </TabsTrigger>
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Checks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="runner" className="mt-6">
          <GoldenPathTestRunner />
        </TabsContent>

        <TabsContent value="quick" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Tenant for Quick Checks</CardTitle>
              <CardDescription>
                These checks don't persist to the database but give a quick overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex items-center gap-2">
                        {modeIcons[tenant.business_mode] || modeIcons.general}
                        <span>{tenant.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {tenant.business_mode}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          <GoldenPathAutoChecks tenantId={selectedTenantId || null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
