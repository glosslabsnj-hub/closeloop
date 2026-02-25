import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { CustomerMergeQueue as MergeQueueType } from "@/types/database";
import { GitMerge, User, Check, ArrowRight } from "lucide-react";

interface MergeQueueItemWithCustomer extends MergeQueueType {
  existing_customer?: {
    full_name: string;
    email: string | null;
    phone_e164: string;
  };
}

export default function CustomerMergeQueue() {
  const { tenant, user } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState<MergeQueueItemWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant?.id) {
      fetchQueue();
    }
  }, [tenant?.id]);

  const fetchQueue = async () => {
    if (!tenant?.id) return;

    const { data, error } = await supabase
      .from('customer_merge_queue')
      .select(`
        *,
        existing_customer:customers!customer_merge_queue_existing_customer_id_fkey (
          full_name,
          email,
          phone_e164
        )
      `)
      .eq('tenant_id', tenant.id)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch merge queue:', error);
    } else {
      setItems((data || []) as MergeQueueItemWithCustomer[]);
    }
    setLoading(false);
  };

  const handleMerge = async (item: MergeQueueItemWithCustomer) => {
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        full_name: item.incoming_name || item.existing_customer?.full_name,
        email: item.incoming_email || item.existing_customer?.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.existing_customer_id);

    if (updateError) {
      toast({ variant: "destructive", title: "Failed to merge customer" });
      return;
    }

    await supabase
      .from('customer_merge_queue')
      .update({
        resolved: true,
        resolution: 'merged',
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq('id', item.id);

    toast({ title: "Customer merged successfully" });
    fetchQueue();
  };

  const handleKeepExisting = async (item: MergeQueueItemWithCustomer) => {
    await supabase
      .from('customer_merge_queue')
      .update({
        resolved: true,
        resolution: 'kept_existing',
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq('id', item.id);

    toast({ title: "Kept existing customer data" });
    fetchQueue();
  };

  const handleCreateNew = async (item: MergeQueueItemWithCustomer) => {
    const { error: createError } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenant!.id,
        phone_e164: item.incoming_phone_e164 + '_new',
        phone_raw: item.incoming_phone_e164,
        full_name: item.incoming_name || 'Unknown',
        email: item.incoming_email,
        source: item.source,
        notes: `Created from conflict resolution. Original customer ID: ${item.existing_customer_id}`,
      });

    if (createError) {
      toast({ variant: "destructive", title: "Failed to create new customer" });
      return;
    }

    await supabase
      .from('customer_merge_queue')
      .update({
        resolved: true,
        resolution: 'created_new',
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq('id', item.id);

    toast({ title: "Created as new customer" });
    fetchQueue();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading merge queue...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Customer Conflicts
            </CardTitle>
            <CardDescription>
              Resolve conflicting customer information from different sources
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg">
            {items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium">No conflicts to resolve!</p>
            <p className="text-sm text-muted-foreground">
              All customer data is clean and unified.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {item.conflict_type === 'name_mismatch' && 'Name Conflict'}
                    {item.conflict_type === 'email_mismatch' && 'Email Conflict'}
                    {item.conflict_type === 'both_mismatch' && 'Multiple Conflicts'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    from {item.source}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs font-medium text-muted-foreground mb-2">EXISTING</p>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{item.existing_customer?.full_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.existing_customer?.email || 'No email'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.existing_customer?.phone_e164}
                    </p>
                  </div>

                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="p-3 rounded-lg bg-primary/10">
                    <p className="text-xs font-medium text-primary mb-2">INCOMING</p>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{item.incoming_name || 'Not provided'}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.incoming_email || 'No email'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.incoming_phone_e164}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleMerge(item)}
                    className="gap-1"
                  >
                    <GitMerge className="h-3 w-3" />
                    Merge
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleKeepExisting(item)}
                  >
                    Keep Existing
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleCreateNew(item)}
                  >
                    Create New
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
