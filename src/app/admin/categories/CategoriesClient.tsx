"use client";

import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Loader2, ImageIcon } from "lucide-react";
import type { Category } from "@/types/database";
import toast from "react-hot-toast";
import { slugify } from "@/lib/utils";

const GENDERS = ["women", "kids", "accessories"] as const;

interface Props { initialCategories: Category[] }

async function apiFetch(url: string, options?: RequestInit) {
  const res  = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Request failed");
  return json.data;
}

export default function CategoriesClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "", slug: "", gender: "women" as typeof GENDERS[number],
    parent_id: "", sort_order: 0, image_url: "",
  });

  const refresh = async () => {
    try {
      const data = await apiFetch("/api/admin/categories");
      setCategories(data ?? []);
    } catch (e: any) { console.error(e); }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Select an image");
    if (file.size > 3 * 1024 * 1024) return toast.error("Max 3MB");

    setImgUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res  = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const json = await res.json();
    setImgUploading(false);

    if (!json.success) return toast.error(json.error);
    setForm((f) => ({ ...f, image_url: json.data.url }));
    toast.success("Image uploaded");
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", slug: "", gender: "women", parent_id: "", sort_order: 0, image_url: "" });
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setForm({
      name: cat.name, slug: cat.slug,
      gender: (cat.gender ?? "women") as typeof GENDERS[number],
      parent_id: cat.parent_id ?? "", sort_order: cat.sort_order,
      image_url: (cat as any).image_url ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setLoading(true);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      gender: form.gender,
      parent_id: form.parent_id || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: true,
      image_url: form.image_url || null,
    };

    try {
      if (editTarget) {
        await apiFetch(`/api/admin/categories/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Updated");
      } else {
        await apiFetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Category added");
      }
      setShowForm(false);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleDelete = async (cat: Category) => {
    const hasChildren = categories.some((c) => c.parent_id === cat.id);
    if (hasChildren) { toast.error("Remove subcategories first"); return; }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await apiFetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
      toast.success("Deleted");
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (e: any) { toast.error(e.message); }
  };

  const byGender = GENDERS.map((g) => ({
    gender: g,
    roots: categories.filter((c) => c.gender === g && !c.parent_id),
  }));

  const getChildren = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  const toggle = (id: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const parentOptions = categories.filter(
    (c) => c.gender === form.gender && !c.parent_id && c.id !== editTarget?.id
  );

  const renderNode = (cat: Category, depth = 0) => {
    const children = getChildren(cat.id);
    const isExp    = expanded.has(cat.id);
    return (
      <div key={cat.id}>
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg group hover:bg-gray-50 ${depth > 0 ? "ml-6" : ""}`}>
          {children.length > 0 ? (
            <button onClick={() => toggle(cat.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              {isExp ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : <span className="w-4 flex-shrink-0" />}

          {/* Category image preview */}
          {(cat as any).image_url ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
              <img src={(cat as any).image_url} alt={cat.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ImageIcon size={13} className="text-gray-300" />
            </div>
          )}

          <span className="flex-1 text-sm text-gray-800 font-medium">{cat.name}</span>
          <span className="text-xs text-gray-400 font-mono mr-2">/{cat.slug}</span>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            <button onClick={() => openEdit(cat)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
              <Pencil size={14} />
            </button>
            <button onClick={() => handleDelete(cat)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {isExp && children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} categories</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editTarget ? `Edit: ${editTarget.name}` : "New Category"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category name *</label>
                <input required value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                  placeholder="e.g. Cotton Sarees"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                <input value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Section *</label>
                <select value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as any, parent_id: "" }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Parent category <span className="text-gray-400">(empty = top level)</span>
                </label>
                <select value={form.parent_id}
                  onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option value="">— Top level —</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sort order</label>
                <input type="number" value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            {/* Category image */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Category Image <span className="text-gray-400">(shown on home page carousel)</span>
              </label>
              <div className="flex items-center gap-4">
                {form.image_url ? (
                  <div className="relative w-24 h-28 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                    <img src={form.image_url} alt="Category" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-28 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <ImageIcon size={20} className="text-gray-300" />
                  </div>
                )}
                <div>
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    disabled={imgUploading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                  >
                    {imgUploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                    {imgUploading ? "Uploading..." : "Upload Image"}
                  </button>
                  <p className="text-xs text-gray-400 mt-1.5">
                    PNG, JPG up to 3MB. Shows in home carousel.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg disabled:opacity-60 min-w-[130px] justify-center">
                {loading ? <Loader2 size={15} className="animate-spin" /> : (editTarget ? "Update" : "Add Category")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {byGender.map(({ gender, roots }) => (
          <div key={gender} className="border-b border-gray-100 last:border-b-0">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {gender === "women" ? "👗" : gender === "kids" ? "🧒" : "👜"} {gender}
              </p>
            </div>
            <div className="p-2">
              {roots.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-3">No categories yet</p>
              ) : roots.map((c) => renderNode(c))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}