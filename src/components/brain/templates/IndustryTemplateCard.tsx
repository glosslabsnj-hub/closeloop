/**
 * Industry Template Card
 *
 * Allows users to select an industry and apply pre-configured templates
 * to quickly set up their Business Brain.
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Building2 } from "lucide-react";
import { ApplyTemplateModal } from "./ApplyTemplateModal";
import { getTemplateOptionsForMode, getTemplate } from "@/lib/industryTemplates";

// Format business mode for display
const businessModeLabels: Record<string, string> = {
  service: "Service & Booking",
  food: "Food & Restaurant",
  medical: "Medical",
  dispatch: "Dispatch & Towing",
  general: "General",
};

export function IndustryTemplateCard() {
  const { _tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");

  // Get formatted business mode label
  const businessModeLabel = businessModeLabels[businessMode] || businessMode;

  // Get templates filtered by the user's business mode
  const templateOptions = getTemplateOptionsForMode(businessMode);

  // Check if template exists for selected industry
  const selectedTemplate = selectedIndustry ? getTemplate(selectedIndustry) : null;

  const handleApplyTemplate = () => {
    if (selectedIndustry) {
      setShowTemplateModal(true);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Quick Start Templates
          </CardTitle>
          <CardDescription>
            Apply pre-built services, FAQs, and policies to get started quickly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Business Type Display */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Your business type:</span>
            <Badge variant="secondary">
              {businessModeLabel}
            </Badge>
          </div>

          {/* Template Selector */}
          <div className="space-y-2">
            <Label>Apply a business template</Label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">No templates available for your business type.</p>
            )}
          </div>

          {/* Template Preview Info */}
          {selectedTemplate && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {selectedTemplate.icon} {selectedTemplate.name} Template
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                This template includes:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">{selectedTemplate.defaults.services.length}</span>{" "}
                  services
                </div>
                <div>
                  <span className="font-medium">{selectedTemplate.defaults.faqs.length}</span>{" "}
                  FAQs
                </div>
                <div>
                  <span className="font-medium">
                    {selectedTemplate.defaults.objections.length}
                  </span>{" "}
                  objection handlers
                </div>
                <div>
                  <span className="font-medium">
                    {selectedTemplate.defaults.policies.length}
                  </span>{" "}
                  policies
                </div>
              </div>
            </div>
          )}

          {/* Apply Button */}
          <Button
            onClick={handleApplyTemplate}
            disabled={!selectedIndustry || !selectedTemplate}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Apply Template
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Templates provide starting defaults. Everything remains fully editable.
          </p>
        </CardContent>
      </Card>

      {/* Apply Template Modal */}
      <ApplyTemplateModal
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
        industryKey={selectedIndustry}
        onApplied={() => {
          // Could refresh page or show success state
        }}
      />
    </>
  );
}
