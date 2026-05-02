import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Orders" };
export const revalidate = 0;

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-gray-100 text-gray-600",
  paid:       "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  shipped:    "bg-purple-100 text-purple-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-600",
  refunded:   "bg-orange-100 text-orange-700",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, status, total, created_at, payment_method, shiprocket_awb, delhivery_awb")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);
  const { data: orders } = await query;

  const STATUSES = ["all", "pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">{orders?.length ?? 0} orders</p>
      </div>

      {/* Status filter — horizontally scrollable on mobile */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/orders" : `/admin/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              (s === "all" && !status) || s === status
                ? "bg-pink-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {/* Table — scrolls horizontally on mobile */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Order ID", "Status", "Amount", "Method", "Tracking", "Date", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders?.map((order) => {
                const awb = (order as any).shiprocket_awb ?? order.delhivery_awb ?? null;
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-5 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 font-semibold whitespace-nowrap">
                      ₹{Number(order.total).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        (order as any).payment_method === "cod"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700"
                      }`}>
                        {(order as any).payment_method === "cod" ? "COD" : "Online"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {awb ?? "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-pink-600 text-xs font-medium hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!orders?.length && (
            <p className="text-center text-gray-400 text-sm py-12">No orders found</p>
          )}
        </div>
      </div>
    </div>
  );
}