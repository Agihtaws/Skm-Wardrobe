"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MapPin, Plus, ChevronRight, CheckCircle,
  Loader2, Smartphone, Banknote, AlertTriangle,
} from "lucide-react";
import type { Address } from "@/types/database";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart.store";

declare global {
  interface Window { Razorpay: any; }
}

const GST_RATE          = 0.05;
const SHIPPING_PER_ITEM = 40;

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

interface CartProduct {
  id: string; name: string; slug: string;
  sell_price: number; price: number;
  stock: number; images: string[]; is_active: boolean;
}
interface CartItem {
  id: string; product_id: string; quantity: number; product: CartProduct;
}
interface Props {
  initialCart: CartItem[];
  initialAddresses: Address[];
}

const EMPTY_ADDR = {
  full_name: "", phone: "", line1: "", line2: "",
  city: "", state: "Tamil Nadu", pincode: "", is_default: false,
};

export default function CheckoutClient({ initialCart, initialAddresses }: Props) {
  const router = useRouter();
  const { clear: clearCartStore } = useCartStore();

  const [addresses, setAddresses]       = useState<Address[]>(initialAddresses);
  const [selectedAddr, setSelectedAddr] = useState<string>(
    initialAddresses.find((a) => a.is_default)?.id ?? initialAddresses[0]?.id ?? ""
  );
  const [payMethod, setPayMethod] = useState<"online" | "cod">("online");
  const [placing, setPlacing]     = useState(false);
  const [showAddrForm, setShowAddrForm] = useState(initialAddresses.length === 0);
  const [addrForm, setAddrForm]         = useState(EMPTY_ADDR);
  const [savingAddr, setSavingAddr]     = useState(false);

  const validItems = initialCart.filter(
    (i) => i.product?.is_active && (i.product?.stock ?? 0) > 0
  );
  const oosItems = initialCart.filter(
    (i) => !i.product?.is_active || (i.product?.stock ?? 0) === 0
  );

  const subtotal   = validItems.reduce((s, i) => s + (i.product.sell_price ?? i.product.price) * i.quantity, 0);
  const gst        = Math.round(subtotal * GST_RATE);
  const shipping   = validItems.length * SHIPPING_PER_ITEM; // ← per item
  const orderTotal = subtotal + gst + shipping;

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src   = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrForm.full_name || !addrForm.phone || !addrForm.line1 || !addrForm.city || !addrForm.pincode)
      return toast.error("Please fill all required fields");
    if (!/^\d{10}$/.test(addrForm.phone))  return toast.error("Enter valid 10-digit phone");
    if (!/^\d{6}$/.test(addrForm.pincode)) return toast.error("Enter valid 6-digit pincode");

    setSavingAddr(true);
    const res  = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addrForm),
    });
    const json = await res.json();
    setSavingAddr(false);

    if (!json.success) return toast.error(json.error);
    setAddresses((prev) => [json.data, ...prev]);
    setSelectedAddr(json.data.id);
    setShowAddrForm(false);
    setAddrForm(EMPTY_ADDR);
    toast.success("Address saved");
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddr)      return toast.error("Select a delivery address");
    if (!validItems.length) return toast.error("No valid items in cart");

    setPlacing(true);

    const res  = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address_id: selectedAddr, payment_method: payMethod }),
    });
    const json = await res.json();

    if (!json.success) {
      toast.error(json.error ?? "Failed to place order");
      setPlacing(false);
      return;
    }

    // ── COD flow ──
    if (payMethod === "cod") {
      clearCartStore();
      router.push(`/orders/${json.data.order_id}?placed=cod`);
      return;
    }

    // ── Razorpay flow ──
    const { razorpay_order_id, amount, currency, key, order_id } = json.data;

    const rzp = new window.Razorpay({
      key,
      amount,
      currency,
      order_id:    razorpay_order_id,
      name:        "SKM Wardrobe",
      description: "Order Payment",
      theme:       { color: "#db2777" },

      handler: async (response: any) => {
        // Payment succeeded — verify
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
        const verifyJson = await verifyRes.json();

        if (!verifyJson.success) {
          toast.error("Payment verification failed. Contact support.");
          setPlacing(false);
          return;
        }

        clearCartStore();
        router.push(`/orders/${order_id}?placed=online`);
      },

      modal: {
        // User closed without paying → abandon the pending order
        ondismiss: async () => {
          toast("Payment cancelled", { icon: "ℹ️" });
          await fetch("/api/orders/abandon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id }),
          });
          setPlacing(false);
        },
      },
    });

    rzp.open();
    setPlacing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* OOS warning */}
            {oosItems.length > 0 && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Some items removed</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {oosItems.map((i) => i.product?.name).join(", ")} {oosItems.length === 1 ? "is" : "are"} out of stock.
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Address */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-pink-600 text-white text-xs font-bold rounded-full flex items-center justify-center">1</div>
                  <h2 className="font-semibold text-gray-900">Delivery Address</h2>
                </div>
                <button
                  onClick={() => setShowAddrForm((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-pink-600 font-medium hover:text-pink-700"
                >
                  <Plus size={15} />
                  {showAddrForm ? "Cancel" : "Add New"}
                </button>
              </div>

              {/* Existing addresses */}
              {addresses.length > 0 && !showAddrForm && (
                <div className="divide-y divide-gray-50">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={cn(
                        "flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors",
                        selectedAddr === addr.id ? "bg-pink-50" : "hover:bg-gray-50"
                      )}
                    >
                      <input
                        type="radio" name="address" value={addr.id}
                        checked={selectedAddr === addr.id}
                        onChange={() => setSelectedAddr(addr.id)}
                        className="mt-1 accent-pink-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{addr.full_name}</p>
                          <p className="text-xs text-gray-500">{addr.phone}</p>
                          {addr.is_default && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""},{" "}
                          {addr.city}, {addr.state} — {addr.pincode}
                        </p>
                      </div>
                      {selectedAddr === addr.id && (
                        <CheckCircle size={18} className="text-pink-600 flex-shrink-0 mt-1" />
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Add address form */}
              {(showAddrForm || addresses.length === 0) && (
                <form onSubmit={saveAddress} className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Full name *</label>
                      <input value={addrForm.full_name}
                        onChange={(e) => setAddrForm((f) => ({ ...f, full_name: e.target.value }))}
                        placeholder="Recipient full name"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
                      <input value={addrForm.phone}
                        onChange={(e) => setAddrForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="10-digit mobile" maxLength={10}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Address line 1 *</label>
                      <input value={addrForm.line1}
                        onChange={(e) => setAddrForm((f) => ({ ...f, line1: e.target.value }))}
                        placeholder="House no., Street, Area"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Address line 2 <span className="text-gray-400">(optional)</span>
                      </label>
                      <input value={addrForm.line2}
                        onChange={(e) => setAddrForm((f) => ({ ...f, line2: e.target.value }))}
                        placeholder="Landmark, Apartment, etc."
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                      <input value={addrForm.city}
                        onChange={(e) => setAddrForm((f) => ({ ...f, city: e.target.value }))}
                        placeholder="City"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pincode *</label>
                      <input value={addrForm.pincode}
                        onChange={(e) => setAddrForm((f) => ({ ...f, pincode: e.target.value }))}
                        placeholder="6-digit pincode" maxLength={6}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
                      <select value={addrForm.state}
                        onChange={(e) => setAddrForm((f) => ({ ...f, state: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={addrForm.is_default}
                          onChange={(e) => setAddrForm((f) => ({ ...f, is_default: e.target.checked }))}
                          className="accent-pink-600"
                        />
                        <span className="text-sm text-gray-600">Set as default address</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {addresses.length > 0 && (
                      <button type="button" onClick={() => setShowAddrForm(false)}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                    )}
                    <button type="submit" disabled={savingAddr}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg disabled:opacity-60">
                      {savingAddr ? <Loader2 size={15} className="animate-spin" /> : null}
                      {savingAddr ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Step 2: Payment */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <div className="w-6 h-6 bg-pink-600 text-white text-xs font-bold rounded-full flex items-center justify-center">2</div>
                <h2 className="font-semibold text-gray-900">Payment Method</h2>
              </div>
              <div className="p-4 space-y-3">
                {/* Online */}
                <label className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  payMethod === "online" ? "border-pink-500 bg-pink-50" : "border-gray-200 hover:border-gray-300"
                )}>
                  <input type="radio" name="payment" value="online"
                    checked={payMethod === "online"}
                    onChange={() => setPayMethod("online")}
                    className="accent-pink-600"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Smartphone size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Pay Online</p>
                      <p className="text-xs text-gray-500">UPI, Cards, Net Banking via Razorpay</p>
                    </div>
                  </div>
                  {payMethod === "online" && <CheckCircle size={18} className="text-pink-600 flex-shrink-0" />}
                </label>

                {/* COD */}
                <label className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  payMethod === "cod" ? "border-pink-500 bg-pink-50" : "border-gray-200 hover:border-gray-300"
                )}>
                  <input type="radio" name="payment" value="cod"
                    checked={payMethod === "cod"}
                    onChange={() => setPayMethod("cod")}
                    className="accent-pink-600"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Banknote size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Cash on Delivery</p>
                      <p className="text-xs text-gray-500">Pay when your order arrives</p>
                    </div>
                  </div>
                  {payMethod === "cod" && <CheckCircle size={18} className="text-pink-600 flex-shrink-0" />}
                </label>
              </div>
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-24">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">
                  Order Summary ({validItems.length} item{validItems.length !== 1 ? "s" : ""})
                </h2>
              </div>

              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {validItems.map((item) => {
                  const price = item.product.sell_price ?? item.product.price;
                  return (
                    <div key={item.id} className="flex gap-3 px-4 py-3">
                      <div className="relative w-14 h-16 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                        <Image
                          src={item.product.images?.[0] ?? "/placeholder.png"}
                          alt={item.product.name}
                          fill className="object-contain p-1" sizes="56px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 line-clamp-2">{item.product.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">₹{price.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-4 space-y-2.5 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST (5%)</span><span>₹{gst}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping (₹40 × {validItems.length})</span>
                  <span>₹{shipping}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-3">
                  <span>Total Payable</span><span>₹{orderTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing || !selectedAddr || validItems.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60 text-base"
                >
                  {placing ? (
                    <><Loader2 size={18} className="animate-spin" /> Processing...</>
                  ) : (
                    <>{payMethod === "cod" ? "Place Order (COD)" : "Pay Now"} <ChevronRight size={18} /></>
                  )}
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">
                  By placing, you agree to our{" "}
                  <a href="/returns" className="text-pink-600 hover:underline">3-day return policy</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}