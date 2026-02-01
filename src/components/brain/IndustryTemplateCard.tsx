/**
 * Industry Template Card
 *
 * Allows users to select an industry and apply pre-configured templates
 * to quickly set up their Business Brain.
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import { getTemplateOptions, getTemplate } from "@/lib/industryTemplates";
import { industryOptions, type ExtendedIndustryType } from "@/data/industryTemplates";

export function IndustryTemplateCard() {
  const { tenant } = useAuth();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(
    tenant?.industry || ""
  );

  const currentIndustry = tenant?.industry as ExtendedIndustryType | undefined;
  const industryLabel = currentIndustry
    ? industryOptions.find((i) => i.value === currentIndustry)?.label || currentIndustry
    : null;

  // Get available templates for the dropdown
  const templateOptions = getTemplateOptions();

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
            Industry & Templates
          </CardTitle>
          <CardDescription>
            Select your industry to get pre-configured services, FAQs, and policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Industry Display */}
          {currentIndustry && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Current industry:</span>
              <Badge variant="secondary">
                {industryOptions.find((i) => i.value === currentIndustry)?.icon}{" "}
                {industryLabel}
              </Badge>
            </div>
          )}

          {/* Industry Selector */}
          <div className="space-y-2">
            <Label>Select Industry Template</Label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an industry..." />
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
              <p className="text-xs text-muted-foreground italic">
                Mode: {selectedTemplate.business_mode}
              </p>
            </div>
          )}

          {/* Apply Button */}
          <Button
            onClick={handleApplyTemplate}
            disabled={!selectedIndustry || !selectedTemplate}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Apply Industry Template
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
