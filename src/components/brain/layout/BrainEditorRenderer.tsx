/**
 * BrainEditorRenderer - Centralized switch for rendering editor components
 *
 * Maps each sidebar item ID to the correct editor component.
 * Extracted from the inline JSX in BusinessBrainPage.
 *
 * All editors remain unchanged — this only wraps them.
 */

import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { Capabilities } from "@/hooks/useCapabilities";

// Section editors
import { PricingRulesEditor } from "@/components/settings/PricingRulesEditor";
import { BusynessRulesEditor } from "@/components/settings/BusynessRulesEditor";
import { ServiceCatalogEditor } from "@/components/brain/ServiceCatalogEditor";
import { AdditionalServicesEditor } from "@/components/brain/AdditionalServicesEditor";
import { MenuCatalogEditor } from "@/components/brain/MenuCatalogEditor";
import { DispatchServiceCatalog } from "@/components/brain/dispatch/DispatchServiceCatalog";
import { RequiredQuestionsEditor } from "@/components/settings/RequiredQuestionsEditor";
import { AIBusinessPolicies } from "@/components/settings/AIBusinessPolicies";
import { AvailabilityHub } from "@/components/availability/AvailabilityHub";
import { BusinessFAQEditor } from "@/components/brain/BusinessFAQEditor";
import { BusinessObjectionEditor } from "@/components/brain/BusinessObjectionEditor";
import { BookingDeliverySettings } from "@/components/settings/BookingDeliverySettings";
import { FoodOrderSettings } from "@/components/settings/FoodOrderSettings";
import { DispatchDeliverySettings } from "@/components/settings/DispatchDeliverySettings";
import { MedicalHIPAASettings } from "@/components/settings/MedicalHIPAASettings";
import { CallbackDeliverySettings } from "@/components/settings/CallbackDeliverySettings";
import { MedicalIntakeDeliverySettings } from "@/components/settings/MedicalIntakeDeliverySettings";
import { BusinessProfileEditor } from "@/components/brain/BusinessProfileEditor";
import StaffManagementEditor from "@/components/brain/StaffManagementEditor";
import { BusinessPoliciesEditor } from "@/components/brain/BusinessPoliciesEditor";
import { CustomPoliciesEditor } from "@/components/brain/CustomPoliciesEditor";
import { ServiceAreaManager } from "@/components/brain/ServiceAreaManager";
import { BrainAssetsManager } from "@/components/brain/BrainAssetsManager";
import { BrainReviewQueue } from "@/components/brain/BrainReviewQueue";
import { CustomKnowledgeEditor } from "@/components/brain/CustomKnowledgeEditor";
import { IndustryTemplateCard } from "@/components/brain/IndustryTemplateCard";
import { ServiceAreaPreview } from "@/components/debug/ServiceAreaPreview";
import { DistanceEtaSection } from "@/components/business-brain/DistanceEtaSection";
import { DispatchEtaSection } from "@/components/business-brain/DispatchEtaSection";
import { BusinessHoursManager } from "@/components/brain/BusinessHoursManager";
import { AINeverPromiseEditor } from "@/components/brain/AINeverPromiseEditor";
import { AIScriptsEditor } from "@/components/brain/AIScriptsEditor";
import {
  ImpoundLotEditor,
  ImpoundFeesEditor,
  ImpoundReleaseEditor,
  DispatchIvrSettings,
} from "@/components/brain/dispatch/impound";
import { DistanceBasisSettings } from "@/components/brain/dispatch/DistanceBasisSettings";
import { PriceModifiersEditor } from "@/components/brain/PriceModifiersEditor";
import { ServicePackagesEditor } from "@/components/brain/ServicePackagesEditor";
import { DispatchPricingEditor, DispatchCoverageZonesEditor } from "@/components/brain/dispatch";
import {
  FoodServiceTypesEditor,
  FoodSettingsEditor,
  MenuSizesEditor,
  DailySpecialsEditor,
  DeliveryZonesEditor,
} from "@/components/brain/food";
import { MedicalPricingEditor, MedicalCoverageEditor } from "@/components/brain/medical";
import { ServiceCoverageEditor } from "@/components/brain/service";
import { ResponseTimeEditor } from "@/components/brain/general";
import {
  MenuKnowledgeEditor,
  CateringKnowledgeEditor,
  VehicleKnowledgeEditor,
  RoadsideKnowledgeEditor,
  SymptomTriageEditor,
  InsuranceKnowledgeEditor,
  ProductKnowledgeEditor,
  AftercareInstructionsEditor,
  CompetitorKnowledgeEditor,
  SeasonalKnowledgeEditor,
} from "@/components/brain/knowledge";
import { TekmetricSetup } from "@/components/brain/integrations/TekmetricSetup";
import { SalesPoliciesEditor } from "@/components/brain/sales/SalesPoliciesEditor";
import AIBehaviorModeSelector from "@/components/ai/AIBehaviorModeSelector";
import ServiceCallFlowSettings from "@/components/ai/ServiceCallFlowSettings";
import BookingBehaviorSettings from "@/components/ai/BookingBehaviorSettings";

interface BrainEditorRendererProps {
  itemId: string;
  businessMode: BusinessMode;
  caps: Capabilities;
  isFoodMode: boolean;
  isDispatchMode: boolean;
}

export function BrainEditorRenderer({
  itemId,
  businessMode,
  caps,
  isFoodMode,
  isDispatchMode,
}: BrainEditorRendererProps) {
  switch (itemId) {
    // ── Business tab ──
    case "business-info":
      return <BusinessProfileEditor />;
    case "business-hours":
      return <BusinessHoursManager />;
    case "calendar-sync":
      return <AvailabilityHub />;
    case "team":
      return <StaffManagementEditor />;
    case "templates":
      return <IndustryTemplateCard />;

    // ── Services tab ──
    case "food-service-types":
      return <FoodServiceTypesEditor />;
    case "pricing-rules":
      return <PricingRulesEditor />;
    case "catalog":
      if (isFoodMode) return <MenuCatalogEditor />;
      if (isDispatchMode) return <DispatchServiceCatalog />;
      return <ServiceCatalogEditor />;
    case "price-modifiers":
      return <PriceModifiersEditor />;
    case "service-packages":
      return <ServicePackagesEditor />;
    case "dispatch-pricing":
      return <DispatchPricingEditor />;
    case "distance-basis":
      return <DistanceBasisSettings />;
    case "food-settings-svc":
      return <FoodSettingsEditor />;
    case "menu-sizes":
      return <MenuSizesEditor />;
    case "daily-specials":
      return <DailySpecialsEditor />;
    case "medical-pricing":
      return (
        <>
          <MedicalPricingEditor />
          <div className="mt-4">
            <ServicePackagesEditor />
          </div>
        </>
      );
    case "additional-services":
      return <AdditionalServicesEditor />;

    // ── Operations tab ──
    case "coverage":
      return (
        <>
          <ServiceAreaPreview />
          <div className="mt-4">
            <ServiceAreaManager />
          </div>
        </>
      );
    case "travel-times":
      return isDispatchMode ? <DispatchEtaSection /> : <DistanceEtaSection />;
    case "service-coverage":
      return <ServiceCoverageEditor />;
    case "dispatch-zones":
      return <DispatchCoverageZonesEditor />;
    case "delivery-zones":
      return <DeliveryZonesEditor />;
    case "catering-coverage":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure how far you'll travel for catering events and minimum lead time requirements.
            Your AI will use this to qualify catering inquiries.
          </p>
          <DistanceEtaSection />
        </div>
      );
    case "medical-coverage":
      return <MedicalCoverageEditor />;
    case "response-times":
      return <ResponseTimeEditor />;
    case "workload":
      return <BusynessRulesEditor />;
    case "policies":
      return <BusinessPoliciesEditor />;
    case "never-promise":
      return <AINeverPromiseEditor />;
    case "required-questions":
      return <RequiredQuestionsEditor />;
    case "custom-policies":
      return <CustomPoliciesEditor />;
    case "booking-delivery":
      return <BookingDeliverySettings />;
    case "food-settings-ops":
      return <FoodOrderSettings />;
    case "dispatch-settings":
      return <DispatchDeliverySettings />;
    case "distance-pricing":
      return <DistanceBasisSettings />;
    case "ivr-routing":
      return <DispatchIvrSettings />;
    case "impound-lot":
      return <ImpoundLotEditor />;
    case "impound-fees":
      return <ImpoundFeesEditor />;
    case "impound-release":
      return <ImpoundReleaseEditor />;
    case "callback-delivery":
      return <CallbackDeliverySettings />;
    case "medical-intake-delivery":
      return <MedicalIntakeDeliverySettings />;
    case "hipaa":
      return <MedicalHIPAASettings />;

    // ── AI behavior (Training tab) ──
    case "ai-behavior-mode":
      return <AIBehaviorModeSelector />;
    case "call-flow":
      return <ServiceCallFlowSettings />;
    case "booking-behavior":
      return <BookingBehaviorSettings />;
    case "scripts":
      return <AIScriptsEditor />;
    case "guidelines":
      return <AIBusinessPolicies />;

    // ── Training tab ──
    case "review":
      return <BrainReviewQueue />;
    case "faqs":
      return <BusinessFAQEditor />;
    case "objections":
      return <BusinessObjectionEditor />;
    case "menu-knowledge":
      return <MenuKnowledgeEditor />;
    case "catering-knowledge":
      return <CateringKnowledgeEditor />;
    case "vehicle-knowledge":
      return <VehicleKnowledgeEditor />;
    case "roadside-knowledge":
      return <RoadsideKnowledgeEditor />;
    case "symptom-triage":
      return <SymptomTriageEditor />;
    case "insurance-knowledge":
      return <InsuranceKnowledgeEditor />;
    case "product-knowledge":
      return <ProductKnowledgeEditor />;
    case "aftercare":
      return <AftercareInstructionsEditor />;
    case "competitors":
      return <CompetitorKnowledgeEditor />;
    case "seasonal":
      return <SeasonalKnowledgeEditor />;
    case "custom":
      return <CustomKnowledgeEditor />;
    case "documents":
      return <BrainAssetsManager />;

    // ── Sales ──
    case "sales-policies":
      return <SalesPoliciesEditor />;

    // ── Integrations ──
    case "tekmetric":
      return <TekmetricSetup />;

    default:
      return (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Editor not found for "{itemId}"
        </div>
      );
  }
}
