import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Copy, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CarrierInstructionsProps {
  forwardingNumber: string;
}

const carriers = [
  {
    id: "verizon",
    name: "Verizon",
    steps: [
      "Open your Phone app and go to Keypad",
      "Dial *72 followed by your Flux Receptionist number",
      "Press Call and wait for the confirmation tone",
      "To disable: Dial *73 and press Call",
    ],
  },
  {
    id: "att",
    name: "AT&T",
    steps: [
      "Open your Phone app and go to Keypad",
      "Dial *21* followed by your Flux Receptionist number, then #",
      "Press Call and wait for confirmation",
      "To disable: Dial #21# and press Call",
    ],
  },
  {
    id: "tmobile",
    name: "T-Mobile",
    steps: [
      "Open your Phone app and go to Keypad",
      "Dial **21* followed by your Flux Receptionist number, then #",
      "Press Call and wait for confirmation",
      "To disable: Dial ##21# and press Call",
    ],
  },
  {
    id: "sprint",
    name: "Sprint",
    steps: [
      "Open your Phone app and go to Keypad",
      "Dial *72 followed by your Flux Receptionist number",
      "Press Call and wait for the confirmation tone",
      "To disable: Dial *720 and press Call",
    ],
  },
  {
    id: "iphone",
    name: "iPhone (All Carriers)",
    steps: [
      "Open Settings → Phone → Call Forwarding",
      "Toggle Call Forwarding ON",
      "Tap 'Forward To' and enter your Flux Receptionist number",
      "The call forwarding icon will appear in your status bar",
    ],
  },
  {
    id: "android",
    name: "Android (Generic)",
    steps: [
      "Open Phone app → Menu (⋮) → Settings",
      "Tap Calling accounts or Supplementary services",
      "Select Call forwarding → Forward when busy/unanswered",
      "Enter your Flux Receptionist number and enable",
    ],
  },
];

export function CarrierInstructions({ forwardingNumber }: CarrierInstructionsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyNumber = () => {
    navigator.clipboard.writeText(forwardingNumber.replace(/\D/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Forwarding number copied to clipboard" });
  };

  return (
    <div className="space-y-4">
      {/* Forwarding Number Display */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Forward calls to:</p>
          <p className="text-base sm:text-xl font-mono font-bold text-primary break-all">{forwardingNumber}</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyNumber} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {/* Carrier-specific instructions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span>Select your phone carrier for step-by-step instructions:</span>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {carriers.map((carrier) => (
            <AccordionItem key={carrier.id} value={carrier.id}>
              <AccordionTrigger className="hover:no-underline">
                <span className="font-medium">{carrier.name}</span>
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-3 text-sm">
                  {carrier.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Badge variant="outline" className="shrink-0 mt-0.5 h-6 w-6 flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
