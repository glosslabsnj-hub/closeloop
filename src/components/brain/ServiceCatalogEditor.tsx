import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Clock, DollarSign, Loader2 } from "lucide-react";
import { createService, updateService, deleteService } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PriceType = "fixed" | "starting_at" | "quote_only";

interface ServiceFormData {
  name: string;
  description: string;
  duration_minutes: number;
  price_type: PriceType;
  price_amount: number | null;
  deposit_amount: number | null;
  deposit_required: boolean;
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  duration_minutes: 60,
  price_type: "fixed",
  price_amount: null,
  deposit_amount: null,
  deposit_required: false,
};

export function ServiceCatalogEditor() {
  const { tenant } = useAuth();
  const { services, isLoading } = useServices();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [deletingService, setDeletingService] = useState<any | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      duration_minutes: service.duration_minutes,
      price_type: service.price_type,
      price_amount: service.price_amount ? Number(service.price_amount) : null,
      deposit_amount: service.deposit_amount ? Number(service.deposit_amount) : null,
      deposit_required: service.deposit_required || false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant?.id || !formData.name.trim()) return;

    setIsSaving(true);
    try {
      if (editingService) {
        // Update existing service
        await updateService(editingService.id, tenant.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          duration_minutes: formData.duration_minutes,
          price_type: formData.price_type,
          price_amount: formData.price_amount,
          deposit_amount: formData.deposit_amount,
          deposit_required: formData.deposit_required,
        });
        toast.success("Service updated successfully");
      } else {
        // Create new service
        await createService(tenant.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          duration_minutes: formData.duration_minutes,
          price_type: formData.price_type,
          price_amount: formData.price_amount,
          deposit_amount: formData.deposit_amount,
          deposit_required: formData.deposit_required,
        });
        toast.success("Service created successfully");
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });

      setDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error: any) {
      toast.error(error.message || "Failed to save service");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenant?.id || !deletingService) return;

    try {
      await deleteService(deletingService.id, tenant.id);
      toast.success("Service deleted successfully");

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });

      setDeleteDialogOpen(false);
      setDeletingService(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete service");
    }
  };

  const handleToggleActive = async (service: any) => {
    if (!tenant?.id) return;

    try {
      await updateService(service.id, tenant.id, {
        is_active: !service.is_active,
      });
      toast.success(service.is_active ? "Service deactivated" : "Service activated");

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update service");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading services...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Service Catalog</h3>
          <p className="text-sm text-muted-foreground">
            Manage your services, pricing, and duration
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Services Grid */}
      {services && services.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    {service.description && (
                      <CardDescription className="mt-1">{service.description}</CardDescription>
                    )}
                  </div>
                  {!service.is_active && (
                    <Badge variant="outline" className="ml-2">Inactive</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {service.price_type === "quote_only"
                        ? "Quote Required"
                        : service.price_amount
                        ? `${service.price_type === "starting_at" ? "From " : ""}$${service.price_amount}`
                        : "Not Set"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(service.duration_minutes)}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(service)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(service)}
                    >
                      {service.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingService(service);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <DollarSign className="h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold">No services yet</h3>
              <p className="text-sm text-muted-foreground">
                Add your first service to start managing your catalog
              </p>
              <Button onClick={openCreateDialog} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>Configure your service details and pricing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Haircut, Oil Change, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What's included..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })
                  }
                  placeholder="60"
                />
              </div>
              <div className="space-y-2">
                <Label>Price Type</Label>
                <Select
                  value={formData.price_type}
                  onValueChange={(v) => setFormData({ ...formData, price_type: v as PriceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="starting_at">Starting At</SelectItem>
                    <SelectItem value="quote_only">Quote Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_amount ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_amount: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="150.00"
                disabled={formData.price_type === "quote_only"}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.deposit_required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, deposit_required: checked })
                }
              />
              <Label>Require deposit</Label>
            </div>
            {formData.deposit_required && (
              <div className="space-y-2">
                <Label>Deposit Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.deposit_amount ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deposit_amount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="50.00"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingService ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingService?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
