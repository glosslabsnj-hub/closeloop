import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Loader2, ShieldQuestion } from "lucide-react";
import { createObjectionResponse, updateObjectionResponse, deleteObjectionResponse } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ObjectionResponse {
  id: string;
  tenant_id: string;
  objection: string;
  response: string;
  priority_weight?: number;
  created_at?: string;
}

export function BusinessObjectionEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [objections, setObjections] = useState<ObjectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newObjection, setNewObjection] = useState('');
  const [newResponse, setNewResponse] = useState('');

  useEffect(() => {
    if (tenant?.id) {
      fetchObjections();
    }
  }, [tenant?.id]);

  const fetchObjections = async () => {
    if (!tenant?.id) return;

    const { data, error } = await supabase
      .from('objection_responses')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('priority_weight', { ascending: false });

    if (error) {
      console.error('Failed to fetch objections:', error);
    } else {
      setObjections(data || []);
    }
    setLoading(false);
  };

  const addObjection = async () => {
    if (!tenant?.id || !newObjection.trim() || !newResponse.trim()) return;

    setSaving(true);
    try {
      await createObjectionResponse(tenant.id, {
        objection: newObjection,
        response: newResponse,
        priority_weight: objections.length,
      });

      toast.success("Objection response added successfully");
      setNewObjection('');
      setNewResponse('');
      fetchObjections();
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to add objection response");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateObjection = async (id: string, objection: string, response: string) => {
    if (!tenant?.id) return;

    try {
      await updateObjectionResponse(id, tenant.id, { objection, response });
      toast.success("Objection response updated successfully");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update objection response");
    }
  };

  const handleDeleteObjection = async (id: string) => {
    if (!tenant?.id) return;

    try {
      await deleteObjectionResponse(id, tenant.id);
      setObjections(objections.filter(o => o.id !== id));
      toast.success("Objection response deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete objection response");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading objection responses...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldQuestion className="h-5 w-5" />
              Handling Customer Concerns
            </CardTitle>
            <CardDescription>
              When customers have doubts or push back, here's how your AI responds
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new objection */}
        <div className="p-4 border rounded-lg bg-secondary/30 space-y-3">
          <p className="font-medium text-sm">Add New Response</p>
          <Input
            placeholder="When customer says: 'That's too expensive'"
            value={newObjection}
            onChange={(e) => setNewObjection(e.target.value)}
          />
          <Textarea
            placeholder="AI responds with..."
            value={newResponse}
            onChange={(e) => setNewResponse(e.target.value)}
            rows={3}
          />
          <Button
            size="sm"
            onClick={addObjection}
            disabled={saving || !newObjection.trim() || !newResponse.trim()}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Response
          </Button>
        </div>

        {/* Existing objections */}
        {objections.length === 0 ? (
          <div className="text-center py-6">
            <ShieldQuestion className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">No responses configured</p>
            <p className="text-sm text-muted-foreground">
              Add responses for common customer concerns like pricing or timing
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {objections.map((objection) => (
              <ObjectionItem
                key={objection.id}
                objection={objection}
                onUpdate={handleUpdateObjection}
                onDelete={handleDeleteObjection}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ObjectionItem({
  objection,
  onUpdate,
  onDelete
}: {
  objection: ObjectionResponse;
  onUpdate: (id: string, objection: string, response: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [objectionText, setObjectionText] = useState(objection.objection);
  const [responseText, setResponseText] = useState(objection.response);

  const handleSave = () => {
    onUpdate(objection.id, objectionText, responseText);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-4 rounded-lg border space-y-2">
        <Input
          value={objectionText}
          onChange={(e) => setObjectionText(e.target.value)}
        />
        <Textarea
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          rows={3}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Save className="h-3 w-3" />
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-start gap-3">
        <ShieldQuestion className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <div className="flex-1">
          <p
            className="font-medium cursor-pointer hover:text-primary"
            onClick={() => setEditing(true)}
          >
            {objection.objection}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{objection.response}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={() => onDelete(objection.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
