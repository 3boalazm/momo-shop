import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Phone, Mail, MapPin, Package, Truck, Copy } from "lucide-react";
import { fetchAdminOrder, updateOrderStatus, type AdminOrderDetail, type AdminOrderItem } from "@/lib/api";

interface Props {
  token: string;
  orderId: number;
  onClose: () => void;
  onStatusChange?: () => void;
}

const ALL_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export default function AdminOrderDetailModal({ token, orderId, onClose, onStatusChange }: Props) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [items, setItems] = useState<AdminOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAdminOrder(token, orderId);
        if (!cancelled) {
          setOrder(data.order);
          setItems(data.items);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load order");
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, orderId, onClose]);

  const [updating, setUpdating] = useState(false);
  const handleStatusChange = async (newStatus: string) => {
    if (!order || newStatus === order.status) return;
    setUpdating(true);
    try {
      await updateOrderStatus(token, order.id, newStatus);
      setOrder({ ...order, status: newStatus });
      toast.success(
        newStatus === "Cancelled"
          ? "Order cancelled — stock restored"
          : `Status changed to ${newStatus}`
      );
      onStatusChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // Build a Bosta-style shipment sheet the operator can copy into the courier app
  const buildShipmentSheet = () => {
    if (!order) return "";
    const cod = order.paymentMethod === "COD" ? `${Number(order.total).toLocaleString()} EGP` : "0 (Prepaid)";
    const itemLines = items.map((it) => `  - ${it.productName} (${it.color}/${it.size}) x${it.quantity}`).join("\n");
    return [
      `Order: ${order.orderNumber}`,
      `Receiver: ${order.shippingFirstName} ${order.shippingLastName}`,
      `Phone: ${order.shippingPhone}`,
      `Address: ${order.shippingAddress}, ${order.shippingCity}`,
      `COD Amount: ${cod}`,
      `Items:`,
      itemLines,
      `Notes: ${order.notes || "—"}`,
    ].join("\n");
  };

  const copyShipment = async () => {
    try {
      await navigator.clipboard.writeText(buildShipmentSheet());
      toast.success("Shipment details copied — paste into Bosta");
    } catch {
      toast.error("Could not copy — select the text manually");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ borderRadius: "16px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="eyebrow block mb-1">Order Details</span>
            <h3 className="heading-subsection">{order?.orderNumber || "..."}</h3>
          </div>
          <button onClick={onClose} className="text-dim hover:text-white" aria-label="Close">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading || !order ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status + payment */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-dim text-xs uppercase tracking-widest">Status</span>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  className="bg-transparent border border-momo text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-accent disabled:opacity-50"
                  style={{ borderRadius: "8px" }}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s} style={{ background: "#141414" }}>{s}</option>
                  ))}
                </select>
              </div>
              <span className="glass-chip px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white" style={{ borderRadius: "8px" }}>
                {order.paymentMethod} · {order.paymentStatus}
              </span>
              <span className="text-dim text-sm py-1.5">
                {new Date(order.createdAt).toLocaleString("en-EG")}
              </span>
            </div>

            {/* Customer */}
            <div className="glass p-5" style={{ borderRadius: "14px" }}>
              <h4 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>Customer</h4>
              <p className="font-semibold mb-2">{order.shippingFirstName} {order.shippingLastName}</p>
              <div className="space-y-1.5 text-sm text-dim">
                <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {order.shippingPhone}</p>
                <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {order.shippingEmail}</p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{order.shippingAddress}, {order.shippingCity}, {order.shippingCountry}{order.shippingPostalCode ? ` ${order.shippingPostalCode}` : ""}</span>
                </p>
              </div>
              {order.notes && (
                <p className="text-sm mt-3 pt-3 border-t border-momo"><span className="text-dim">Notes:</span> {order.notes}</p>
              )}
            </div>

            {/* Items */}
            <div className="glass p-5" style={{ borderRadius: "14px" }}>
              <h4 className="font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                <Package className="w-4 h-4" /> Items ({items.length})
              </h4>
              <div className="space-y-3">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between items-start text-sm">
                    <div>
                      <p className="font-semibold">{it.productName}</p>
                      <p className="text-dim">{it.color} · Size {it.size} · Qty {it.quantity}</p>
                    </div>
                    <span className="font-semibold whitespace-nowrap">{Number(it.subtotal).toLocaleString()} LE</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-momo space-y-2 text-sm">
                <div className="flex justify-between text-dim">
                  <span>Subtotal</span>
                  <span>{Number(order.subtotal).toLocaleString()} LE</span>
                </div>
                <div className="flex justify-between text-dim">
                  <span>Shipping</span>
                  <span>{Number(order.shippingCost) === 0 ? "Free" : `${order.shippingCost} LE`}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span className="text-accent">{Number(order.total).toLocaleString()} LE</span>
                </div>
              </div>
            </div>

            {/* Prepare shipment (courier) */}
            {order.status !== "Cancelled" && (
              <div className="glass p-4" style={{ borderRadius: "12px" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-accent" />
                    <span className="font-bold text-sm uppercase tracking-wide">Prepare Shipment</span>
                  </div>
                  <button
                    onClick={copyShipment}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide glass-chip text-white hover:text-accent transition-colors"
                    style={{ borderRadius: "8px" }}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy for Bosta
                  </button>
                </div>
                <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono leading-relaxed">{buildShipmentSheet()}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
