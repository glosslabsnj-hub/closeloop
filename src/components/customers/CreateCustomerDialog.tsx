import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/hooks/useCustomers";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCustomerDialog({ open, onOpenChange }: CreateCustomerDialogProps) {
  const { createCustomer } = useCustomers();
  const { tenant } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [dupWarning, setDupWarning] = useState("");

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setServiceAddress("");
    setNotes("");
    setDupWarning("");
  };

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (raw.startsWith("+")) return raw;
    return raw;
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }

    const phoneE164 = normalizePhone(phone.trim());

    // Check for duplicate
    if (tenant?.id) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("tenant_id", tenant.id)
        .eq("phone_e164", phoneE164)
        .maybeSingle();

      if (existing) {
        setDupWarning(`Customer "${existing.full_name}" already exists with this phone number.`);
        return;
      }
    }

    try {
      await createCustomer.mutateAsync({
        full_name: fullName.trim(),
        phone_e164: phoneE164,
        phone_raw: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        service_address: serviceAddress.trim() || undefined,
        source: "manual",
      });
      toast.success("Customer created");
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Failed to create customer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>
            Create a new customer record
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cust-name">Full Name *</Label>
            <Input
              id="cust-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cust-phone">Phone *</Label>
            <Input
              id="cust-phone"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setDupWarning(""); }}
              placeholder="+1 (555) 123-4567"
            />
            <p className="text-xs text-muted-foreground">
              Will be stored in E.164 format (e.g. +15551234567)
            </p>
            {dupWarning && (
              <p className="text-sm text-destructive">{dupWarning}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cust-email">Email</Label>
            <Input
              id="cust-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cust-address">Address</Label>
            <Input
              id="cust-address"
              value={serviceAddress}
              onChange={(e) => setServiceAddress(e.target.value)}
              placeholder="123 Main St, City, State"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cust-notes">Notes</Label>
            <Textarea
              id="cust-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createCustomer.isPending || !fullName.trim() || !phone.trim()}
          >
            {createCustomer.isPending ? "Creating..." : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
