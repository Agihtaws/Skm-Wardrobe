"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Info } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import type { Product, Category, Attribute, AttributeValue, ProductAttribute, ProductVariant } from "@/types/database";
import { slugify, formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

interface AttributeEntry { attrId: string; valueId: string }

interface Props {
  product?: Product & { product_attributes?: ProductAttribute[]; variants?: ProductVariant[] };
  categories: Category[];
  attributes: (Attribute & { values: AttributeValue[] })[];
}

const GST_RATE        = 5;
const SHIPPING_CHARGE = 40;
const COMMON_SIZES    = ["Free Size", "XS", "S", "M", "L", "XL", "XXL", "3XL"];

export default function ProductForm({ product, categories, attributes }: Props) {
  const router = useRouter();
  const isEdit = !!product;

  const [saving, setSaving] = useState(false);

  const [name, setName]               = useState(product?.name ?? "");
  const [slug, setSlug]               = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [gender, setGender]           = useState<string>(
    categories.find((c) => c.id === product?.category_id)?.gender ?? "women"
  );
  const [parentCatId, setParentCatId] = useState<string>("");
  const [categoryId, setCategoryId]   = useState<string>(product?.category_id ?? "");
  const [regularPrice, setRegularPrice] = useState(product?.regular_price?.toString() ?? "");
  const [sellPrice, setSellPrice]       = useState(product?.sell_price?.toString() ?? product?.price?.toString() ?? "");
  const [stock, setStock]               = useState(product?.stock?.toString() ?? "");
  const [isActive, setIsActive]         = useState(product?.is_active ?? true);
  const [images, setImages]             = useState<string[]>(product?.images ?? []);

  const [attrEntries, setAttrEntries] = useState<AttributeEntry[]>(() =>
    product?.product_attributes?.map((pa) => ({
      attrId:  pa.attribute_id,
      valueId: pa.attribute_value_id,
    })) ?? []
  );
  const [newAttrId, setNewAttrId]   = useState("");
  const [newValueId, setNewValueId] = useState("");

  // ── Variants ────────────────────────────────────────────────────────────
  const [variants, setVariants] = useState<{ size: string; stock: string }[]>(() =>
    product?.variants?.map((v) => ({
      size:  v.size,
      stock: String(v.stock),
    })) ?? []
  );

  const addVariant = (size: string) => {
    if (variants.find((v) => v.size === size)) { toast.error(`${size} already added`); return; }
    setVariants((prev) => [...prev, { size, stock: "1" }]);
  };

  const removeVariant = (index: number) =>
    setVariants((prev) => prev.filter((_, i) => i !== index));

  const updateVariantStock = (index: number, s: string) =>
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, stock: s } : v)));

  const variantTotalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);

  // Keep top-level stock field in sync with variant totals
  useEffect(() => {
    if (variants.length > 0) setStock(String(variantTotalStock));
  }, [variantTotalStock, variants.length]);
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (product?.category_id) {
      const cat = categories.find((c) => c.id === product.category_id);
      if (cat?.parent_id) {
        setParentCatId(cat.parent_id);
      } else {
        setParentCatId(product.category_id);
        setCategoryId("");
      }
    }
  }, []);

  const rootCategories  = categories.filter((c) => c.gender === gender && !c.parent_id);
  const subCategories   = parentCatId ? categories.filter((c) => c.parent_id === parentCatId) : [];
  const finalCategoryId = categoryId || parentCatId;

  const sp    = parseFloat(sellPrice) || 0;
  const rp    = parseFloat(regularPrice) || 0;
  const gst   = sp > 0 ? Math.round(sp * (GST_RATE / 100)) : 0;
  const total = sp + gst + SHIPPING_CHARGE;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit) setSlug(slugify(val));
  };

  const addAttrEntry = () => {
    if (!newAttrId || !newValueId) { toast.error("Select attribute and value"); return; }
    if (attrEntries.some((e) => e.attrId === newAttrId && e.valueId === newValueId)) { toast.error("Already added"); return; }
    setAttrEntries((prev) => [...prev, { attrId: newAttrId, valueId: newValueId }]);
    setNewAttrId("");
    setNewValueId("");
  };

  const removeAttrEntry = (idx: number) =>
    setAttrEntries((prev) => prev.filter((_, i) => i !== idx));

  const getAttrLabel = (entry: AttributeEntry) => {
    const attr  = attributes.find((a) => a.id === entry.attrId);
    const value = attr?.values?.find((v) => v.id === entry.valueId);
    return { attr: attr?.name ?? "", value: value?.value ?? "" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalCategoryId)                      { toast.error("Select a category"); return; }
    if (!sellPrice)                            { toast.error("Enter sell price"); return; }
    if (variants.length === 0 && stock === "") { toast.error("Enter stock quantity"); return; }
    if (images.length === 0)                   { toast.error("Add at least one image"); return; }

    setSaving(true);

    const payload = {
      name:            name.trim(),
      slug:            slug.trim() || slugify(name),
      description:     description.trim() || null,
      category_id:     finalCategoryId,
      regular_price:   parseFloat(regularPrice) || parseFloat(sellPrice),
      sell_price:      parseFloat(sellPrice),
      price:           parseFloat(sellPrice),
      gst_rate:        GST_RATE,
      shipping_charge: SHIPPING_CHARGE,
      stock:           variants.length > 0 ? variantTotalStock : parseInt(stock),
      is_active:       isActive,
      images,
      product_attributes: attrEntries,
      variants: variants.map((v, i) => ({
        size:       v.size,
        stock:      parseInt(v.stock) || 0,
        sort_order: i,
      })),
    };

    const res = await fetch(
      isEdit ? `/api/admin/products/${product.id}` : "/api/admin/products",
      { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );

    const json = await res.json();
    if (!json.success) { toast.error(json.error ?? "Save failed"); setSaving(false); return; }

    toast.success(isEdit ? "Product updated" : "Product created");
    router.push("/admin/products");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-5 lg:p-6 pt-16 lg:pt-6 max-w-5xl space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isEdit ? "Edit Product" : "Add New Product"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{isEdit ? product.name : "Fill all required fields"}</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 sm:flex-none px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 sm:flex-none px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg disabled:opacity-60">
            {saving ? "Saving…" : isEdit ? "Update Product" : "Create Product"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-5">

          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Basic Information</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product name *</label>
              <input required value={name} onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Umbrella Kurtis White Pink"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL)</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono" />
              <p className="text-xs text-gray-400 mt-1 break-all">skmwardrobe.in/products/{slug || "auto-generated"}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                placeholder="Product description…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Product Images *</h2>
            <p className="text-xs text-gray-400 mb-4">First image = main thumbnail.</p>
            <ImageUploader images={images} onChange={setImages} />
          </div>

          {/* Attributes */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Attributes</h2>
            <p className="text-xs text-gray-400 mb-4">Add Color, Fabric, Neck etc.</p>
            {attrEntries.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {attrEntries.map((entry, idx) => {
                  const { attr, value } = getAttrLabel(entry);
                  return (
                    <span key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 bg-pink-50 text-pink-700 border border-pink-200 text-sm rounded-full">
                      <span className="font-medium">{attr}:</span> {value}
                      <button type="button" onClick={() => removeAttrEntry(idx)} className="text-pink-400 hover:text-pink-700"><X size={13} /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-end">
              <div className="flex-1 min-w-0 sm:min-w-[140px]">
                <label className="block text-xs text-gray-500 mb-1">Attribute</label>
                <select value={newAttrId} onChange={(e) => { setNewAttrId(e.target.value); setNewValueId(""); }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option value="">Select attribute</option>
                  {attributes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-0 sm:min-w-[140px]">
                <label className="block text-xs text-gray-500 mb-1">Value</label>
                <select value={newValueId} onChange={(e) => setNewValueId(e.target.value)} disabled={!newAttrId}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50">
                  <option value="">Select value</option>
                  {attributes.find((a) => a.id === newAttrId)?.values?.map((v) => (
                    <option key={v.id} value={v.id}>{v.value}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={addAttrEntry}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors">
                <Plus size={15} /> Add
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1"><Info size={12} /> Go to Attributes page to add new colors, fabrics etc.</p>
          </div>

          {/* ── Sizes & Stock ── */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Sizes & Stock</h2>
            <p className="text-xs text-gray-400 mb-4">
              If your product has sizes (S/M/L etc.), add them here with stock per size.
              Leave empty for single-size products — the stock field on the right will be used.
            </p>

            {/* Quick-add buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {COMMON_SIZES.map((size) => (
                <button key={size} type="button" onClick={() => addVariant(size)}
                  disabled={!!variants.find((v) => v.size === size)}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-pink-400 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  + {size}
                </button>
              ))}
            </div>

            {/* Custom size */}
            <div className="flex gap-2 mb-4">
              <input id="custom-size-input" placeholder="Custom size (e.g. 38, 40, 2XL)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) { addVariant(val); (e.target as HTMLInputElement).value = ""; }
                  }
                }}
              />
              <button type="button"
                onClick={() => {
                  const input = document.getElementById("custom-size-input") as HTMLInputElement;
                  if (input?.value.trim()) { addVariant(input.value.trim()); input.value = ""; }
                }}
                className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Add
              </button>
            </div>

            {/* Variant rows */}
            {variants.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
                  <span>Size</span><span>Stock</span><span></span>
                </div>
                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center">
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-semibold text-gray-800">{v.size}</div>
                    <input type="number" min="0" value={v.stock}
                      onChange={(e) => updateVariantStock(i, e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
                    <button type="button" onClick={() => removeVariant(i)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-center">
                      ✕
                    </button>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">
                  Total stock: <span className="font-semibold text-gray-700">{variantTotalStock}</span> pieces
                  {" "}— overwrites the stock field automatically.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No sizes added — product uses single stock from the right panel.</p>
            )}
          </div>
        </div>

        {/* RIGHT rail */}
        <div className="space-y-4">

          {/* Category */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Category *</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
              <select value={gender} onChange={(e) => { setGender(e.target.value); setParentCatId(""); setCategoryId(""); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                <option value="women">Women</option>
                <option value="kids">Kids</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Main category</label>
              <select value={parentCatId} onChange={(e) => { setParentCatId(e.target.value); setCategoryId(""); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                <option value="">Select category</option>
                {rootCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {subCategories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sub category <span className="text-gray-400">(optional)</span></label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option value="">— All {rootCategories.find((c) => c.id === parentCatId)?.name} —</option>
                  {subCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {finalCategoryId && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Saved under: {categories.find((c) => c.id === finalCategoryId)?.name}
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Pricing</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Regular price / MRP (₹) <span className="text-gray-400">shown striked</span></label>
              <input type="number" min="0" step="0.01" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)}
                placeholder="e.g. 560"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sell price (₹) * <span className="text-gray-400">actual selling price</span></label>
              <input required type="number" min="0" step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)}
                placeholder="e.g. 349"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            {sp > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-gray-600 mb-2">Customer sees at checkout:</p>
                <div className="flex justify-between text-gray-600"><span>Product price</span><span>₹{sp.toFixed(0)}</span></div>
                <div className="flex justify-between text-gray-600"><span>GST ({GST_RATE}%)</span><span>₹{gst}</span></div>
                <div className="flex justify-between text-gray-600"><span>Shipping</span><span>₹{SHIPPING_CHARGE}</span></div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5"><span>Total</span><span>₹{total}</span></div>
                {rp > 0 && rp > sp && (
                  <p className="text-green-600 font-medium">Customer saves ₹{(rp - sp).toFixed(0)} ({Math.round(((rp - sp) / rp) * 100)}% off)</p>
                )}
              </div>
            )}
          </div>

          {/* Stock */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Stock</h2>
            <input type="number" min="0" value={stock}
              onChange={(e) => setStock(e.target.value)}
              readOnly={variants.length > 0}
              placeholder="e.g. 10"
              className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                variants.length > 0 ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""
              }`}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              {variants.length > 0 ? "Auto-calculated from sizes above." : "0 = hidden from website automatically."}
            </p>
          </div>

          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Status</h2>
                <p className="text-xs text-gray-400 mt-0.5">{isActive ? "Visible on website" : "Hidden from website"}</p>
              </div>
              <button type="button" onClick={() => setIsActive((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? "bg-pink-600" : "bg-gray-300"}`}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{ left: isActive ? "22px" : "2px" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}