"use client";

import { useState } from "react";
import { Plus, Trash2, Tag, Loader2 } from "lucide-react";
import type { Attribute, AttributeValue } from "@/types/database";
import toast from "react-hot-toast";

interface Props {
  initialAttributes: (Attribute & { values: AttributeValue[] })[];
}

async function apiFetch(url: string, options?: RequestInit) {
  const res  = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Request failed");
  return json.data;
}

export default function AttributesClient({ initialAttributes }: Props) {
  const [attributes, setAttributes] = useState(initialAttributes);
  const [newAttrName, setNewAttrName] = useState("");
  const [newValues, setNewValues]     = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [valueLoading, setValueLoading] = useState<Record<string, boolean>>({});

  const refresh = async () => {
    try {
      const data = await apiFetch("/api/admin/attributes");
      setAttributes(data ?? []);
    } catch (e: any) {
      console.error("Refresh failed:", e);
    }
  };

  const addAttribute = async () => {
    const name = newAttrName.trim();
    if (!name) return;

    setLoading(true);
    try {
      await apiFetch("/api/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      toast.success("Attribute added");
      setNewAttrName("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const deleteAttribute = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its values?`)) return;
    try {
      await apiFetch(`/api/admin/attributes/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      setAttributes((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addValue = async (attributeId: string) => {
    const value = newValues[attributeId]?.trim();
    if (!value) return;

    setValueLoading((v) => ({ ...v, [attributeId]: true }));
    try {
      await apiFetch("/api/admin/attribute-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attribute_id: attributeId, value }),
      });
      toast.success("Value added");
      setNewValues((v) => ({ ...v, [attributeId]: "" }));
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
    setValueLoading((v) => ({ ...v, [attributeId]: false }));
  };

  const deleteValue = async (id: string, attrId: string) => {
    try {
      await apiFetch(`/api/admin/attribute-values/${id}`, { method: "DELETE" });
      setAttributes((prev) =>
        prev.map((a) =>
          a.id === attrId
            ? { ...a, values: a.values.filter((v) => v.id !== id) }
            : a
        )
      );
      toast.success("Removed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attributes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage Color, Fabric, Size and other product attributes
        </p>
      </div>

      {/* Add attribute */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Add New Attribute
        </h2>
        <div className="flex gap-3">
          <input
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && addAttribute()}
            placeholder="e.g. Color, Fabric, Neck, Sleeve, Size..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <button
            onClick={addAttribute}
            disabled={loading || !newAttrName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors min-w-[90px] justify-center"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Plus size={16} /> Add
              </>
            )}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {attributes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Tag size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No attributes yet</p>
            <p className="text-sm mt-1">Add your first attribute above</p>
          </div>
        )}

        {attributes.map((attr) => (
          <div
            key={attr.id}
            className="bg-white rounded-xl border border-gray-100 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Tag size={15} className="text-pink-500" />
                <p className="font-semibold text-gray-800">{attr.name}</p>
                <span className="text-xs text-gray-400">
                  ({attr.values?.length ?? 0} values)
                </span>
              </div>
              <button
                onClick={() => deleteAttribute(attr.id, attr.name)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete attribute"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                {attr.values?.map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                  >
                    {v.value}
                    <button
                      onClick={() => deleteValue(v.id, attr.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors leading-none ml-0.5"
                      title="Remove value"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {!attr.values?.length && (
                  <p className="text-xs text-gray-400 py-1">
                    No values yet — add below
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={newValues[attr.id] ?? ""}
                  onChange={(e) =>
                    setNewValues((v) => ({ ...v, [attr.id]: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && addValue(attr.id)
                  }
                  placeholder={`Add ${attr.name} value (e.g. Red, Blue...)`}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  onClick={() => addValue(attr.id)}
                  disabled={!newValues[attr.id]?.trim() || valueLoading[attr.id]}
                  className="px-3 py-1.5 text-sm bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 min-w-[52px] flex items-center justify-center"
                >
                  {valueLoading[attr.id] ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    "Add"
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}