"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import type { Address } from "@/types/database";

const STATUSES = [
  "pending", "paid", "processing",
  "shipped", "delivered", "cancelled", "refunded",
] as const;

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-gray-100 text-gray-600",
  paid:       "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  shipped:    "bg-purple-100 text-purple-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-600",
  refunded:   "bg-orange-100 text-orange-700",
};

export default function OrderDetailClient({ order: initial }: { order: any }) {
  const [order,      setOrder]      = useState(initial);
  const [status,     setStatus]     = useState(initial.status);
  const [awb,        setAwb]        = useState(initial.delhivery_awb ?? "");
  const [saving,     setSaving]     = useState(false);
  const [shipping,   setShipping]   = useState(false);

  const address: Address = order.address;
  const items: any[]     = order.items ?? [];

  // Show ship button for: paid, processing, OR pending COD
  const canCreateShipment =
    !order.shiprocket_order_id &&
    (
      ["paid", "processing"].includes(order.status) ||
      (order.status === "pending" && order.payment_method === "cod")
    );

  const handleSave = async () => {
    setSaving(true);
    const res  = await fetch(`/api/admin/orders/${order.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status, delhivery_awb: awb || null }),
    });
    const json = await res.json();
    setSaving(false);

    if (!json.success) {
      toast.error(json.error ?? "Update failed");
    } else {
      setOrder((o: any) => ({ ...o, status, delhivery_awb: awb }));
      toast.success("Order updated");
    }
  };

  const handleShipWithSR = async () => {
    setShipping(true);
    const res  = await fetch(`/api/admin/orders/${order.id}/ship`, {
      method: "POST",
    });
    const json = await res.json();
    setShipping(false);

    if (!json.success) {
      toast.error(json.error ?? "Shiprocket error");
      return;
    }

    setOrder((o: any) => ({
      ...o,
      status:                 "processing",
      shiprocket_order_id:    json.data.shiprocket_order_id ?? o.shiprocket_order_id,
      shiprocket_shipment_id: json.data.shiprocket_shipment_id ?? o.shiprocket_shipment_id,
    }));
    setStatus("processing");
    toast.success("Shiprocket order created! Assign courier in Shiprocket dashboard.");
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/orders" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500">
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "long", year: "numeric",
            })}
            {" · "}
            {order.payment_method === "cod" ? "Cash on Delivery" : "Paid Online"}
          </p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold ${STATUS_BADGE[order.status] ?? ""}`}>
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Items table */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900">Items ({items.length})</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Product", "Price", "Qty", "Total"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {item.product?.images?.[0] && (
                        <div className="w-10 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.product.images[0]}
                            alt={item.product_name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <p className="font-medium text-gray-800 line-clamp-1">
                        {item.product_name}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3">₹{Number(item.price_at_time).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3">{item.quantity}</td>
                  <td className="px-5 py-3 font-semibold">
                    ₹{(Number(item.price_at_time) * item.quantity).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-gray-100 space-y-1">
            {order.subtotal > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal).toLocaleString("en-IN")}</span>
              </div>
            )}
            {order.gst_amount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>GST (5%)</span>
                <span>₹{Number(order.gst_amount).toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>Shipping</span>
              <span>₹{Number(order.shipping ?? 40).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>₹{Number(order.total).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="font-semibold text-gray-900 mb-3">Delivery Address</p>
          {address ? (
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-semibold text-gray-900">{address.full_name}</p>
              <p>{address.phone}</p>
              <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
              <p>{address.city}, {address.state} — {address.pincode}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No address recorded</p>
          )}
          {order.razorpay_payment_id && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Razorpay Payment ID</p>
              <p className="text-xs font-mono text-gray-700 break-all">
                {order.razorpay_payment_id}
              </p>
            </div>
          )}
        </div>

        {/* Update panel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="font-semibold text-gray-900">Shipping & Status</p>

          {/* Shiprocket create button */}
          {canCreateShipment && (
            <div>
              <p className="text-xs text-gray-500 mb-2">
                {order.payment_method === "cod"
                  ? "COD order — create Shiprocket shipment when ready to dispatch"
                  : "Create Shiprocket shipment to assign courier"}
              </p>
              <button
                onClick={handleShipWithSR}
                disabled={shipping}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
              >
                {shipping ? (
                  <><Loader2 size={15} className="animate-spin" /> Creating shipment...</>
                ) : (
                  "🚀 Create Shiprocket Shipment"
                )}
              </button>
            </div>
          )}

          {/* Shiprocket active info */}
          {order.shiprocket_order_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs font-bold text-blue-700">✓ Shiprocket Active</p>
              <p className="text-xs text-blue-600 font-mono">
                SR ID: {order.shiprocket_order_id}
              </p>
              {order.shiprocket_shipment_id && (
                <p className="text-xs text-blue-600 font-mono">
                  Shipment: {order.shiprocket_shipment_id}
                </p>
              )}
              {order.courier_name && (
                <p className="text-xs text-blue-600">
                  Courier: {order.courier_name}
                </p>
              )}
              {(order.shiprocket_awb || order.delhivery_awb) && (
                
                  <a href={`https://shiprocket.co/tracking/${order.shiprocket_awb || order.delhivery_awb}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1"
                >
                  Track: {order.shiprocket_awb || order.delhivery_awb}
                  <ExternalLink size={11} />
                </a>
              )}
              <p className="text-[11px] text-blue-500 mt-1">
                Status will auto-update via webhook when courier scans.
              </p>
            </div>
          )}

          {/* Manual status override */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Manual Status Override
              <span className="font-normal text-gray-400 ml-1">
                (webhook auto-updates, use this only if needed)
              </span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Manual AWB override */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Manual AWB / Tracking
              <span className="font-normal text-gray-400 ml-1">(filled by Shiprocket automatically)</span>
            </label>
            <input
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              placeholder="Auto-filled by Shiprocket"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving..." : "Update Order"}
          </button>
        </div>
      </div>
    </div>
  );
}