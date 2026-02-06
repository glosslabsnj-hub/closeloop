import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Star,
  Pencil,
  Save,
  X,
  Clock,
  MessageSquare,
  CreditCard,
  Loader2,
} from "lucide-react";
import { Customer, useCustomers } from "@/hooks/useCustomers";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { toast } from "sonner";

interface CustomerDetailSheetProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
}: CustomerDetailSheetProps) {
  const { updateCustomer } = useCustomers();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone_e164: "",
    email: "",
    notes: "",
    tags: [] as string[],
  });

  // Sync form data when customer changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && customer) {
      setFormData({
        full_name: customer.full_name || "",
        phone_e164: customer.phone_e164 || "",
        email: customer.email || "",
        notes: customer.notes || "",
        tags: customer.tags || [],
      });
      setIsEditing(false);
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!customer) return;

    setIsSaving(true);
    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        full_name: formData.full_name,
        phone_e164: formData.phone_e164,
        email: formData.email || undefined,
        notes: formData.notes || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      });
      setIsEditing(false);
      toast.success("Customer updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update customer");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVIP = () => {
    const hasVIP = formData.tags.includes("vip");
    if (hasVIP) {
      setFormData((prev) => ({
        ...prev,
        tags: prev.tags.filter((t) => t !== "vip"),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, "vip"],
      }));
    }
  };

  if (!customer) return null;

  const isVIP = formData.tags.includes("vip");

  // Mock interaction history
  const mockHistory = [
    {
      type: "call",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      summary: "Inquired about appointment availability",
    },
    {
      type: "booking",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      summary: "Completed service booking",
    },
    {
      type: "call",
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      summary: "Asked about pricing",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              {isEditing ? (
                <Input
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                  className="h-8 text-lg font-semibold"
                />
              ) : (
                customer.full_name || "Unnamed Customer"
              )}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <SheetDescription>
            Customer since {format(parseISO(customer.created_at), "MMMM yyyy")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant={isVIP ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={toggleVIP}
            >
              <Star className={`h-4 w-4 ${isVIP ? "fill-current" : ""}`} />
              {isVIP ? "VIP" : "Mark as VIP"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Phone className="h-4 w-4" />
              Call
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Contact Information</h4>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Input
                    value={formData.phone_e164}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone_e164: e.target.value }))
                    }
                    className="h-8"
                  />
                ) : (
                  <span>{customer.phone_e164}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Input
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Add email..."
                    className="h-8"
                  />
                ) : (
                  <span className={!customer.email ? "text-muted-foreground" : ""}>
                    {customer.email || "No email"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Notes</h4>
            {isEditing ? (
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Add notes about this customer..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {customer.notes || "No notes yet"}
              </p>
            )}
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {formData.tags.length > 0 ? (
                formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    {isEditing && (
                      <button
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            tags: prev.tags.filter((t) => t !== tag),
                          }))
                        }
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    )}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No tags</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Interaction History */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Activity</h4>
            <div className="space-y-3">
              {mockHistory.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {item.type === "call" ? (
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(item.date, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-semibold">12</p>
                <p className="text-xs text-muted-foreground">Total Visits</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-semibold">$890</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-semibold">$74</p>
                <p className="text-xs text-muted-foreground">Avg. Ticket</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
