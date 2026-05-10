"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft,
  ShoppingBag, Zap, CheckCircle,
  Package, RotateCcw, ShieldCheck,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import ProductCard from "@/components/ui/ProductCard";
import type { Product, ProductAttribute, ProductVariant } from "@/types/database";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const GST_RATE        = 5;
const SHIPPING_CHARGE = 40;

interface Props {
  product: Product & {
    category?: any;
    product_attributes?: (ProductAttribute & {
      attribute?:       { id: string; name: string };
      attribute_value?: { id: string; value: string };
    })[];
    variants?: ProductVariant[];
  };
  related: Product[];
}

function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);
  const next = () => setActive((i) => (i + 1) % images.length);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 select-none"
        style={{ aspectRatio: "3/4", maxHeight: "440px" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={images[active]}
          alt={`${name} — view ${active + 1}`}
          fill
          className="object-contain p-3"
          sizes="(max-width: 768px) 100vw, 45vw"
          priority={active === 0}
        />
        {images.length > 1 && (
          <>
            <button onClick={prev}
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-md transition-all z-10">
              <ChevronLeft size={16} className="text-gray-700" />
            </button>
            <button onClick={next}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-md transition-all z-10">
              <ChevronRight size={16} className="text-gray-700" />
            </button>
            <div className="absolute bottom-2.5 right-3 bg-black/40 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
              {active + 1}/{images.length}
            </div>
          </>
        )}
        {images.length > 1 && active === 0 && (
          <div className="md:hidden absolute bottom-2.5 left-3 bg-black/30 text-white text-[10px] px-2 py-0.5 rounded-full">
            Swipe ←→
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={cn(
                "relative flex-shrink-0 rounded-xl overflow-hidden border-2 bg-gray-50 transition-all w-14 h-16 sm:w-16 sm:h-20",
                i === active ? "border-pink-500 shadow-sm" : "border-transparent hover:border-gray-300"
              )}>
              <Image src={img} alt={`View ${i + 1}`} fill className="object-contain p-1" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetail({ product, related }: Props) {
  const router   = useRouter();
  const { user } = useAuthStore();
  const { addItem, items, setOpen } = useCartStore();

  const [adding,          setAdding]          = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // ── Variant helpers ────────────────────────────────────────────────────
  const variants    = product.variants;
  const hasVariants = variants && variants.length > 0;
  const selectedVariantObj = variants?.find((v) => v.id === selectedVariant);

  // inCart: match by product + variant so different sizes are separate cart items
  const inCart = items.some(
    (i) => i.product_id === product.id && i.variant_id === (selectedVariant ?? null)
  );

  const outOfStock = hasVariants
    ? !selectedVariantObj || selectedVariantObj.stock === 0
    : product.stock === 0;
  // ──────────────────────────────────────────────────────────────────────

  const regularPrice = product.regular_price ?? 0;
  const sellPrice    = product.sell_price ?? product.price ?? 0;
  const hasDiscount  = regularPrice > 0 && regularPrice > sellPrice;
  const gst          = Math.round(sellPrice * (GST_RATE / 100));
  const totalPayable = sellPrice + gst + SHIPPING_CHARGE;

  // Group attributes
  const attrGroups: Record<string, string[]> = {};
  product.product_attributes?.forEach((pa) => {
    const name  = pa.attribute?.name;
    const value = pa.attribute_value?.value;
    if (name && value) {
      if (!attrGroups[name]) attrGroups[name] = [];
      if (!attrGroups[name].includes(value)) attrGroups[name].push(value);
    }
  });

  const handleAddToCart = async () => {
    if (hasVariants && !selectedVariant) {
      toast.error("Please select a size first");
      return;
    }
    if (inCart) { setOpen(true); return; }
    if (!user) {
      toast("Please login first", { icon: "🔐" });
      router.push(`/login?next=/products/${product.slug}`);
      return;
    }

    setAdding(true);
    try {
      const res  = await fetch("/api/cart/add", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ product_id: product.id, variant_id: selectedVariant ?? null }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error ?? "Could not add to cart"); return; }
      addItem(json.data);
      toast.success(
        selectedVariantObj
          ? `Added to cart — Size: ${selectedVariantObj.size}!`
          : "Added to cart!"
      );
      setOpen(true);
    } catch { toast.error("Something went wrong"); }
    finally  { setAdding(false); }
  };

  const handleBuyNow = async () => {
    if (hasVariants && !selectedVariant) {
      toast.error("Please select a size first");
      return;
    }
    if (!user) {
      toast("Please login first", { icon: "🔐" });
      router.push(`/login?next=/products/${product.slug}`);
      return;
    }
    if (!inCart) {
      setAdding(true);
      try {
        const res  = await fetch("/api/cart/add", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ product_id: product.id, variant_id: selectedVariant ?? null }),
        });
        const json = await res.json();
        if (json.success) addItem(json.data);
      } catch {}
      setAdding(false);
    }
    router.push("/checkout");
  };

  // Breadcrumb
  const cat = product.category;
  const breadcrumbs = [
    { label: "Home", href: "/" },
    ...(cat?.gender ? [{ label: cat.gender.charAt(0).toUpperCase() + cat.gender.slice(1), href: `/${cat.gender}` }] : []),
    ...(cat ? [{ label: cat.name, href: `/${cat.gender}/${cat.slug}` }] : []),
    { label: product.name, href: "#" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-400 mb-4 flex-wrap">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={11} className="flex-shrink-0" />}
            {b.href === "#" ? (
              <span className="text-pink-600 font-medium truncate max-w-[160px]">{b.label}</span>
            ) : (
              <Link href={b.href} className="hover:text-pink-600 transition-colors whitespace-nowrap">{b.label}</Link>
            )}
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-8">

        {/* Left: Gallery */}
        <div className="md:sticky md:top-20 md:self-start">
          <ImageGallery
            images={product.images.length ? product.images : ["/placeholder.png"]}
            name={product.name}
          />
        </div>

        {/* Right: Info */}
        <div className="flex flex-col gap-4">

          {/* Name + Price */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-pink-700 leading-snug">{product.name}</h1>
            <div className="flex items-baseline gap-3 mt-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-pink-600">
                ₹{sellPrice.toLocaleString("en-IN")}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-gray-400 line-through">₹{regularPrice.toLocaleString("en-IN")}</span>
                  <span className="text-sm font-bold text-green-600">
                    {Math.round(((regularPrice - sellPrice) / regularPrice) * 100)}% off
                  </span>
                </>
              )}
            </div>
            {/* Stock indicator — show variant stock if selected, else total */}
            <p className={cn(
              "text-sm font-semibold mt-1.5",
              outOfStock
                ? "text-red-500"
                : (hasVariants ? selectedVariantObj?.stock : product.stock) === 1
                ? "text-amber-600"
                : "text-green-600"
            )}>
              {hasVariants
                ? selectedVariantObj
                  ? selectedVariantObj.stock === 0
                    ? "Out of stock"
                    : selectedVariantObj.stock === 1
                    ? "⚠️ Only 1 left!"
                    : "In stock"
                  : "Select a size"
                : product.stock === 0
                ? "Out of stock"
                : product.stock === 1
                ? "⚠️ Only 1 left!"
                : "In stock"}
            </p>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed border-t border-pink-100 pt-4">
              {product.description}
            </p>
          )}

          {/* Attributes */}
          {Object.keys(attrGroups).length > 0 && (
            <div className="space-y-2.5 border-t border-pink-100 pt-4">
              {Object.entries(attrGroups).map(([name, values]) => (
                <div key={name} className="flex items-start gap-3">
                  <span className="text-[11px] font-bold text-pink-400 uppercase tracking-widest w-16 sm:w-20 flex-shrink-0 pt-1.5">
                    {name}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {values.map((v) => (
                      <span key={v} className="px-3 py-1 bg-pink-50 text-pink-700 text-sm rounded-full border border-pink-200">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Size selector ── */}
          {hasVariants && (
            <div className="border-t border-pink-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Size *</p>
                {selectedVariantObj && (
                  <p className={cn(
                    "text-xs font-semibold",
                    selectedVariantObj.stock <= 1 ? "text-amber-600" : "text-green-600"
                  )}>
                    {selectedVariantObj.stock === 0
                      ? "Out of stock"
                      : selectedVariantObj.stock === 1
                      ? "Only 1 left!"
                      : `${selectedVariantObj.stock} in stock`}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {[...(variants ?? [])]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((v) => {
                    const isSelected = selectedVariant === v.id;
                    const isOOS      = v.stock === 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={isOOS}
                        onClick={() => setSelectedVariant(isSelected ? null : v.id)}
                        className={cn(
                          "relative px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all",
                          isOOS
                            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                            : isSelected
                            ? "border-pink-600 bg-pink-600 text-white shadow-md"
                            : "border-gray-200 text-gray-700 hover:border-pink-400 hover:bg-pink-50"
                        )}
                      >
                        {v.size}
                        {isOOS && (
                          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-400 rounded-full border-2 border-white" />
                        )}
                      </button>
                    );
                  })}
              </div>

              {!selectedVariant && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  ⚠️ Please select a size to continue
                </p>
              )}
            </div>
          )}

          {/* Price breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 border border-pink-100">
            <div className="flex justify-between text-gray-600"><span>Product price</span><span>₹{sellPrice.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-gray-600"><span>GST ({GST_RATE}%)</span><span>₹{gst}</span></div>
            <div className="flex justify-between text-gray-600"><span>Shipping</span><span>₹{SHIPPING_CHARGE}</span></div>
            <div className="flex justify-between font-bold text-pink-700 border-t border-pink-200 pt-2">
              <span>Total payable</span><span>₹{totalPayable.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* CTA */}
          {outOfStock && !hasVariants ? (
            <div className="py-3.5 bg-gray-100 text-gray-500 text-center rounded-xl font-medium text-sm">
              Currently unavailable
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={handleAddToCart} disabled={adding}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl font-semibold text-sm transition-all border-2",
                  inCart
                    ? "bg-pink-50 text-pink-700 border-pink-300 hover:bg-pink-100"
                    : "bg-white border-pink-600 text-pink-600 hover:bg-pink-50"
                )}>
                {adding ? (
                  <><Loader2 size={16} className="animate-spin" /> Adding...</>
                ) : inCart ? (
                  <><CheckCircle size={16} /> View Cart</>
                ) : (
                  <><ShoppingBag size={16} /> Add to Cart</>
                )}
              </button>
              <button onClick={handleBuyNow} disabled={adding}
                className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60">
                <Zap size={16} /> Buy Now
              </button>
            </div>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 border-t border-pink-100 pt-4">
            {[
              { icon: Package,     text: "Delhivery shipping" },
              { icon: RotateCcw,   text: "3-day returns"      },
              { icon: ShieldCheck, text: "Secure payment"     },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Icon size={15} className="text-pink-600" />
                </div>
                <span className="text-[11px] text-gray-500 leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-10 sm:mt-14">
          <h2 className="text-lg sm:text-xl font-bold text-pink-700 mb-4">You may also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}