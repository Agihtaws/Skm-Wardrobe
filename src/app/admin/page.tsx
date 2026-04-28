import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { Package, ShoppingBag, Clock, TrendingUp } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };
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

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalProducts },
    { count: totalOrders },
    { count: pendingOrders },
    { count: lowStock },
    { data: orders },
    { data: revenue },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["paid", "processing"]),
    supabase.from("products").select("*", { count: "exact", head: true }).lte("stock", 1).eq("is_active", true),
    supabase.from("orders")
      .select("id, status, total, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("orders")
      .select("total")
      .in("status", ["paid", "processing", "shipped", "delivered"]),
  ]);

  const totalRevenue = revenue?.reduce((s, o) => s + Number(o.total), 0) ?? 0;

  const STATS = [
    { label: "Active Products",    value: totalProducts ?? 0,          icon: Package,     color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Total Orders",       value: totalOrders ?? 0,            icon: ShoppingBag, color: "text-green-600",  bg: "bg-green-50" },
    { label: "Needs Action",       value: pendingOrders ?? 0,          icon: Clock,       color: "text-amber-600",  bg: "bg-amber-50" },
    { label: "Total Revenue",      value: formatPrice(totalRevenue),   icon: TrendingUp,  color: "text-pink-600",   bg: "bg-pink-50" },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">SKM Wardrobe overview</p>
        </div>
        <Link href="/admin/products/new"
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Low stock warning */}
      {(lowStock ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-medium">
            ⚠️ {lowStock} product{(lowStock ?? 0) > 1 ? "s" : ""} with stock ≤ 1
          </p>
          <Link href="/admin/products?filter=low_stock"
            className="text-xs text-amber-700 font-semibold hover:underline"
          >
            View →
          </Link>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-pink-600 hover:underline">View all →</Link>
        </div>
        {!orders?.length ? (
          <p className="text-center text-gray-400 text-sm py-10">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Order ID", "Status", "Amount", "Date", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">#{o.id.slice(0, 8)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold">₹{Number(o.total).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="text-pink-600 text-xs hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}