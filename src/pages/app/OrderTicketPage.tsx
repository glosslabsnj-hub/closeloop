import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { OrderTicket } from "@/components/orders/OrderTicket";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";

export default function OrderTicketPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { tenant } = useAuth();
  const navigate = useNavigate();
  const ticketRef = useRef<HTMLDivElement>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["food-order", orderId],
    queryFn: async () => {
      if (!orderId || !tenant?.id) return null;
      const { data, error } = await supabase
        .from("food_orders")
        .select("*")
        .eq("id", orderId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!tenant?.id,
  });

  const { data: deliverySettings } = useQuery({
    queryKey: ["order-delivery-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("order_delivery_settings")
        .select("print_format")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.id,
  });

  const handlePrint = () => {
    window.print();
  };

  // Auto-print after loading (optional - can be triggered by URL param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auto") === "true" && order) {
      // Small delay to ensure rendering
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p>Order not found</p>
        <Button variant="outline" onClick={() => navigate("/app/orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  const printFormat = (deliverySettings?.print_format || "ticket_80mm") as "ticket_80mm" | "letter";

  // Cast order to match expected props - handle Json types
  const orderForTicket = {
    ...order,
    address_json: order.address_json as { street?: string; city?: string; zip?: string } | null,
    totals_estimate: order.totals_estimate as { subtotal?: number; tax?: number; total?: number } | null,
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header - hidden in print */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-background border-b p-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/app/orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
        <div className="flex gap-2">
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Ticket
          </Button>
        </div>
      </div>

      {/* Ticket Content */}
      <div className="min-h-screen pt-20 pb-8 flex justify-center no-print">
        <div className="bg-white shadow-lg">
          <OrderTicket
            ref={ticketRef}
            order={orderForTicket}
            businessName={tenant?.name || "Restaurant"}
            ticketFormat={printFormat}
          />
        </div>
      </div>

      {/* Print-only version */}
      <div className="print-area">
        <OrderTicket
          order={orderForTicket}
          businessName={tenant?.name || "Restaurant"}
          ticketFormat={printFormat}
        />
      </div>
    </>
  );
}
