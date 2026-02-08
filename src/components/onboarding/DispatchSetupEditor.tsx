import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Clock, Users, Plus, X, Warehouse, DollarSign } from "lucide-react";
import { useState } from "react";

export interface DispatchSetupData {
  serviceRadius: number;
  estimatedResponseMinutes: number;
  requiresDropoff: boolean;
  jobTypes: string[];
  crews: string[];
  vehicles: string[];
  dispatchNotes: string;
  // Impound lot fields (for towing businesses)
  hasImpoundLot?: boolean;
  impoundLotAddress?: string;
  impoundBaseFee?: number;
  impoundDailyStorageFee?: number;
  impoundAdminFee?: number;
  impoundGateFee?: number;
  impoundReleaseNotes?: string;
}

interface DispatchSetupEditorProps {
  data: DispatchSetupData;
  onChange: (data: DispatchSetupData) => void;
  showImpound?: boolean;
}

export function DispatchSetupEditor({ data, onChange, showImpound = false }: DispatchSetupEditorProps) {
  const [newJobType, setNewJobType] = useState("");
  const [newCrew, setNewCrew] = useState("");
  const [newVehicle, setNewVehicle] = useState("");

  const update = (field: keyof DispatchSetupData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const addItem = (field: "jobTypes" | "crews" | "vehicles", value: string, setValue: (v: string) => void) => {
    if (value.trim()) {
      update(field, [...(data[field] || []), value.trim()]);
      setValue("");
    }
  };

  const removeItem = (field: "jobTypes" | "crews" | "vehicles", index: number) => {
    const current = data[field] || [];
    update(field, current.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Service Area */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Service Area & Response
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Radius (miles)</Label>
              <Input
                type="number"
                value={data.serviceRadius}
                onChange={(e) => update("serviceRadius", parseInt(e.target.value) || 25)}
                min={1}
                max={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Est. Response Time (minutes)</Label>
              <Input
                type="number"
                value={data.estimatedResponseMinutes}
                onChange={(e) => update("estimatedResponseMinutes", parseInt(e.target.value) || 30)}
                min={5}
                max={120}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Jobs Require Dropoff Location</Label>
              <p className="text-sm text-muted-foreground">
                E.g., towing to a specific destination
              </p>
            </div>
            <Switch
              checked={data.requiresDropoff}
              onCheckedChange={(v) => update("requiresDropoff", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Impound Lot Configuration (only for towing/impound businesses) */}
      {showImpound && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-amber-600" />
              Impound Lot Configuration
            </CardTitle>
            <CardDescription>
              Configure your impound lot so the AI can answer questions about fees and vehicle release.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>I Have an Impound Lot</Label>
                <p className="text-sm text-muted-foreground">
                  Enable if you store impounded vehicles
                </p>
              </div>
              <Switch
                checked={data.hasImpoundLot || false}
                onCheckedChange={(v) => update("hasImpoundLot", v)}
              />
            </div>

            {data.hasImpoundLot && (
              <>
                <div className="space-y-2">
                  <Label>Impound Lot Address</Label>
                  <Input
                    placeholder="123 Storage Lane, City, State ZIP"
                    value={data.impoundLotAddress || ""}
                    onChange={(e) => update("impoundLotAddress", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Where customers can pick up their vehicles
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Base Tow Fee ($)
                    </Label>
                    <Input
                      type="number"
                      placeholder="150"
                      value={data.impoundBaseFee || ""}
                      onChange={(e) => update("impoundBaseFee", parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Daily Storage ($)
                    </Label>
                    <Input
                      type="number"
                      placeholder="35"
                      value={data.impoundDailyStorageFee || ""}
                      onChange={(e) => update("impoundDailyStorageFee", parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Admin Fee ($)
                    </Label>
                    <Input
                      type="number"
                      placeholder="75"
                      value={data.impoundAdminFee || ""}
                      onChange={(e) => update("impoundAdminFee", parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Gate Fee ($)
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={data.impoundGateFee || ""}
                      onChange={(e) => update("impoundGateFee", parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Release Requirements & Notes</Label>
                  <Textarea
                    placeholder="E.g., 'Valid ID and registration required. We accept cash, credit, and debit. Hours: Mon-Fri 8am-6pm, Sat 9am-2pm.'"
                    value={data.impoundReleaseNotes || ""}
                    onChange={(e) => update("impoundReleaseNotes", e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job Types */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Job Types
          </h4>
          <p className="text-sm text-muted-foreground">
            What types of jobs do you handle?
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="E.g., Flat tire, Lockout, Tow"
              value={newJobType}
              onChange={(e) => setNewJobType(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addItem("jobTypes", newJobType, setNewJobType)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => addItem("jobTypes", newJobType, setNewJobType)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(data.jobTypes || []).map((type, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm"
              >
                {type}
                <button
                  type="button"
                  onClick={() => removeItem("jobTypes", i)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Crews */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Crews / Technicians
          </h4>
          <p className="text-sm text-muted-foreground">
            Who can be assigned to jobs?
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="E.g., Team Alpha, John D."
              value={newCrew}
              onChange={(e) => setNewCrew(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addItem("crews", newCrew, setNewCrew)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => addItem("crews", newCrew, setNewCrew)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(data.crews || []).map((crew, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm"
              >
                {crew}
                <button
                  type="button"
                  onClick={() => removeItem("crews", i)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vehicles */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Vehicles
          </h4>
          <p className="text-sm text-muted-foreground">
            What vehicles can be dispatched?
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="E.g., Truck #1, Van A"
              value={newVehicle}
              onChange={(e) => setNewVehicle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addItem("vehicles", newVehicle, setNewVehicle)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => addItem("vehicles", newVehicle, setNewVehicle)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(data.vehicles || []).map((vehicle, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm"
              >
                {vehicle}
                <button
                  type="button"
                  onClick={() => removeItem("vehicles", i)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Dispatch Notes for AI
        </Label>
        <Textarea
          placeholder="E.g., 'We prioritize AAA members. Standard tow rate is $75 base + $3/mile. We don't service motorcycles.'"
          value={data.dispatchNotes}
          onChange={(e) => update("dispatchNotes", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
