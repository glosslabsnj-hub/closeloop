import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trash2, Loader2, Building2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminTenantsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  // Fetch admin's primary tenant to protect it
  const { data: primaryTenantId } = useQuery({
    queryKey: ["admin-primary-tenant", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("tenant_users")
        .select("tenant_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.tenant_id ?? null;
    },
    enabled: !!user?.id,
  });

  // Fetch all tenants (service role not needed — super_admin RLS should allow)
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-all-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, business_mode, industry, created_at, onboarding_completed_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = tenants?.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleDelete = async (tenantId: string) => {
    setDeletingId(tenantId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("delete-tenant", {
        body: { tenant_id: tenantId },
      });
      if (res.error) throw new Error(res.error.message || "Delete failed");
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Tenant deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-all-tenants"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete tenant");
    } finally {
      setDeletingId(null);
      setConfirmText("");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Badge variant="secondary">{filtered.length} total</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "No tenants match your search." : "No tenants found."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tenant) => {
            const isOwn = tenant.id === primaryTenantId;
            const isDeleting = deletingId === tenant.id;

            return (
              <Card key={tenant.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {tenant.name}
                        {isOwn && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.business_mode} • {tenant.industry || "—"} • {tenant.created_at ? format(new Date(tenant.created_at), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={tenant.onboarding_completed_at ? "default" : "secondary"}>
                      {tenant.onboarding_completed_at ? "Active" : "Setup"}
                    </Badge>

                    {!isOwn && (
                      <AlertDialog onOpenChange={() => setConfirmText("")}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{tenant.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the tenant and all its data (bookings, customers, calls, services, etc.). This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-2">
                            <p className="text-sm text-muted-foreground mb-2">
                              Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm:
                            </p>
                            <Input
                              value={confirmText}
                              onChange={(e) => setConfirmText(e.target.value)}
                              placeholder="Type DELETE"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(tenant.id)}
                              disabled={confirmText !== "DELETE"}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Tenant
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
