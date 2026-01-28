import { supabase } from "@/integrations/supabase/client";

/**
 * P0-5: Handoff trigger utilities
 * 
 * These functions call the universal-delivery edge function to deliver 
 * new bookings/dispatches/orders to configured destinations.
 * 
 * The universal delivery system handles:
 * - Internal storage (always on)
 * - Webhook delivery with HMAC signing
 * - Email notifications
 * - SMS notifications
 */

type EntityType = "booking" | "dispatch" | "order" | "reservation" | "catering" | "intake";

interface DeliveryResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

async function triggerUniversalDelivery(
  entityType: EntityType,
  entityId: string,
  tenantId?: string
): Promise<DeliveryResult> {
  try {
    // Get tenant_id if not provided
    let tenant_id = tenantId;
    if (!tenant_id) {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: tenantUser } = await supabase
          .from("tenant_users")
          .select("tenant_id")
          .eq("user_id", session.session.user.id)
          .single();
        tenant_id = tenantUser?.tenant_id;
      }
    }

    if (!tenant_id) {
      return { success: false, error: "No tenant context" };
    }

    const response = await supabase.functions.invoke("universal-delivery", {
      body: {
        tenant_id,
        entity_type: entityType,
        entity_id: entityId,
      },
    });

    if (response.error) {
      console.error(`${entityType} delivery failed:`, response.error);
      return { success: false, error: response.error.message };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error(`${entityType} delivery error:`, error);
    return { success: false, error: String(error) };
  }
}

export async function triggerBookingHandoff(bookingId: string, tenantId?: string): Promise<DeliveryResult> {
  return triggerUniversalDelivery("booking", bookingId, tenantId);
}

export async function triggerDispatchHandoff(dispatchId: string, tenantId?: string): Promise<DeliveryResult> {
  return triggerUniversalDelivery("dispatch", dispatchId, tenantId);
}

export async function triggerOrderHandoff(orderId: string, tenantId?: string): Promise<DeliveryResult> {
  return triggerUniversalDelivery("order", orderId, tenantId);
}

export async function triggerReservationHandoff(reservationId: string, tenantId?: string): Promise<DeliveryResult> {
  return triggerUniversalDelivery("reservation", reservationId, tenantId);
}

export async function triggerCateringHandoff(cateringId: string, tenantId?: string): Promise<DeliveryResult> {
  return triggerUniversalDelivery("catering", cateringId, tenantId);
}

export async function triggerIntakeHandoff(intakeId: string, tenantId?: string): Promise<DeliveryResult> {
  return triggerUniversalDelivery("intake", intakeId, tenantId);
}

/**
 * Retry a failed handoff attempt
 */
export async function retryHandoff(
  entityType: EntityType,
  entityId: string,
  tenantId?: string
): Promise<DeliveryResult> {
  return triggerUniversalDelivery(entityType, entityId, tenantId);
}
