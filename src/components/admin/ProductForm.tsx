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

type LocalAttribute = Attribute & { values: AttributeValue[] };

const GST_RATE        = 5;
const SHIPPING_CHARGE = 40;
const COMMON_SIZES    = ["Free Size", "XS", "S", "M", "L", "XL", "XXL", "3XL"];

export default function ProductForm({ product, categories, attributes: initialAttributes }: Props) {
  const router = useRouter();
  const isEdit = !!product;

  const [saving, setSaving] = useState(false);

  // Live attributes list — grows when user creates new ones inline
  const [attributes, setAttributes] = useState<LocalAttribute[]>(initialAttributes);

  // Inline "create new attribute" UI
  const [showNewAttr,   setShowNewAttr]   = useState(false);
  const [newAttrInput,  setNewAttrInput]  = useState("");
  const [creatingAttr,  setCreatingAttr]  = useState(false);

  // Inline "create new value" UI (per attribute)
  const [showNewValue,   setShowNewValue]   = useState(false);
  const [newValueInput,  setNewValueInput]  = useState("");
  const [creatingValue,  setCreatingValue]  = useState(false);

  const [name,        setName]        = useState(product?.name        ?? "");
  const [slug,        setSlug]        = useState(product?.slug        ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [gender,      setGender]      = useState<string>(
    categories.find((c) => c.id === product?.category_id)?.gender ?? "women"
  );
  const [parentCatId,   setParentCatId]   = useState<string>("");
  const [categoryId,    setCategoryId]    = useState<string>(product?.category_id ?? "");
  const [regularPrice,  setRegularPrice]  = useState(product?.regular_price?.toString() ?? "");
  const [sellPrice,     setSellPrice]     = useState(product?.sell_price?.toString() ?? product?.price?.toString() ?? "");
  const [stock,         setStock]         = useState(product?.stock?.toString() ?? "");
  const [weightKg,      setWeightKg]      = useState(product?.weight_kg?.toString() ?? "0.3");  // ✅
  const [isActive,      setIsActive]      = useState(product?.is_active ?? true);
  const [images,        setImages]        = useState<string[]>(product?.images ?? []);

  const [attrEntries, setAttrEntries] = useState<AttributeEntry[]>(() =>
    product?.product_attributes?.map((pa) => ({
      attrId:  pa.attribute_id,
      valueId: pa.attribute_value_id,
    })) ?? []
  );
  const [newAttrId,  setNewAttrId]  = useState("");
  const [newValueId, setNewValueId] = useState("");

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

  useEffect(() => {
    if (variants.length > 0) setStock(String(variantTotalStock));
  }, [variantTotalStock, variants.length]);

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

  const createAttributeInline = async () => {
    const name = newAttrInput.trim();
    if (!name) return;
    setCreatingAttr(true);
    try {
      const res  = await fetch("/api/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed");
      const created: LocalAttribute = { ...json.data, values: [] };
      setAttributes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewAttrId(created.id);
      setNewValueId("");
      setNewAttrInput("");
      setShowNewAttr(false);
      toast.success(`Attribute "${name}" created`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setCreatingAttr(false);
  };

  const createValueInline = async () => {
    const value = newValueInput.trim();
    if (!value || !newAttrId) return;
    setCreatingValue(true);
    try {
      const res  = await fetch("/api/admin/attribute-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attribute_id: newAttrId, value }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed");
      const newVal: AttributeValue = json.data;
      setAttributes((prev) =>
        prev.map((a) =>
          a.id === newAttrId ? { ...a, values: [...a.values, newVal] } : a
        )
      );
      setNewValueId(newVal.id);
      setNewValueInput("");
      setShowNewValue(false);
      toast.success(`Value "${value}" created`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setCreatingValue(false);
  };

  const addAttrEntry = () => {
    if (!newAttrId || !newValueId) { toast.error("Select attribute and value"); return; }
    if (attrEntries.some((e) => e.attrId === newAttrId && e.valueId === newValueId)) { toast.error("Already added"); return; }
    setAttrEntries((prev) => [...prev, { attrId: newAttrId, valueId: newValueId }]);
    setNewAttrId(""); setNewValueId("");
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
      weight_kg:       parseFloat(weightKg) || 0.3,   // ✅
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

    toast.success(isEdit ? "Product updated!" : "Product created!");
    router.push("/admin/products");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Product" : "New Product"}</h1>
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors">
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

        {/* LEFT — main content */}
        <div className="space-y-6">

          {/* Basic info */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Basic Info</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product name *</label>
              <input required value={name} onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Silk Saree with Blouse"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">URL slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                rows={4} placeholder="Describe the product…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Images *</h2>
            <ImageUploader images={images} onChange={setImages} />
          </div>

          {/* Attributes */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Attributes <span className="text-xs font-normal text-gray-400">(colour, fabric, etc.)</span></h2>
            {attrEntries.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {attrEntries.map((entry, idx) => {
                  const { attr, value } = getAttrLabel(entry);
                  return (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-pink-700 text-xs rounded-full border border-pink-100">
                      {attr}: {value}
                      <button type="button" onClick={() => removeAttrEntry(idx)} className="hover:text-red-500">
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Row 1: Attribute select + "New attribute" toggle */}
            <div className="flex gap-2">
              <select value={newAttrId} onChange={(e) => { setNewAttrId(e.target.value); setNewValueId(""); setShowNewValue(false); }}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                <option value="">Select attribute</option>
                {attributes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => { setShowNewAttr((v) => !v); setShowNewValue(false); }}
                title="Create new attribute"
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${showNewAttr ? "bg-pink-600 text-white border-pink-600" : "border-gray-200 text-gray-600 hover:border-pink-400 hover:text-pink-600"}`}
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Inline: create new attribute */}
            {showNewAttr && (
              <div className="flex gap-2 p-3 bg-pink-50 rounded-lg border border-pink-100">
                <input
                  autoFocus
                  value={newAttrInput}
                  onChange={(e) => setNewAttrInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createAttributeInline())}
                  placeholder="New attribute name (e.g. Neck, Sleeve…)"
                  className="flex-1 px-3 py-1.5 text-sm border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                />
                <button
                  type="button"
                  onClick={createAttributeInline}
                  disabled={creatingAttr || !newAttrInput.trim()}
                  className="px-3 py-1.5 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-lg disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {creatingAttr ? "…" : "Create"}
                </button>
                <button type="button" onClick={() => setShowNewAttr(false)} className="px-2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Row 2: Value select + "New value" toggle (only when attribute selected) */}
            {newAttrId && (
              <div className="flex gap-2">
                <select value={newValueId} onChange={(e) => setNewValueId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option value="">Select value</option>
                  {attributes.find((a) => a.id === newAttrId)?.values?.map((v) => (
                    <option key={v.id} value={v.id}>{v.value}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowNewValue((v) => !v); setShowNewAttr(false); }}
                  title="Create new value"
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${showNewValue ? "bg-pink-600 text-white border-pink-600" : "border-gray-200 text-gray-600 hover:border-pink-400 hover:text-pink-600"}`}
                >
                  <Plus size={15} />
                </button>
                <button type="button" onClick={addAttrEntry}
                  className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
                  Add
                </button>
              </div>
            )}

            {/* Inline: create new value */}
            {showNewValue && newAttrId && (
              <div className="flex gap-2 p-3 bg-pink-50 rounded-lg border border-pink-100">
                <input
                  autoFocus
                  value={newValueInput}
                  onChange={(e) => setNewValueInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createValueInline())}
                  placeholder={`New value for "${attributes.find((a) => a.id === newAttrId)?.name}" (e.g. Red, Cotton…)`}
                  className="flex-1 px-3 py-1.5 text-sm border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                />
                <button
                  type="button"
                  onClick={createValueInline}
                  disabled={creatingValue || !newValueInput.trim()}
                  className="px-3 py-1.5 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-lg disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {creatingValue ? "…" : "Create"}
                </button>
                <button type="button" onClick={() => setShowNewValue(false)} className="px-2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Add button when no attribute selected yet (old single-row flow fallback) */}
            {!newAttrId && (
              <button type="button" onClick={addAttrEntry}
                className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors hidden">
                <Plus size={16} />
              </button>
            )}
          </div>

          {/* Sizes / Variants */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 space-y-3">
            <h2 className="font-semibold text-gray-800">Sizes <span className="text-xs font-normal text-gray-400">(optional — for size-specific stock)</span></h2>
            <div className="flex flex-wrap gap-2">
              {COMMON_SIZES.map((size) => (
                <button key={size} type="button" onClick={() => addVariant(size)}
                  disabled={!!variants.find((v) => v.size === size)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-pink-50 hover:border-pink-300 hover:text-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {size}
                </button>
              ))}
            </div>
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
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-center">✕</button>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">
                  Total stock: <span className="font-semibold text-gray-700">{variantTotalStock}</span> pieces — overwrites the stock field automatically.
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

          {/* Weight ✅ NEW */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Weight (kg)</h2>
            <p className="text-xs text-gray-400 mb-3">Used for courier charge calculation</p>
            <div className="relative">
              <input
                type="number" min="0.1" max="5" step="0.05"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="0.3"
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kg</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[0.2, 0.3, 0.4, 0.5].map((w) => (
                <button key={w} type="button"
                  onClick={() => setWeightKg(String(w))}
                  className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                    parseFloat(weightKg) === w
                      ? "bg-pink-600 text-white border-pink-600"
                      : "border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600"
                  }`}>
                  {w}kg
                </button>
              ))}
            </div>
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