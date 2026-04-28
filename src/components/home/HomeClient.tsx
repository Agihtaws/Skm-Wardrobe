"use client";

import {
  useState, useEffect, useCallback, useRef
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft, ChevronRight, ArrowRight, ShoppingBag,
  CheckCircle, Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import type { Category, Product } from "@/types/database";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Section { category: Category; products: Product[] }
interface Props {
  sections: Section[];
  carouselItems: Category[];
  allTopCategories: Category[];
}

// ─── Carousel ────────────────────────────────────────────────────────────────
function HeroCarousel({ items }: { items: Category[] }) {
  const [current, setCurrent] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((idx: number) => {
    setCurrent((idx + items.length) % items.length);
  }, [items.length]);

  const resetTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (items.length > 1) {
      timer.current = setInterval(() => setCurrent((c) => (c + 1) % items.length), 4500);
    }
  }, [items.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [resetTimer]);

  const handlePrev = () => { go(current - 1); resetTimer(); };
  const handleNext = () => { go(current + 1); resetTimer(); };

  if (!items.length) return null;

  const LABELS: Record<string, string> = {
    women: "Women's Collection", kids: "Kids' Collection", accessories: "Accessories",
  };

  return (
    <div className="relative w-full overflow-hidden bg-gray-100">
      {/* Track */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {items.map((cat, i) => (
          <Link
            key={cat.id}
            href={`/${cat.gender}/${cat.slug}`}
            className="relative flex-shrink-0 w-full"
            style={{ aspectRatio: "16/6" }}
          >
            <Image
              src={cat.image_url!}
              alt={cat.name}
              fill
              className="object-cover object-top"
              priority={i === 0}
              sizes="100vw"
            />
            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
            {/* Text */}
            <div className="absolute bottom-0 left-0 px-6 py-5 sm:px-12 sm:py-8 max-w-lg">
              <p className="text-xs sm:text-sm font-bold text-pink-300 tracking-widest uppercase mb-1">
                {LABELS[cat.gender ?? ""] ?? ""}
              </p>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                {cat.name}
              </h2>
              <span className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 bg-pink-600 text-white text-sm font-semibold rounded-full hover:bg-pink-700 transition-colors">
                Shop Now <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Arrows */}
      {items.length > 1 && (
        <>
          <button onClick={handlePrev}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all z-10">
            <ChevronLeft size={18} className="text-gray-700" />
          </button>
          <button onClick={handleNext}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all z-10">
            <ChevronRight size={18} className="text-gray-700" />
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
          {items.map((_, i) => (
            <button key={i} onClick={() => { go(i); resetTimer(); }}
              className={cn(
                "rounded-full transition-all",
                i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Category strip ───────────────────────────────────────────────────────────
function CategoryStrip({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;

  return (
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex gap-4 sm:gap-6 overflow-x-auto py-4 scrollbar-hide justify-start">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${cat.gender}/${cat.slug}`}
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-gray-100 group-hover:border-pink-500 transition-all bg-gray-50 shadow-sm flex-shrink-0">
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt={cat.name}
                    width={80} height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl bg-pink-50">
                    {cat.gender === "women" ? "👗" : cat.gender === "kids" ? "🧒" : "👜"}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-700 group-hover:text-pink-600 transition-colors text-center max-w-[72px] leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Home Product Card (with arrow navigation, no hover swap) ────────────────
function HomeProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { user }  = useAuthStore();
  const { addItem, items } = useCartStore();
  const [imgIdx,  setImgIdx]  = useState(0);
  const [adding,  setAdding]  = useState(false);

  const inCart     = items.some((i) => i.product_id === product.id);
  const sellPrice  = product.sell_price ?? product.price ?? 0;
  const regular    = product.regular_price ?? 0;
  const hasDiscount = regular > 0 && regular > sellPrice;
  const hasMultiple = product.images.length > 1;

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImgIdx((i) => (i - 1 + product.images.length) % product.images.length);
  };
  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImgIdx((i) => (i + 1) % product.images.length);
  };

  const handleCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCart) { router.push("/cart"); return; }
    if (!user) {
      toast("Please login to add to cart", { icon: "🔐" });
      router.push(`/login?next=/products/${product.slug}`);
      return;
    }

    setAdding(true);
    try {
      const res  = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error ?? "Could not add"); return; }
      addItem(json.data);
      toast.success("Added to cart!");
    } catch { toast.error("Something went wrong"); }
    finally { setAdding(false); }
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-pink-100 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative bg-gray-50 overflow-hidden" style={{ aspectRatio: "3/4" }}>
        <Image
          src={product.images[imgIdx] ?? "/placeholder.png"}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {/* Arrow buttons */}
        {hasMultiple && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
            >
              <ChevronLeft size={14} className="text-gray-600" />
            </button>
            <button
              onClick={nextImg}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
            >
              <ChevronRight size={14} className="text-gray-600" />
            </button>
          </>
        )}

        {/* Image dots */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
            {product.images.slice(0, 5).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === imgIdx ? "bg-pink-500" : "bg-gray-300"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info — centred */}
      <div className="flex flex-col items-center text-center gap-1.5 p-3 flex-1">
        <p className="text-sm text-gray-800 font-medium leading-tight line-clamp-2 w-full">
          {product.name}
        </p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-900">
            ₹{sellPrice.toLocaleString("en-IN")}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-gray-400 line-through">
                ₹{regular.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-green-600 font-semibold">
                {Math.round(((regular - sellPrice) / regular) * 100)}% off
              </span>
            </>
          )}
        </div>

        <button
          onClick={handleCart}
          disabled={adding}
          className={cn(
            "mt-1 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold transition-all",
            inCart
              ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              : "bg-pink-600 hover:bg-pink-700 text-white"
          )}
        >
          {adding ? (
            <><Loader2 size={12} className="animate-spin" /> Adding...</>
          ) : inCart ? (
            <><CheckCircle size={12} /> In Cart — View</>
          ) : (
            <><ShoppingBag size={12} /> Add to Cart</>
          )}
        </button>
      </div>
    </Link>
  );
}

// ─── Product Section ──────────────────────────────────────────────────────────
function ProductSection({ section }: { section: Section }) {
  const { category, products } = section;
  const href = `/${category.gender}/${category.slug}`;
  const show = products.slice(0, 8);

  return (
    <section className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {category.image_url && (
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-pink-200 flex-shrink-0">
                <Image src={category.image_url} alt={category.name}
                  width={36} height={36} className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {category.name} Collections
              </h2>
              <p className="text-xs text-gray-400">{products.length} products</p>
            </div>
          </div>
          <Link href={href}
            className="flex items-center gap-1.5 text-sm text-pink-600 font-semibold hover:text-pink-700 transition-colors whitespace-nowrap">
            View All <ArrowRight size={15} />
          </Link>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-pink-500 via-pink-300 to-transparent mb-5" />

        {/* 4-column grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {show.map((product, i) => (
            <HomeProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length > 8 && (
          <div className="mt-6 text-center">
            <Link href={href}
              className="inline-flex items-center gap-2 px-7 py-2.5 border-2 border-pink-500 text-pink-600 font-semibold text-sm rounded-full hover:bg-pink-600 hover:text-white transition-all">
              View All {category.name} <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeClient({ sections, carouselItems, allTopCategories }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Carousel */}
      {carouselItems.length > 0 ? (
        <HeroCarousel items={carouselItems} />
      ) : (
        <div className="bg-gradient-to-br from-pink-50 via-white to-rose-50 border-b border-pink-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
            <p className="text-sm font-bold text-pink-500 tracking-widest uppercase mb-3">
              Welcome to SKM Wardrobe
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Ethnic Wear for <span className="text-pink-600">Women & Kids</span>
            </h1>
            <p className="text-gray-500 mt-3 text-base max-w-md mx-auto">
              Add category images in admin to enable the hero carousel.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link href="/women"
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-full transition-colors">
                Shop Women&apos;s
              </Link>
              <Link href="/kids"
                className="px-6 py-3 border-2 border-pink-600 text-pink-600 font-bold rounded-full hover:bg-pink-50 transition-colors">
                Shop Kids
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Category strip */}
      <CategoryStrip categories={allTopCategories} />

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-5xl mb-4">🛍️</p>
          <p className="text-gray-600 font-bold text-xl">No products yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Add products in the admin panel to see them here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 bg-gray-50">
          {sections.map((section) => (
            <ProductSection key={section.category.id} section={section} />
          ))}
        </div>
      )}

      
    </div>
  );
}