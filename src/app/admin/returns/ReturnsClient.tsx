"use client";

import { useState } from "react";
import { RotateCcw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  requested: { label: "Requested", color: "bg-orange-100 text-orange-700"  },
  approved:  { label: "Approved",  color: "bg-blue-100 text-blue-700"      },
  picked:    { label: "Picked up", color: "bg-purple-100 text-purple-700"  },
  refunded:  { label: "Refunded",  color: "bg-green-100 text-green-700"    },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-600"        },
};

export default function ReturnsClient({ initialReturns }: { initialReturns: any[] }) {
  const [returns, setReturns]   = useState(initialReturns);
  const [updating, setUpdating] = useState<string | null>(null);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const res  = await fetch(`/api/admin/returns/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    const json = await res.json();
    setUpdating(null);

    if (!json.success) { toast.error(json.error); return; }
    setReturns((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    toast.success(`Status updated to ${status}`);
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Return Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">{returns.length} requests</p>
      </div>

      {returns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 sm:p-16 text-center">
          <RotateCcw size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No return requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((ret) => {
            const sc    = STATUS_CONFIG[ret.status] ?? STATUS_CONFIG.requested;
            const order = ret.order;
            const addr  = order?.address;

            return (
              <div key={ret.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

                {/* ── Card header ── */}
                <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-gray-400 mb-1">
                      #{ret.id.slice(0, 8).toUpperCase()} · Order #{order?.id?.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="font-semibold text-gray-900 truncate">
                      {addr?.full_name} — {addr?.phone}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {addr?.city}, {addr?.state} {addr?.pincode}
                    </p>
                  </div>

                  {/* Status badge + amount — side-by-side even on mobile */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn("text-xs font-semibold px-3 py-1 rounded-full", sc.color)}>
                      {sc.label}
                    </span>
                    <span className="font-bold text-gray-900 whitespace-nowrap">
                      ₹{Number(ret.refund_amount ?? order?.total ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* ── Card body ── */}
                <div className="px-4 sm:px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Items</p>
                    {order?.items?.map((item: any, i: number) => (
                      <p key={i} className="text-sm text-gray-700">
                        {item.product_name} × {item.quantity} — ₹{Number(item.price_at_time).toLocaleString("en-IN")}
                      </p>
                    ))}
                  </div>

                  {/* Return info */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reason</p>
                    <p className="text-sm text-gray-700 mb-2">{ret.reason}</p>
                    <p className="text-xs text-gray-400">
                      Requested: {new Date(ret.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                    {order?.shiprocket_awb && (
                      <p className="text-xs font-mono text-blue-600 mt-1">AWB: {order.shiprocket_awb}</p>
                    )}
                  </div>
                </div>

                {/* ── Action buttons ── */}
                <div className="px-4 sm:px-5 pb-4 flex flex-wrap gap-2">
                  {ret.status === "requested" && (
                    <>
                      <button
                        onClick={() => updateStatus(ret.id, "approved")}
                        disabled={updating === ret.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                      >
                        {updating === ret.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <CheckCircle size={13} />}
                        Approve Return
                      </button>
                      <button
                        onClick={() => updateStatus(ret.id, "rejected")}
                        disabled={updating === ret.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg disabled:opacity-60"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </>
                  )}

                  {ret.status === "approved" && (
                    <button
                      onClick={() => updateStatus(ret.id, "picked")}
                      disabled={updating === ret.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                    >
                      {updating === ret.id && <Loader2 size={13} className="animate-spin" />}
                      Mark Picked Up
                    </button>
                  )}

                  {ret.status === "picked" && (
                    <button
                      onClick={() => updateStatus(ret.id, "refunded")}
                      disabled={updating === ret.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                    >
                      {updating === ret.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <CheckCircle size={13} />}
                      Mark Refunded
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}