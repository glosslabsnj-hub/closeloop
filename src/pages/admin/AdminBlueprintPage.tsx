import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { BlueprintHeader } from "@/components/blueprint/BlueprintHeader";
import { BlueprintTableOfContents } from "@/components/blueprint/BlueprintTableOfContents";
import { PlatformOverview } from "@/components/blueprint/sections/PlatformOverview";
import { UserRolesAccess } from "@/components/blueprint/sections/UserRolesAccess";
import { GoldenPathSection } from "@/components/blueprint/sections/GoldenPathSection";
import { PagesFeatures } from "@/components/blueprint/sections/PagesFeatures";
import { BusinessBrainSection } from "@/components/blueprint/sections/BusinessBrainSection";
import { DatabaseSchemaSection } from "@/components/blueprint/sections/DatabaseSchemaSection";
import { EdgeFunctionsSection } from "@/components/blueprint/sections/EdgeFunctionsSection";
import { IntegrationsAutomation } from "@/components/blueprint/sections/IntegrationsAutomation";
import { AIVoiceSection } from "@/components/blueprint/sections/AIVoiceSection";
import { IndustrySupport } from "@/components/blueprint/sections/IndustrySupport";
import { HooksStateSection } from "@/components/blueprint/sections/HooksStateSection";
import { PricingSection } from "@/components/blueprint/sections/PricingSection";
import { SecurityRLSSection } from "@/components/blueprint/sections/SecurityRLSSection";

export default function AdminBlueprintPage() {
  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          /* Hide everything except the document body */
          body > * { visibility: hidden; }
          .blueprint-print-area, .blueprint-print-area * { visibility: visible; }
          .blueprint-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .blueprint-no-print { display: none !important; }

          /* Clean black-on-white */
          body { background: white !important; }
          .blueprint-print-area { color: black !important; background: white !important; }

          /* Page breaks between sections */
          .blueprint-section {
            page-break-before: always;
            page-break-inside: avoid;
          }
          .blueprint-section:first-of-type { page-break-before: avoid; }

          /* Keep tables together */
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }

          /* Sensible margins */
          @page { margin: 1.5cm 2cm; }

          /* Remove border colors for clean printing */
          .border, [class*="border-"] {
            border-color: #ccc !important;
          }
        }
      `}</style>

      <div className="flex">
        {/* Sticky TOC Sidebar */}
        <aside className="blueprint-no-print hidden lg:block w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r bg-background p-4">
          <BlueprintTableOfContents />
        </aside>

        {/* Document Body */}
        <div className="flex-1 min-w-0">
          {/* Action bar */}
          <div className="blueprint-no-print sticky top-14 z-10 bg-background/95 backdrop-blur border-b px-4 md:px-6 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Platform Blueprint</h1>
              <p className="text-xs text-muted-foreground">Auto-generated reference document</p>
            </div>
            <Button onClick={() => window.print()} size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>

          {/* Printable Document */}
          <div className="blueprint-print-area p-4 md:p-6 max-w-5xl mx-auto space-y-12">
            <BlueprintHeader />
            <PlatformOverview />
            <UserRolesAccess />
            <GoldenPathSection />
            <PagesFeatures />
            <BusinessBrainSection />
            <DatabaseSchemaSection />
            <EdgeFunctionsSection />
            <IntegrationsAutomation />
            <AIVoiceSection />
            <IndustrySupport />
            <HooksStateSection />
            <PricingSection />
            <SecurityRLSSection />

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground py-8 border-t print:text-gray-500 print:border-black">
              <p>End of Platform Blueprint</p>
              <p className="text-xs mt-1">
                Generated from live codebase. Data sources: brainSectionRegistry.ts, industryCatalog.ts,
                pricing.ts, popularIntegrations.ts, automationTemplates.ts, blueprintData.ts
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
