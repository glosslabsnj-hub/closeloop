import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSetupRequests, TARGET_SYSTEMS, SYNC_TYPES } from "@/hooks/useSetupRequests";
import { Headset, CheckCircle2, Loader2 } from "lucide-react";

interface ConciergeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConciergeRequestDialog({ open, onOpenChange }: ConciergeRequestDialogProps) {
  const { tenant, user } = useAuth();
  const { createRequest, requests } = useSetupRequests();
  const businessMode = (tenant?.business_mode as keyof typeof TARGET_SYSTEMS) || "general";
  
  const [step, setStep] = useState<"form" | "success">("form");
  const [targetSystem, setTargetSystem] = useState("");
  const [targetSystemOther, setTargetSystemOther] = useState("");
  const [syncTypes, setSyncTypes] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [credentialsNotes, setCredentialsNotes] = useState("");

  const systems = TARGET_SYSTEMS[businessMode] || TARGET_SYSTEMS.general;

  const handleSubmit = async () => {
    await createRequest.mutateAsync({
      target_system: targetSystem,
      target_system_other: targetSystem === "other" ? targetSystemOther : undefined,
      sync_type: syncTypes,
      contact_email: contactEmail || undefined,
      contact_phone: contactPhone || undefined,
      notes: notes || undefined,
      credentials_notes: credentialsNotes || undefined,
    });
    setStep("success");
  };

  const handleClose = () => {
    setStep("form");
    setTargetSystem("");
    setTargetSystemOther("");
    setSyncTypes([]);
    setNotes("");
    setCredentialsNotes("");
    onOpenChange(false);
  };

  const toggleSyncType = (value: string) => {
    setSyncTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  // Check if there's already a pending request
  const hasPendingRequest = requests.some(r => r.status === "new" || r.status === "in_progress");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === "form" ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Headset className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Have an expert set this up</DialogTitle>
                  <DialogDescription>
                    Tell us what you use and we'll configure it for you within 24 hours.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {hasPendingRequest && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  You already have a setup request in progress
                </p>
                <p className="text-muted-foreground">
                  Our team is working on it. You can submit another request if needed.
                </p>
              </div>
            )}

            <div className="space-y-4 py-2">
              {/* Target System */}
              <div className="space-y-2">
                <Label>What system do you use?</Label>
                <Select value={targetSystem} onValueChange={setTargetSystem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your system..." />
                  </SelectTrigger>
                  <SelectContent>
                    {systems.map((system) => (
                      <SelectItem key={system.value} value={system.value}>
                        {system.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {targetSystem === "other" && (
                  <Input
                    placeholder="Please specify..."
                    value={targetSystemOther}
                    onChange={(e) => setTargetSystemOther(e.target.value)}
                  />
                )}
              </div>

              {/* Sync Types */}
              <div className="space-y-2">
                <Label>What do you want to sync?</Label>
                <div className="space-y-2">
                  {SYNC_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={syncTypes.includes(type.value)}
                        onCheckedChange={() => toggleSyncType(type.value)}
                      />
                      <label
                        htmlFor={type.value}
                        className="text-sm cursor-pointer"
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Credentials Notes */}
              <div className="space-y-2">
                <Label htmlFor="credentials">How should we access your account?</Label>
                <Textarea
                  id="credentials"
                  placeholder="e.g., 'I'll send a team invite to support@closeloop.com' or 'I'll share API keys via email'"
                  value={credentialsNotes}
                  onChange={(e) => setCredentialsNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Anything else we should know?</Label>
                <Textarea
                  id="notes"
                  placeholder="Any specific requirements or preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!targetSystem || syncTypes.length === 0 || createRequest.isPending}
              >
                {createRequest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <DialogTitle className="mb-2">Request Submitted!</DialogTitle>
              <DialogDescription>
                Our team will reach out to {contactEmail || "you"} within 24 hours to complete your setup.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
