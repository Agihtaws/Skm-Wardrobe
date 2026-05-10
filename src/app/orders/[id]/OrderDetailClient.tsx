"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Package, MapPin, CheckCircle,
  Clock, Truck, XCircle, RotateCcw,
  ExternalLink, AlertTriangle, Smartphone, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

declare global { interface Window { Razorpay: any; } }

const STATUS_STEPS = [
  { key: "pending",    label: "Order Placed",  icon: Package    },
  { key: "paid",       label: "Confirmed",     icon: CheckCircle},
  { key: "processing", label: "Processing",    icon: Clock      },
  { key: "shipped",    label: "Shipped",       icon: Truck      },
  { key: "delivered",  label: "Delivered",     icon: CheckCircle},
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Order Placed",      color: "text-gray-600",   bg: "bg-gray-100"   },
  paid:       { label: "Payment Confirmed", color: "text-blue-700",   bg: "bg-blue-100"   },
  processing: { label: "Processing",        color: "text-yellow-700", bg: "bg-yellow-100" },
  shipped:    { label: "Shipped",           color: "text-purple-700", bg: "bg-purple-100" },
  delivered:  { label: "Delivered",         color: "text-green-700",  bg: "bg-green-100"  },
  cancelled:  { label: "Cancelled",         color: "text-red-600",    bg: "bg-red-100"    },
  refunded:   { label: "Refunded",          color: "text-orange-700", bg: "bg-orange-100" },
};

const STEP_ORDER = ["pending", "paid", "processing", "shipped", "delivered"];

export default function OrderDetailClient({
  order: initial,
  justPlaced,
}: {
  order: any;
  justPlaced?: boolean;
}) {
  const router = useRouter();
  const [order, setOrder]             = useState(initial);
  const [cancelling, setCancelling]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [payingNow, setPayingNow]     = useState(false);

  // Return state
  const [showReturn, setShowReturn]             = useState(false);
  const [returnReason, setReturnReason]         = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnDone, setReturnDone]             = useState(
    initial.return_requested ?? false
  );

  const status      = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const isShipped   = order.status === "shipped";
  const canCancel   = ["pending", "paid"].includes(order.status);
  const activeStep  = STEP_ORDER.indexOf(order.status);
  const items: any[] = order.items ?? [];
  const addr         = order.address;

  // Days since delivery
  const deliveredDate = new Date(order.updated_at);
  const daysSince = (Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24);
  const canReturn = isDelivered && !returnDone && daysSince <= 3;

  // COD order that hasn't shipped yet — can pay online
  const canPayOnline =
    order.payment_method === "cod" &&
    ["pending", "processing"].includes(order.status);

  // Load Razorpay
  useEffect(() => {
    if (!canPayOnline) return;
    const s  = document.createElement("script");
    s.src    = "https://checkout.razorpay.com/v1/checkout.js";
    s.async  = true;
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, [canPayOnline]);

  const handlePayOnline = async () => {
    setPayingNow(true);
    const res  = await fetch("/api/orders/pay-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });
    const json = await res.json();

    if (!json.success) {
      toast.error(json.error ?? "Failed to initiate payment");
      setPayingNow(false);
      return;
    }

    const { razorpay_order_id, amount, currency, key, order_id } = json.data;

    const rzp = new window.Razorpay({
      key, amount, currency,
      order_id:    razorpay_order_id,
      name:        "SKM Wardrobe",
      description: "Order Payment",
      theme:       { color: "#db2777" },
      handler: async (response: any) => {
        const verifyRes  = await fetch("/api/orders/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id,
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          }),
        });
        const vj = await verifyRes.json();
        if (!vj.success) {
          toast.error("Payment verification failed");
          setPayingNow(false);
          return;
        }
        toast.success("Payment successful!");
        setOrder((o: any) => ({ ...o, status: "paid", payment_method: "online" }));
        setPayingNow(false);
      },
      modal: {
        ondismiss: () => {
          toast("Payment cancelled", { icon: "ℹ️" });
          setPayingNow(false);
        },
      },
    });

    rzp.open();
    setPayingNow(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    const res  = await fetch("/api/orders/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    });
    const json = await res.json();
    setCancelling(false);
    setShowConfirm(false);

    if (!json.success) { toast.error(json.error ?? "Could not cancel"); return; }
    toast.success("Order cancelled");
    setOrder((o: any) => ({ ...o, status: "cancelled" }));
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) return toast.error("Please enter a reason");
    setSubmittingReturn(true);
    const res  = await fetch("/api/orders/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id, reason: returnReason }),
    });
    const json = await res.json();
    setSubmittingReturn(false);
    if (!json.success) { toast.error(json.error); return; }
    setReturnDone(true);
    setShowReturn(false);
    toast.success("Return request submitted! We'll arrange pickup soon.");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        <ChevronLeft size={18} /> Back to orders
      </button>

      {/* Success banner */}
      {justPlaced && !isCancelled && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-5">
          <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">
              {order.payment_method === "cod"
                ? "Order placed! Pay cash on delivery."
                : "Payment successful! Order confirmed."}
            </p>
            <p className="text-sm text-green-700 mt-0.5">
              We&apos;ll ship within 1-2 business days.
            </p>
          </div>
        </div>
      )}

      {/* Order header */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-5">
        <div className="px-5 py-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 font-mono mb-1">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <h1 className="text-lg font-bold text-gray-900">Order Details</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
              {" · "}
              {order.payment_method === "cod" ? "Cash on Delivery" : "Paid Online"}
            </p>
          </div>
          <span className={cn("text-sm font-semibold px-4 py-1.5 rounded-full", status.bg, status.color)}>
            {status.label}
          </span>
        </div>

        {/* Progress tracker */}
        {!isCancelled && order.status !== "refunded" && (
          <div className="px-5 pb-6 overflow-x-auto">
            <div className="flex items-center min-w-[380px]">
              {STATUS_STEPS.map((step, i) => {
                const done    = i <= activeStep;
                const current = i === activeStep;
                const Icon    = step.icon;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        done ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-400"
                      )}>
                        <Icon size={15} />
                      </div>
                      <p className={cn(
                        "text-[10px] font-medium mt-1.5 text-center w-14 leading-tight",
                        current ? "text-pink-600" : done ? "text-gray-700" : "text-gray-400"
                      )}>
                        {step.label}
                      </p>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={cn(
                        "flex-1 h-0.5 mx-1 mb-5",
                        i < activeStep ? "bg-pink-600" : "bg-gray-200"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracking */}
        {order.delhivery_awb && (
          <div className="mx-5 mb-5 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-purple-600" />
              <div>
                <p className="text-xs font-semibold text-purple-700">Tracking AWB</p>
                <p className="text-sm font-mono text-purple-800">{order.delhivery_awb}</p>
              </div>
            </div>
            <a
              href={`https://www.delhivery.com/track/package/${order.delhivery_awb}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-purple-700 font-semibold hover:underline"
            >
              Track <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Items ({items.length})</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {items.map((item: any) => (
            <div key={item.id} className="flex gap-4 px-5 py-4">
              <div className="relative w-16 h-20 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                <Image
                  src={item.product_image ?? item.product?.images?.[0] ?? "/placeholder.png"}
                  alt={item.product_name} fill className="object-contain p-1" sizes="64px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.product?.slug ?? "#"}`}
                  className="text-sm font-medium text-gray-900 hover:text-pink-600 transition-colors line-clamp-2"
                >
                  {item.product_name}
                </Link>

                {/* ✅ Size badge */}
                {item.size && (
                  <span className="inline-block mt-0.5 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    Size: {item.size}
                  </span>
                )}

                <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  ₹{Number(item.price_at_time).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Price breakdown */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          {order.subtotal > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₹{Number(order.subtotal).toLocaleString("en-IN")}</span>
            </div>
          )}
          {order.gst_amount > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>GST (5%)</span>
              <span>₹{Number(order.gst_amount).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-600">
            <span>Shipping</span>
            <span>₹{Number(order.shipping ?? 40).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
            <span>Total</span>
            <span>₹{Number(order.total).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Address */}
      {addr && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-pink-500" />
            <h2 className="font-semibold text-gray-900">Delivery Address</h2>
          </div>
          <p className="font-medium text-gray-900">{addr.full_name}</p>
          <p className="text-sm text-gray-600 mt-0.5">{addr.phone}</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""},{" "}
            {addr.city}, {addr.state} — {addr.pincode}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">

        {/* Pay Online (COD → Online upgrade) */}
        {canPayOnline && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <Smartphone size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-800">Pay online now</p>
                <p className="text-sm text-blue-600 mt-0.5">
                  Avoid paying cash at delivery. Pay securely via UPI, card or net banking.
                </p>
              </div>
            </div>
            <button
              onClick={handlePayOnline}
              disabled={payingNow}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 text-sm"
            >
              {payingNow
                ? <><Loader2 size={16} className="animate-spin" /> Opening payment...</>
                : <><Smartphone size={16} /> Pay ₹{Number(order.total).toLocaleString("en-IN")} Online</>
              }
            </button>
          </div>
        )}

        {/* Cancel */}
        {canCancel && !showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors text-sm"
          >
            <XCircle size={17} /> Cancel Order
          </button>
        )}

        {/* Confirm cancel dialog */}
        {showConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Cancel this order?</p>
                <p className="text-sm text-red-600 mt-1">
                  This cannot be undone.
                  {order.payment_method === "online" && order.status === "paid"
                    ? " Refund will be processed within 5-7 business days."
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50">
                Keep Order
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors">
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        )}

        {/* Return section */}
        {isDelivered && (
          <div>
            {returnDone ? (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Return requested</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    We&apos;ll arrange pickup within 24-48 hours. Refund after product received.
                  </p>
                </div>
              </div>
            ) : canReturn ? (
              <div>
                {!showReturn ? (
                  <button
                    onClick={() => setShowReturn(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-orange-200 text-orange-600 font-medium rounded-xl hover:bg-orange-50 transition-colors text-sm"
                  >
                    <RotateCcw size={16} /> Request Return &amp; Refund
                  </button>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                    <p className="font-semibold text-orange-800 mb-1">
                      Return &amp; Refund Request
                    </p>
                    <p className="text-xs text-orange-600 mb-4">
                      Refund of ₹{Number(order.total).toLocaleString("en-IN")} will be processed after we receive the product.
                    </p>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Reason for return *
                      </label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                      >
                        <option value="">Select a reason</option>
                        <option value="Wrong item received">Wrong item received</option>
                        <option value="Size/fit issue">Size / fit issue</option>
                        <option value="Quality not as expected">Quality not as expected</option>
                        <option value="Item damaged/defective">Item damaged / defective</option>
                        <option value="Changed my mind">Changed my mind</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowReturn(false)}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReturn}
                        disabled={submittingReturn || !returnReason}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
                      >
                        {submittingReturn
                          ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                          : "Submit Return"
                        }
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center mt-2">
                  {Math.ceil(3 - daysSince)} day{Math.ceil(3 - daysSince) !== 1 ? "s" : ""} remaining in return window
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <RotateCcw size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">
                  Return window expired (3 days from delivery).
                </p>
              </div>
            )}
          </div>
        )}

        {isShipped && (
          <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <Truck size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600">
              Order is on the way. Cancellation not available once shipped.
            </p>
          </div>
        )}

        <Link href="/orders"
          className="block text-center text-sm text-pink-600 hover:text-pink-700 font-medium py-2">
          ← View all orders
        </Link>
      </div>
    </div>
  );
}