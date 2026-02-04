/**
 * Service Area Guidance Component
 * Provides UX guidance for the Service Area section of Business Brain
 */

import { MapPin } from "lucide-react";
import { SectionGuidanceCard, type SectionExample } from "./SectionGuidanceCard";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface ServiceAreaGuidanceProps {
  businessMode: BusinessMode;
  outOfAreaMessage?: string | null;
  serviceAreaSummary?: string | null;
}

const SERVICE_AREA_EXAMPLES: SectionExample[] = [
  {
    mode: "dispatch",
    label: "Dispatch / Towing",
    examples: [
      {
        field: "Service area summary",
        value: "We dispatch within a 50-mile radius of Hamilton Township, NJ.",
      },
      {
        field: "Out-of-area message",
        value: "It looks like you're outside our normal service area. I can take your details and have dispatch call you back with options—what's the pickup ZIP?",
      },
    ],
  },
  {
    mode: "food",
    label: "Restaurant / Food",
    examples: [
      {
        field: "Service area summary",
        value: "We deliver within 6 miles of our restaurant.",
      },
      {
        field: "Out-of-area message",
        value: "That address is outside our delivery radius. You can place a pickup order, or I can help you find the closest location.",
      },
    ],
  },
  {
    mode: "service",
    label: "Service Business",
    examples: [
      {
        field: "Service area summary",
        value: "We provide mobile service within 25 miles of downtown.",
      },
      {
        field: "Out-of-area message",
        value: "That's outside our mobile zone. If you'd like, you can book an in-shop appointment or I can have someone follow up.",
      },
    ],
  },
  {
    mode: "general",
    label: "General Business",
    examples: [
      {
        field: "Service area summary",
        value: "We primarily serve the greater metro area and nearby towns.",
      },
      {
        field: "Out-of-area message",
        value: "I can take your info and confirm availability—what city are you in?",
      },
    ],
  },
  {
    mode: "medical",
    label: "Medical Practice",
    examples: [
      {
        field: "Service area summary",
        value: "We see patients from the tri-county area.",
      },
      {
        field: "Out-of-area message",
        value: "We may be able to accommodate you. Let me take your information and someone will follow up to confirm.",
      },
    ],
  },
];

export function ServiceAreaGuidance({
  businessMode,
  outOfAreaMessage,
  serviceAreaSummary,
}: ServiceAreaGuidanceProps) {
  // Build preview content
  let previewContent: string | null = null;
  if (outOfAreaMessage) {
    previewContent = outOfAreaMessage;
  } else if (serviceAreaSummary) {
    previewContent = serviceAreaSummary;
  }

  const previewFallback = "The AI will ask the caller for their ZIP and then offer a callback if out of area.";

  return (
    <SectionGuidanceCard
      title="Where you will and won't go"
      icon={<MapPin className="h-4 w-4" />}
      whatItControls="This defines the area your team can serve so the AI can quickly confirm coverage."
      howAIUsesIt={[
        "If a caller asks 'Do you serve my area?', the AI will ask for ZIP/city first and then check your service area rules.",
        "If the caller is outside your area, the AI will use your Out-of-Area Message (speech-ready) instead of arguing.",
      ]}
      examples={SERVICE_AREA_EXAMPLES}
      avoidList={[
        '"Outside area. Goodbye." (too abrupt)',
        '"Error: radius limit exceeded." (sounds robotic)',
        'Leaving out-of-area message blank (AI will improvise)',
      ]}
      businessMode={businessMode}
      previewContent={previewContent}
      previewFallback={previewFallback}
      className="mb-4"
    />
  );
}
