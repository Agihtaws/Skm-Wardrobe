"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Trash2, ArrowRight, AlertTriangle } from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import toast from "react-hot-toast";

const GST_RATE        = 0.05;
const SHIPPING_PER_ITEM = 40;

export default function CartPageClient({ initialCart }: { initialCart: any[] }) {
  const router = useRouter();
  const { removeItem, setItems } = useCartStore();
  const [items, setLocalItems] = useState(initialCart);

  // ← Sync server data into Zustand store on mount
  // This fixes the empty cart drawer/header count on fresh load
  useEffect(() => {
    setItems(initialCart);
  }, []);

  const validItems = items.filter(
    (i) => i.product?.is_active && (i.product?.stock ?? 0) > 0
  );
  const oosItems = items.filter(
    (i) => !i.product?.is_active || (i.product?.stock ?? 0) === 0
  );

  const subtotal = validItems.reduce(
    (s, i) => s + (i.product.sell_price ?? i.product.price) * i.quantity, 0
  );
  const gst      = Math.round(subtotal * GST_RATE);
  // ← ₹40 per item, not flat ₹40
  const shipping = validItems.length * SHIPPING_PER_ITEM;
  const total    = subtotal + gst + shipping;

  const handleRemove = async (productId: string) => {
    setLocalItems((prev) => prev.filter((i) => i.product_id !== productId));
    removeItem(productId);
    await fetch("/api/cart/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    });
    toast.success("Removed from cart");
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag size={56} className="mx-auto text-gray-200 mb-5" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h1>
        <p className="text-gray-400 mb-8">Add products to get started</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 text-white font-semibold rounded-full hover:bg-pink-700 transition-colors"
        >
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Your Cart ({items.length} item{items.length !== 1 ? "s" : ""})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {oosItems.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                {oosItems.map((i) => i.product?.name).join(", ")}{" "}
                {oosItems.length === 1 ? "is" : "are"} out of stock and won&apos;t be included.
              </p>
            </div>
          )}

          {items.map((item) => {
            const product = item.product;
            const oos     = !product?.is_active || (product?.stock ?? 0) === 0;
            const price   = product?.sell_price ?? product?.price ?? 0;
            const regular = product?.regular_price ?? 0;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 flex gap-4 ${oos ? "opacity-60 border-gray-100" : "border-gray-100"}`}
              >
                <Link
                  href={`/products/${product?.slug ?? "#"}`}
                  className="relative w-20 h-24 sm:w-24 sm:h-28 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100"
                >
                  <Image
                    src={product?.images?.[0] ?? "/placeholder.png"}
                    alt={product?.name ?? ""}
                    fill
                    className="object-contain p-1"
                    sizes="96px"
                  />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/products/${product?.slug ?? "#"}`}
                      className="font-medium text-gray-900 text-sm hover:text-pink-600 transition-colors line-clamp-2"
                    >
                      {product?.name}
                    </Link>
                    {oos && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium mt-1">
                        <AlertTriangle size={11} /> Out of stock
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      {regular > 0 && regular > price && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{regular.toLocaleString("en-IN")}
                        </span>
                      )}
                      {/* Per item shipping notice */}
                      {!oos && (
                        <span className="text-xs text-gray-400">
                          + ₹40 shipping
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({validItems.length} item{validItems.length !== 1 ? "s" : ""})</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (5%)</span>
                <span>₹{gst}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>
                  Shipping
                  <span className="text-xs text-gray-400 ml-1">
                    (₹40 × {validItems.length})
                  </span>
                </span>
                <span>₹{shipping}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-3 text-base">
                <span>Total</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full py-3.5 mt-5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition-colors"
            >
              Proceed to Checkout <ArrowRight size={16} />
            </Link>
            <Link
              href="/"
              className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}