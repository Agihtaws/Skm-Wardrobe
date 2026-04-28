"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingBag, Trash2, AlertTriangle, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const GST_RATE           = 0.05;
const SHIPPING_PER_ITEM  = 40;

export default function CartDrawer() {
  const { items, isOpen, setOpen, removeItem, count, total, inStockItems } = useCartStore();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Trap focus / lock scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else        document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleRemove = async (productId: string) => {
    removeItem(productId);
    try {
      await fetch("/api/cart/remove", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ product_id: productId }),
      });
    } catch (e) {
      console.error("Remove error:", e);
    }
    toast.success("Removed from cart");
  };

  const subtotal   = total();
  const gst        = Math.round(subtotal * GST_RATE);
  const stockItems = inStockItems();
  const shipping   = stockItems.length * SHIPPING_PER_ITEM;
  const orderTotal = subtotal + gst + shipping;
  const hasOOS     = items.some((i) => (i.product?.stock ?? 0) === 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-pink-600" />
            <h2 className="font-bold text-gray-900 text-lg">Your Cart</h2>
            {count() > 0 && (
              <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {count()}
              </span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <ShoppingBag size={52} className="text-gray-200 mb-4" />
              <p className="font-semibold text-gray-700 text-lg">Your cart is empty</p>
              <p className="text-sm text-gray-400 mt-1 mb-6">
                Add products to get started
              </p>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-full hover:bg-pink-700 transition-colors"
              >
                Continue Shopping <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* Out of stock warning */}
              {hasOOS && (
                <div className="mx-4 mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Some items are out of stock and won&apos;t be included in checkout.
                  </p>
                </div>
              )}

              {items.map((item) => {
                const product = item.product as any;
                const oos     = (product?.stock ?? 0) === 0;
                const price   = product?.sell_price ?? product?.price ?? 0;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex gap-3 px-4 py-4 transition-colors",
                      oos && "opacity-60 bg-gray-50"
                    )}
                  >
                    {/* Image */}
                    <Link
                      href={`/products/${product?.slug ?? "#"}`}
                      onClick={() => setOpen(false)}
                      className="relative flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100"
                    >
                      <Image
                        src={product?.images?.[0] ?? "/placeholder.png"}
                        alt={item.product_name ?? product?.name}
                        fill
                        className="object-contain p-1"
                        sizes="80px"
                      />
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <Link
                          href={`/products/${product?.slug ?? "#"}`}
                          onClick={() => setOpen(false)}
                          className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-pink-600 transition-colors"
                        >
                          {product?.name ?? item.product_name}
                        </Link>

                        {oos ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium mt-1">
                            <AlertTriangle size={11} /> Out of stock
                          </span>
                        ) : (
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            ₹{price.toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">Qty: 1</span>
                        <button
                          onClick={() => handleRemove(item.product_id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with totals */}
        {items.length > 0 && stockItems.length > 0 && (
          <div className="border-t border-gray-100 bg-white px-5 py-5 space-y-4">
            {/* Price breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal ({stockItems.length} item{stockItems.length > 1 ? "s" : ""})</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST (5%)</span>
                <span>₹{gst}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping (₹40 × {stockItems.length})</span>
                <span>₹{shipping}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2 text-base">
                <span>Total</span>
                <span>₹{orderTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl transition-colors text-base"
            >
              Proceed to Checkout <ArrowRight size={18} />
            </Link>

            <button
              onClick={() => setOpen(false)}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}

        {/* All items OOS */}
        {items.length > 0 && stockItems.length === 0 && (
          <div className="border-t border-gray-100 px-5 py-5">
            <p className="text-center text-sm text-gray-500 mb-4">
              All items in your cart are out of stock.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="w-full py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}