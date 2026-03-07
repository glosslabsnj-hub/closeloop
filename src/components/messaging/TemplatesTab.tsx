import { useState } from "react";
import { useMessagingTemplates } from "@/hooks/useMessagingTemplates";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileText, Lock } from "lucide-react";

const CATEGORIES = [
  { value: "booking_confirmation", label: "Booking Confirmation" },
  { value: "appointment_reminder", label: "Appointment Reminder" },
  { value: "post_service_followup", label: "Post-Service Follow-Up" },
  { value: "review_request", label: "Review Request" },
  { value: "re_engagement", label: "Re-Engagement" },
  { value: "promotion", label: "Promotion" },
  { value: "custom", label: "Custom" },
];

const AVAILABLE_VARIABLES = [
  "first_name", "service", "business_name", "date", "time", "review_link",
];

interface TemplateFormData {
  name: string;
  body: string;
  category: string;
  variables: string[];
}

export function TemplatesTab() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useMessagingTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormData>({
    name: "",
    body: "",
    category: "custom",
    variables: [],
  });

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", body: "", category: "custom", variables: [] });
    setDialogOpen(true);
  }

  function openEdit(template: { id: string; name: string; body: string; category: string; variables: string[] | null }) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      body: template.body,
      category: template.category,
      variables: template.variables || [],
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.body.trim()) return;
    if (editingId) {
      updateTemplate.mutate({ id: editingId, ...form });
    } else {
      createTemplate.mutate(form);
    }
    setDialogOpen(false);
  }

  function insertVariable(variable: string) {
    setForm((prev) => ({
      ...prev,
      body: prev.body + `{{${variable}}}`,
      variables: prev.variables.includes(variable) ? prev.variables : [...prev.variables, variable],
    }));
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading templates...</div>;
  }

  const categoryLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <SectionCard>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No templates yet. Create one to get started.</p>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <SectionCard key={template.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{template.name}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {categoryLabel(template.category)}
                    </Badge>
                    {template.is_system && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Lock className="h-2.5 w-2.5 mr-0.5" />
                        System
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                    {template.body}
                  </p>
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {template.variables.map((v) => (
                        <Badge key={v} variant="outline" className="text-[9px] font-mono">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(template)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!template.is_system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate.mutate(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Spring Promo"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Message Body</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Hi {{first_name}}, your appointment is confirmed..."
                rows={4}
                className="mt-1 font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex gap-1 flex-wrap">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <Button
                      key={v}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] font-mono"
                      onClick={() => insertVariable(v)}
                    >
                      {`{{${v}}}`}
                    </Button>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {form.body.length} chars
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.body.trim()}>
              {editingId ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
