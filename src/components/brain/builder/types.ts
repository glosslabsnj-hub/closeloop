/**
 * Brain Builder Types
 * Shared types for the conversational AI setup assistant.
 */

export type BrainBuilderTopic =
  | "identity"
  | "hours"
  | "services"
  | "policies"
  | "ai_setup"
  | "faqs";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ExtractedData {
  topic: BrainBuilderTopic;
  action: string; // e.g. "update_profile", "create_service", "create_faq"
  data: Record<string, any>;
}

export interface BrainBuilderResponse {
  message: string;
  extracted_data?: ExtractedData[];
  current_topic: BrainBuilderTopic;
  is_topic_complete: boolean;
  is_all_complete: boolean;
}

export interface BrainBuilderState {
  messages: ChatMessage[];
  currentTopic: BrainBuilderTopic;
  completedTopics: BrainBuilderTopic[];
  isLoading: boolean;
  error: string | null;
}

export const TOPIC_ORDER: BrainBuilderTopic[] = [
  "identity",
  "hours",
  "services",
  "policies",
  "ai_setup",
  "faqs",
];

export const TOPIC_LABELS: Record<BrainBuilderTopic, string> = {
  identity: "Business Info",
  hours: "Operating Hours",
  services: "Services & Pricing",
  policies: "Policies",
  ai_setup: "AI Personality",
  faqs: "Common Questions",
};
