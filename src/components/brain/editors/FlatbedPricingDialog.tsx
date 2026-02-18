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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Truck } from "lucide-react";

interface FlatbedPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  basePrice: number | null;
  onConfirm: (createSeparate: boolean, flatbedPrice?: number, wheelLiftPrice?: number) => void;
}

export function FlatbedPricingDialog({
  open,
  onOpenChange,
  serviceName,
  basePrice,
  onConfirm,
}: FlatbedPricingDialogProps) {
  const [createSeparate, setCreateSeparate] = useState<boolean | null>(null);
  const [wheelLiftPrice, setWheelLiftPrice] = useState<number>(basePrice || 150);
  const [flatbedPrice, setFlatbedPrice] = useState<number>((basePrice || 150) + 25);

  const handleConfirm = () => {
    if (createSeparate === null) return;

    if (createSeparate) {
      onConfirm(true, flatbedPrice, wheelLiftPrice);
    } else {
      onConfirm(false);
    }

    onOpenChange(false);
    setCreateSeparate(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setCreateSeparate(null);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <AlertDialogTitle>Flatbed vs Wheel-Lift Pricing</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Do you charge different prices for flatbed and wheel-lift towing?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {createSeparate === null && (
            <div className="space-y-3">
              <button
                onClick={() => setCreateSeparate(true)}
                className="w-full p-4 text-left border-2 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="font-medium mb-1">Yes, different prices</div>
                <div className="text-sm text-muted-foreground">
                  Create two services: "{serviceName} - Wheel Lift" and "{serviceName} - Flatbed"
                </div>
              </button>

              <button
                onClick={() => setCreateSeparate(false)}
                className="w-full p-4 text-left border-2 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="font-medium mb-1">No, same price</div>
                <div className="text-sm text-muted-foreground">
                  Create one service: "{serviceName}"
                </div>
              </button>
            </div>
          )}

          {createSeparate === true && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Set your prices for each service type:
              </p>

              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  {serviceName} - Wheel Lift
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    value={wheelLiftPrice}
                    onChange={(e) => setWheelLiftPrice(parseFloat(e.target.value) || 0)}
                    className="pl-7"
                    placeholder="150"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Standard towing method for most rear-wheel drive vehicles
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  {serviceName} - Flatbed
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    value={flatbedPrice}
                    onChange={(e) => setFlatbedPrice(parseFloat(e.target.value) || 0)}
                    className="pl-7"
                    placeholder="175"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended for AWD, luxury, exotic, and modified vehicles
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex gap-2">
                  <div className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</div>
                  <div className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Why separate services?</strong>
                    <br />
                    Your AI agent will automatically recommend flatbed for luxury/AWD vehicles and quote the correct price. This prevents confusion and reduces price objections.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCreateSeparate(null)}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                ← Back to options
              </button>
            </div>
          )}

          {createSeparate === false && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                One service will be created: <strong>{serviceName}</strong>
              </p>
              <button
                onClick={() => setCreateSeparate(null)}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                ← Back to options
              </button>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={createSeparate === null}>
            {createSeparate === true ? "Create Both Services" : createSeparate === false ? "Create Service" : "Choose an option"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
