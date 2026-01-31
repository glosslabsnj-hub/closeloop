import { useTenantConfig } from "./useTenantConfig";

const FOOD_MODULES = ["food_orders", "menu_knowledge", "reservations", "catering"];

export function useFoodMode() {
  const { businessMode, enabledModules } = useTenantConfig();
  
  const isFoodMode = businessMode === "food" || 
    FOOD_MODULES.some(m => enabledModules.includes(m));
  
  const hasFoodOrders = enabledModules.includes("food_orders");
  const hasMenuKnowledge = enabledModules.includes("menu_knowledge");
  const hasReservations = enabledModules.includes("reservations");
  const hasCatering = enabledModules.includes("catering");
  
  return { 
    isFoodMode,
    hasFoodOrders,
    hasMenuKnowledge,
    hasReservations,
    hasCatering,
  };
}
