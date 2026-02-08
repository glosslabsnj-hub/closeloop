import { useCapabilities } from "./useCapabilities";

export function useFoodMode() {
  const caps = useCapabilities();

  return {
    isFoodMode: caps.isFoodBusiness,
    hasFoodOrders: caps.hasFoodOrders,
    hasMenuKnowledge: caps.hasMenuKnowledge,
    hasReservations: caps.hasReservations,
    hasCatering: caps.hasCatering,
  };
}
