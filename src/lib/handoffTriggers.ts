import { supabase } from "@/integrations/supabase/client";

/**
 * P0-5: Handoff trigger utilities
 * 
 * These functions call the handoff edge functions to deliver 
 * new bookings/dispatches/orders to configured destinations.
 */

export async function triggerBookingHandoff(bookingId: string) {
  try {
    const response = await supabase.functions.invoke("booking-handoff", {
      body: { booking_id: bookingId },
    });
    
    if (response.error) {
      console.error("Booking handoff failed:", response.error);
      return { success: false, error: response.error.message };
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Booking handoff error:", error);
    return { success: false, error: String(error) };
  }
}

export async function triggerDispatchHandoff(dispatchId: string) {
  try {
    const response = await supabase.functions.invoke("dispatch-handoff", {
      body: { dispatch_id: dispatchId },
    });
    
    if (response.error) {
      console.error("Dispatch handoff failed:", response.error);
      return { success: false, error: response.error.message };
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Dispatch handoff error:", error);
    return { success: false, error: String(error) };
  }
}

export async function triggerOrderHandoff(orderId: string) {
  try {
    const response = await supabase.functions.invoke("order-handoff", {
      body: { order_id: orderId },
    });
    
    if (response.error) {
      console.error("Order handoff failed:", response.error);
      return { success: false, error: response.error.message };
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Order handoff error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Retry a failed handoff attempt
 */
export async function retryHandoff(
  entityType: "booking" | "dispatch" | "order",
  entityId: string
) {
  switch (entityType) {
    case "booking":
      return triggerBookingHandoff(entityId);
    case "dispatch":
      return triggerDispatchHandoff(entityId);
    case "order":
      return triggerOrderHandoff(entityId);
    default:
      return { success: false, error: "Unknown entity type" };
  }
}
