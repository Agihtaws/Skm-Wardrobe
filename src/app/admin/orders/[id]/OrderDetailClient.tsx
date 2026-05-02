"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
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
  const [order, setOrder]   = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [awb, setAwb]       = useState(initial.shiprocket_awb ?? initial.delhivery_awb ?? "");
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping]   = useState(false);
  const [shipResult, setShipResult] = useState<any>(null);

  const handleSave = async () => {
    setSaving(true);
    const res  = await fetch(`/api/admin/orders/${order.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status, delhivery_awb: awb || null }),
    });
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error ?? "Update failed");
    } else {
      setOrder((o: any) => ({ ...o, status, shiprocket_awb: awb, delhivery_awb: awb }));
      toast.success("Order updated");
    }
    setSaving(false);
  };

  const handleShipWithSR = async () => {
    setShipping(true);
    const res  = await fetch(`/api/admin/orders/${order.id}/ship`, { method: "POST" });
    const json = await res.json();
    setShipping(false);
    if (!json.success) { toast.error(json.error ?? "Shiprocket error"); return; }
    setShipResult(json.data);
    setOrder((o: any) => ({
      ...o,
      shiprocket_order_id:    json.data.shiprocket_order_id    ?? o.shiprocket_order_id,
      shiprocket_shipment_id: json.data.shiprocket_shipment_id ?? o.shiprocket_shipment_id,
      shiprocket_awb:         json.data.shiprocket_awb         ?? o.shiprocket_awb,
      courier_name:           json.data.courier_name           ?? o.courier_name,
    }));
    toast.success("Shipment created on Shiprocket!");
  };

  const address = order.address;
  const items: any[] = order.items ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* Back + title */}
      <div className="flex items-start gap-3 mb-5 sm:mb-6">
        <Link href="/admin/orders" className="mt-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-gray-500">
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[order.status] ?? ""}`}>
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

        {/* Order items — full width */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900">Items ({items.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Product", "Price", "Qty", "Total"].map((h) => (
                    <th key={h} className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {item.product_image && (
                          <div className="w-9 h-11 sm:w-10 sm:h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={item.product_image} alt={item.product_name}
                              className="w-full h-full object-contain" />
                          </div>
                        )}
                        <p className="font-medium text-gray-800 text-xs sm:text-sm line-clamp-2 max-w-[140px] sm:max-w-xs">
                          {item.product_name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-xs sm:text-sm whitespace-nowrap">
                      ₹{Number(item.price_at_time).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-xs sm:text-sm">{item.quantity}</td>
                    <td className="px-4 sm:px-5 py-3 font-semibold text-xs sm:text-sm whitespace-nowrap">
                      ₹{(item.price_at_time * item.quantity).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Totals */}
          <div className="px-4 sm:px-5 py-3 border-t border-gray-100 space-y-1">
            {order.subtotal != null && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal).toLocaleString("en-IN")}</span>
              </div>
            )}
            {order.gst_amount != null && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>GST (5%)</span>
                <span>₹{Number(order.gst_amount).toLocaleString("en-IN")}</span>
              </div>
            )}
            {order.shipping != null && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Shipping</span>
                <span>₹{Number(order.shipping).toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>₹{Number(order.total).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <p className="font-semibold text-gray-900 mb-3">Delivery Address</p>
          {address ? (
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-900">{address.full_name}</p>
              <p>{address.phone}</p>
              <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
              <p>{address.city}, {address.state} — {address.pincode}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No address recorded</p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Payment method</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                order.payment_method === "cod" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
              }`}>
                {order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}
              </span>
            </div>
            {order.razorpay_payment_id && (
              <div>
                <p className="text-xs text-gray-500">Razorpay Payment ID</p>
                <p className="text-xs font-mono text-gray-700 break-all">{order.razorpay_payment_id}</p>
              </div>
            )}
          </div>
        </div>

        {/* Update status + shiprocket */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <p className="font-semibold text-gray-900 mb-4">Manage Order</p>
          <div className="space-y-3">

            {/* Shiprocket: create shipment */}
            {["paid", "processing"].includes(order.status) && !order.shiprocket_order_id && (
              <button
                onClick={handleShipWithSR}
                disabled={shipping}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
              >
                {shipping
                  ? <><Loader2 size={15} className="animate-spin" /> Creating shipment...</>
                  : "🚀 Create Shiprocket Shipment"
                }
              </button>
            )}

            {/* Shiprocket active */}
            {order.shiprocket_order_id && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-blue-700">Shiprocket Active</p>
                <p className="text-xs text-blue-600 font-mono">SR Order: {order.shiprocket_order_id}</p>
                {order.courier_name && (
                  <p className="text-xs text-blue-600">Courier: {order.courier_name}</p>
                )}
                {(order.shiprocket_awb || order.delhivery_awb) && (
                  <a
                    href={`https://shiprocket.co/tracking/${order.shiprocket_awb ?? order.delhivery_awb}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-700 font-semibold hover:underline block"
                  >
                    Track: {order.shiprocket_awb ?? order.delhivery_awb} →
                  </a>
                )}
              </div>
            )}

            {/* Status select */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* AWB / tracking */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Tracking Number (AWB)
              </label>
              <input
                value={awb}
                onChange={(e) => setAwb(e.target.value)}
                placeholder="Enter AWB / tracking number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Update Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}