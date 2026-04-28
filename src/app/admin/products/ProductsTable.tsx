"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Product, Category } from "@/types/database";
import toast from "react-hot-toast";

interface Props {
  products: (Product & { category?: Category })[];
}

export default function ProductsTable({ products: initial }: Props) {
  const router  = useRouter();
  const [products, setProducts] = useState(initial);
  const [search, setSearch]     = useState("");

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActive = async (product: Product) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);
    if (error) { toast.error(error.message); return; }
    setProducts((prev) =>
      prev.map((p) => p.id === product.id ? { ...p, is_active: !p.is_active } : p)
    );
    toast.success(product.is_active ? "Hidden from store" : "Visible on store");
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) { toast.error(json.error); return; }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    toast.success("Product deleted");
  };

  return (
    <>
      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full sm:w-80 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Product", "Category", "MRP / Price", "Stock", "Status", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 group">
                  {/* Product name + image */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        <div className="w-12 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                          <img src={product.images[0]} alt={product.name}
                            className="w-full h-full object-contain"
                            style={{ objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-14 flex-shrink-0 rounded-lg bg-gray-100" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1 max-w-[180px]">{product.name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{product.category?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    {product.regular_price > 0 && product.regular_price !== product.sell_price ? (
                      <div>
                        <span className="line-through text-gray-400 text-xs">₹{product.regular_price}</span>
                        <span className="font-semibold text-gray-900 ml-1">₹{product.sell_price}</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-gray-900">₹{product.sell_price || product.price}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`font-semibold ${product.stock === 0 ? "text-red-500" : product.stock <= 3 ? "text-amber-600" : "text-green-600"}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${product.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {product.is_active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/admin/products/${product.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button onClick={() => toggleActive(product)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title={product.is_active ? "Hide" : "Show"}
                      >
                        {product.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button onClick={() => handleDelete(product)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="text-center text-gray-400 text-sm py-12">No products found</p>
          )}
        </div>
      </div>
    </>
  );
}