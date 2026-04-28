import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Orders" };
export const revalidate = 0;

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:    { label: "Order Placed",      color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400"   },
  paid:       { label: "Payment Confirmed", color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"   },
  processing: { label: "Processing",        color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  shipped:    { label: "Shipped",           color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  delivered:  { label: "Delivered",         color: "bg-green-100 text-green-700",   dot: "bg-green-500"  },
  cancelled:  { label: "Cancelled",         color: "bg-red-100 text-red-500",       dot: "bg-red-400"    },
  refunded:   { label: "Refunded",          color: "bg-orange-100 text-orange-600", dot: "bg-orange-400" },
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, status, total, created_at, payment_method,
      items:order_items(id, product_name, product_image, price_at_time, quantity)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Package size={20} className="text-pink-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {orders?.length ?? 0} order{(orders?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {!orders?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-600 font-semibold text-lg">No orders yet</p>
          <p className="text-sm text-gray-400 mt-2 mb-6">
            Your orders will appear here after checkout
          </p>
          <Link href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white font-semibold text-sm rounded-full hover:bg-pink-700 transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const st         = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const items      = order.items ?? [];
            const firstItem  = items[0];
            const extraCount = items.length - 1;
            const isOnline   = order.payment_method !== "cod";
            const isCancelled = order.status === "cancelled";

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-2xl border border-gray-100 hover:border-pink-200 hover:shadow-sm transition-all overflow-hidden"
              >
                <div className="flex gap-4 p-4 sm:p-5">
                  {/* Product image */}
                  <div className={`relative w-16 h-20 sm:w-20 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 ${isCancelled ? "opacity-50" : ""}`}>
                    {firstItem?.product_image ? (
                      <Image
                        src={firstItem.product_image}
                        alt={firstItem.product_name ?? "Product"}
                        fill
                        className="object-contain p-1"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={20} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm leading-snug ${isCancelled ? "text-gray-400 line-through" : "text-gray-900"}`}>
                          {firstItem?.product_name ?? "Order"}
                          {extraCount > 0 && (
                            <span className="text-gray-400 font-normal ml-1">
                              +{extraCount} more
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>

                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <p className="text-base font-bold text-gray-900">
                          ₹{Number(order.total).toLocaleString("en-IN")}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isOnline ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
                            {isOnline ? "Online" : "COD"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Bottom progress bar for active orders */}
                {!isCancelled && order.status !== "refunded" && (
                  <div className="px-4 pb-3">
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-500 rounded-full transition-all"
                        style={{
                          width: `${(["pending","paid","processing","shipped","delivered"].indexOf(order.status) + 1) * 20}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      {["Placed","Confirmed","Processing","Shipped","Delivered"].map((s, i) => (
                        <span key={s} className={`text-[9px] font-medium ${
                          i <= ["pending","paid","processing","shipped","delivered"].indexOf(order.status)
                            ? "text-pink-600"
                            : "text-gray-300"
                        }`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}