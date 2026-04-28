"use client";

import { useState, useRef, useCallback } from "react";
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
import type { Product, ProductAttribute } from "@/types/database";
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
  };
  related: Product[];
}

function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className="relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-100"
        style={{ aspectRatio: "3/4", maxHeight: "440px" }}
      >
        <Image
          src={images[active]}
          alt={`${name} — view ${active + 1}`}
          fill
          className="object-contain p-3"
          sizes="(max-width: 768px) 100vw, 45vw"
          priority={active === 0}
        />

        {/* Counter badge */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 right-3 bg-black/40 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
            {active + 1}/{images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative flex-shrink-0 rounded-xl overflow-hidden border-2 bg-gray-50 transition-all",
                "w-14 h-16 sm:w-16 sm:h-20",
                i === active
                  ? "border-pink-500 shadow-sm"
                  : "border-transparent hover:border-gray-300"
              )}
            >
              <Image
                src={img}
                alt={`View ${i + 1}`}
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductDetail({ product, related }: Props) {
  const router       = useRouter();
  const { user }     = useAuthStore();
  const { addItem, items, setOpen } = useCartStore();
  const [adding, setAdding] = useState(false);

  const inCart     = items.some((i) => i.product_id === product.id);
  const outOfStock = product.stock === 0;

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
        body:    JSON.stringify({ product_id: product.id }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error ?? "Could not add to cart");
        return;
      }
      addItem(json.data);
      toast.success("Added to cart!");
      setOpen(true);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
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
          body:    JSON.stringify({ product_id: product.id }),
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
              <span className="text-gray-600 font-medium truncate max-w-[160px]">
                {b.label}
              </span>
            ) : (
              <Link href={b.href} className="hover:text-pink-600 transition-colors whitespace-nowrap">
                {b.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Main layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-8">

        {/* ── Left: Image Gallery ── */}
        <div className="md:sticky md:top-20 md:self-start">
          <ImageGallery
            images={product.images.length ? product.images : ["/placeholder.png"]}
            name={product.name}
          />
        </div>

        {/* ── Right: Product Info ── */}
        <div className="flex flex-col gap-4">

          {/* Name + Price */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 mt-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                ₹{sellPrice.toLocaleString("en-IN")}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-gray-400 line-through">
                    ₹{regularPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    {Math.round(((regularPrice - sellPrice) / regularPrice) * 100)}% off
                  </span>
                </>
              )}
            </div>

            <p className={cn(
              "text-sm font-semibold mt-1.5",
              outOfStock ? "text-red-500" : product.stock === 1 ? "text-amber-600" : "text-green-600"
            )}>
              {outOfStock ? "Out of stock" : product.stock === 1 ? "⚠️ Only 1 left!" : "In stock"}
            </p>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
              {product.description}
            </p>
          )}

          {/* Attributes */}
          {Object.keys(attrGroups).length > 0 && (
            <div className="space-y-2.5 border-t border-gray-100 pt-4">
              {Object.entries(attrGroups).map(([name, values]) => (
                <div key={name} className="flex items-start gap-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest w-16 sm:w-20 flex-shrink-0 pt-1.5">
                    {name}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {values.map((v) => (
                      <span key={v} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Price breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 border border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>Product price</span>
              <span>₹{sellPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST ({GST_RATE}%)</span>
              <span>₹{gst}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>₹{SHIPPING_CHARGE}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total payable</span>
              <span>₹{totalPayable.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* CTA Buttons */}
          {outOfStock ? (
            <div className="py-3.5 bg-gray-100 text-gray-500 text-center rounded-xl font-medium text-sm">
              Currently unavailable
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={adding}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl font-semibold text-sm transition-all border-2",
                  inCart
                    ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                    : "bg-white border-pink-600 text-pink-600 hover:bg-pink-50"
                )}
              >
                {adding ? (
                  <><Loader2 size={16} className="animate-spin" /> Adding...</>
                ) : inCart ? (
                  <><CheckCircle size={16} /> View Cart</>
                ) : (
                  <><ShoppingBag size={16} /> Add to Cart</>
                )}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={adding}
                className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
              >
                <Zap size={16} /> Buy Now
              </button>
            </div>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
            {[
              { icon: Package,    text: "Delhivery shipping" },
              { icon: RotateCcw, text: "3-day returns"       },
              { icon: ShieldCheck,text: "Secure payment"     },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
                  <Icon size={15} className="text-pink-500" />
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
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
            You may also like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}