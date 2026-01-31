import { forwardRef } from "react";
import { format as formatDate } from "date-fns";

interface OrderItem {
  name: string;
  qty: number;
  base_price?: number;
  price_cents?: number | null;
  menu_item_id?: string | null;
  matched?: boolean;
  modifiers?: string[];
  item_notes?: string;
}

interface OrderTicketProps {
  order: {
    id: string;
    order_number: string;
    order_type: string;
    status: string;
    customer_name: string | null;
    customer_phone: string | null;
    delivery_address?: string | null;
    address_json?: unknown;
    items_json: OrderItem[] | unknown;
    special_instructions: string | null;
    requested_time?: string | null;
    totals_estimate?: {
      subtotal?: number;
      tax?: number;
      total?: number;
    } | null;
    subtotal_cents?: number | null;
    tax_cents?: number | null;
    total_cents?: number | null;
    created_at: string;
  };
  businessName?: string;
  ticketFormat?: "ticket_80mm" | "letter";
}

export const OrderTicket = forwardRef<HTMLDivElement, OrderTicketProps>(
  ({ order, businessName = "Restaurant", ticketFormat = "ticket_80mm" }, ref) => {
    const items = Array.isArray(order.items_json) ? (order.items_json as OrderItem[]) : [];
    
    const formatCurrency = (cents: number | null | undefined) => {
      if (cents == null) return "$0.00";
      return `$${(cents / 100).toFixed(2)}`;
    };

    const getTotals = () => {
      if (order.totals_estimate) {
        return {
          subtotal: order.totals_estimate.subtotal ?? 0,
          tax: order.totals_estimate.tax ?? 0,
          total: order.totals_estimate.total ?? 0,
        };
      }
      return {
        subtotal: order.subtotal_cents ?? 0,
        tax: order.tax_cents ?? 0,
        total: order.total_cents ?? 0,
      };
    };

    const totals = getTotals();
    const address = order.address_json as { street?: string; city?: string; zip?: string } | null || 
      (order.delivery_address ? { street: order.delivery_address } : null);

    const isThermal = ticketFormat === "ticket_80mm";

    return (
      <div
        ref={ref}
        className={`bg-white text-black ${isThermal ? "order-ticket-thermal" : "order-ticket-letter"}`}
        style={{
          fontFamily: isThermal ? "'Courier New', monospace" : "Arial, sans-serif",
          fontSize: isThermal ? "12px" : "14px",
          width: isThermal ? "80mm" : "8.5in",
          padding: isThermal ? "8px" : "1in",
          lineHeight: isThermal ? "1.3" : "1.5",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: isThermal ? "8px" : "24px" }}>
          <div style={{ fontWeight: "bold", fontSize: isThermal ? "14px" : "24px" }}>
            {businessName?.toUpperCase() || "RESTAURANT"}
          </div>
          {isThermal && <div>{"=".repeat(32)}</div>}
        </div>

        {/* Order Info */}
        <div style={{ marginBottom: isThermal ? "8px" : "16px" }}>
          <div><strong>Order:</strong> {order.order_number}</div>
          <div><strong>Date:</strong> {formatDate(new Date(order.created_at), "MMM d, yyyy h:mm a")}</div>
          {!isThermal && <div style={{ color: "#666" }}>Status: {order.status.replace(/_/g, " ").toUpperCase()}</div>}
        </div>

        {isThermal && <div>{"-".repeat(32)}</div>}

        {/* Type & Time */}
        <div style={{ marginBottom: isThermal ? "8px" : "16px", marginTop: isThermal ? "8px" : "0" }}>
          <div><strong>Type:</strong> {order.order_type.toUpperCase()}</div>
          <div>
            <strong>Time:</strong>{" "}
            {order.requested_time 
              ? formatDate(new Date(order.requested_time), "h:mm a")
              : "ASAP"
            }
          </div>
        </div>

        {isThermal && <div>{"-".repeat(32)}</div>}

        {/* Customer Info */}
        <div style={{ marginBottom: isThermal ? "8px" : "16px", marginTop: isThermal ? "8px" : "0" }}>
          <div><strong>Customer:</strong> {order.customer_name || "Unknown"}</div>
          {order.customer_phone && <div><strong>Phone:</strong> {order.customer_phone}</div>}
          {address && (order.order_type === "delivery" || order.order_type === "catering") && (
            <div style={{ marginTop: "4px" }}>
              <strong>Address:</strong><br />
              {address.street}
              {address.city && <><br />{address.city} {address.zip}</>}
            </div>
          )}
        </div>

        {isThermal && <div>{"-".repeat(32)}</div>}

        {/* Items */}
        <div style={{ marginBottom: isThermal ? "8px" : "24px", marginTop: isThermal ? "8px" : "0" }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            {isThermal ? "ITEMS:" : "Items"}
          </div>
          {items.length === 0 ? (
            <div style={{ fontStyle: "italic" }}>No items</div>
          ) : (
            items.map((item, idx) => {
              // Support both price_cents (new) and base_price (legacy)
              const priceCents = item.price_cents ?? (item.base_price ? item.base_price : null);
              const lineTotal = priceCents ? priceCents * item.qty : null;
              
              return (
                <div key={idx} style={{ marginBottom: "8px" }}>
                  <div style={{ fontWeight: "bold" }}>
                    {item.qty}x {item.name}
                    {item.matched === false && " *"}
                    {lineTotal !== null && (
                      <span style={{ float: "right" }}>{formatCurrency(lineTotal)}</span>
                    )}
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div style={{ paddingLeft: isThermal ? "12px" : "16px", color: "#666" }}>
                      {item.modifiers.map((mod, i) => (
                        <div key={i}>+ {mod}</div>
                      ))}
                    </div>
                  )}
                  {item.item_notes && (
                    <div style={{ paddingLeft: isThermal ? "12px" : "16px", fontStyle: "italic", color: "#666" }}>
                      ({item.item_notes})
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {isThermal && <div>{"-".repeat(32)}</div>}

        {/* Special Instructions - BIG AND PROMINENT */}
        {order.special_instructions && (
          <div style={{
            margin: isThermal ? "8px 0" : "24px 0",
            padding: isThermal ? "8px" : "16px",
            border: "2px solid black",
            backgroundColor: "#ffffcc",
          }}>
            <div style={{
              fontWeight: "bold",
              fontSize: isThermal ? "14px" : "18px",
              marginBottom: "4px",
              textAlign: "center",
            }}>
              *** SPECIAL INSTRUCTIONS ***
            </div>
            <div style={{
              fontWeight: "bold",
              fontSize: isThermal ? "12px" : "16px",
              whiteSpace: "pre-wrap",
            }}>
              {order.special_instructions}
            </div>
          </div>
        )}

        {isThermal && <div>{"-".repeat(32)}</div>}

        {/* Totals */}
        <div style={{ marginTop: isThermal ? "8px" : "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tax:</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: isThermal ? "14px" : "18px" }}>
            <span>TOTAL:</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: "center", 
          marginTop: isThermal ? "16px" : "32px",
          color: "#666",
          fontSize: isThermal ? "10px" : "12px",
        }}>
          {isThermal && <div>{"=".repeat(32)}</div>}
          <div style={{ marginTop: "4px" }}>Auto-confirmed by phone</div>
          {isThermal && <div>{"=".repeat(32)}</div>}
        </div>
      </div>
    );
  }
);

OrderTicket.displayName = "OrderTicket";
