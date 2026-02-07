/**
 * Knowledge Components - Mode-Specific Knowledge Editors
 */

// Suggestion components
export { ModeFAQSuggestions } from "./ModeFAQSuggestions";
export { ModeObjectionSuggestions } from "./ModeObjectionSuggestions";
export { ModeKnowledgeSuggestions } from "./ModeKnowledgeSuggestions";

// Food mode editors
export { MenuKnowledgeEditor } from "./food/MenuKnowledgeEditor";
export { CateringKnowledgeEditor } from "./food/CateringKnowledgeEditor";

// Dispatch mode editors
export { VehicleKnowledgeEditor } from "./dispatch/VehicleKnowledgeEditor";
export { RoadsideKnowledgeEditor } from "./dispatch/RoadsideKnowledgeEditor";

// Medical mode editors
export { SymptomTriageEditor } from "./medical/SymptomTriageEditor";
export { InsuranceKnowledgeEditor } from "./medical/InsuranceKnowledgeEditor";

// Service mode editors
export { ProductKnowledgeEditor } from "./service/ProductKnowledgeEditor";

// Shared editors (all modes)
export { AftercareInstructionsEditor } from "./shared/AftercareInstructionsEditor";
export { CompetitorKnowledgeEditor } from "./shared/CompetitorKnowledgeEditor";
export { SeasonalKnowledgeEditor } from "./shared/SeasonalKnowledgeEditor";
