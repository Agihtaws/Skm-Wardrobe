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
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────
function HeroCarousel({ items }: { items: Category[] }) {
  const [current, setCurrent] = useState(0);
  const [perPage, setPerPage] = useState(5);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = items.length;
  const maxSlide = Math.max(0, total - perPage);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setPerPage(3);
      else if (window.innerWidth < 1024) setPerPage(4);
      else setPerPage(5);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const go = useCallback(
    (idx: number) => setCurrent(Math.max(0, Math.min(idx, maxSlide))),
    [maxSlide]
  );

  const resetTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (total > perPage) {
      timer.current = setInterval(() => {
        setCurrent((c) => (c >= maxSlide ? 0 : c + 1));
      }, 3000);
    }
  }, [total, perPage, maxSlide]);

  useEffect(() => {
    resetTimer();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [resetTimer]);

  if (!items.length) return null;

  const LABELS: Record<string, string> = {
    women: "Women's",
    kids: "Kids'",
    accessories: "Accessories",
  };

  const GAP = 10;

  return (
    <div className="bg-pink-50 border-b border-pink-100 pt-0 pb-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header row with nav arrows */}
        <div className="flex items-center justify-between mb-3">
          {total > perPage && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { go(current - 1); resetTimer(); }}
                disabled={current === 0}
                className="w-6 h-6 bg-pink-50 hover:bg-pink-600 hover:text-white border border-pink-200 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => { go(current + 1); resetTimer(); }}
                disabled={current >= maxSlide}
                className="w-6 h-6 bg-pink-50 hover:bg-pink-600 hover:text-white border border-pink-200 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Sliding track */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              gap: `${GAP}px`,
              transform: `translateX(calc(-${current} * (${100 / perPage}% + ${GAP / perPage}px)))`,
            }}
          >
            {items.map((cat) => (
              <Link
                key={cat.id}
                href={`/${cat.gender}/${cat.slug}`}
                className="group flex-shrink-0"
                style={{ width: `calc(${100 / perPage}% - ${(GAP * (perPage - 1)) / perPage}px)` }}
              >
                <div className="rounded-xl overflow-hidden border border-gray-100 group-hover:border-pink-300 group-hover:shadow-md transition-all duration-300 bg-white">
                  {/* Image — 3:4 portrait, object-contain so nothing gets cut */}
                  <div className="relative w-full bg-gray-50" style={{ aspectRatio: "3 / 5" }}>
                    <Image
                      src={cat.image_url!}
                      alt={cat.name}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, 20vw"
                    />
                    {/* Gender badge */}
                    {cat.gender && LABELS[cat.gender] && (
                      <div className="absolute top-2 left-2 bg-pink-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
                        {LABELS[cat.gender]}
                      </div>
                    )}
                  </div>
                  {/* Name strip */}
                  <div className="bg-white border-t border-gray-100 px-2.5 py-2">
                    <p className="text-gray-900 font-bold text-xs leading-tight truncate">
                      {cat.name}
                    </p>
                    <p className="text-pink-500 text-[10px] mt-0.5 font-medium">
                      Shop now →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Dots */}
        {total > perPage && (
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: maxSlide + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => { go(i); resetTimer(); }}
                className={`transition-all rounded-full ${
                  i === current
                    ? "w-4 h-1.5 bg-pink-600"
                    : "w-1.5 h-1.5 bg-gray-300 hover:bg-pink-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Home Product Card ────────────────────────────────────────────────────────
function HomeProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem, items } = useCartStore();
  const [imgIdx, setImgIdx] = useState(0);
  const [adding, setAdding] = useState(false);

  const inCart      = items.some((i) => i.product_id === product.id);
  const sellPrice   = product.sell_price ?? product.price ?? 0;
  const regular     = product.regular_price ?? 0;
  const hasDiscount = regular > 0 && regular > sellPrice;
  const hasMultiple = product.images.length > 1;

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setImgIdx((i) => (i - 1 + product.images.length) % product.images.length);
  };
  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setImgIdx((i) => (i + 1) % product.images.length);
  };

  const handleCart = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
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
      className="group flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-pink-100 transition-all duration-200"
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

        {hasDiscount && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
            {Math.round(((regular - sellPrice) / regular) * 100)}% OFF
          </div>
        )}

        {hasMultiple && (
          <>
            <button onClick={prevImg}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10">
              <ChevronLeft size={12} className="text-gray-600" />
            </button>
            <button onClick={nextImg}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10">
              <ChevronRight size={12} className="text-gray-600" />
            </button>
          </>
        )}

        {hasMultiple && (
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 z-10">
            {product.images.slice(0, 5).map((_, i) => (
              <div key={i}
                className={cn("w-1 h-1 rounded-full transition-colors",
                  i === imgIdx ? "bg-pink-500" : "bg-gray-300")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col items-center text-center gap-1 p-2.5 flex-1">
        <p className="text-xs text-gray-800 font-medium leading-tight line-clamp-2 w-full">
          {product.name}
        </p>

        <div className="flex items-center justify-center gap-1.5 flex-wrap mt-0.5">
          <span className="text-sm font-bold text-gray-900">
            ₹{sellPrice.toLocaleString("en-IN")}
          </span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-400 line-through">
              ₹{regular.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <button
          onClick={handleCart}
          disabled={adding}
          className={cn(
            "mt-1.5 flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all",
            inCart
              ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              : "bg-pink-600 hover:bg-pink-700 text-white"
          )}
        >
          {adding ? (
            <><Loader2 size={11} className="animate-spin" /> Adding...</>
          ) : inCart ? (
            <><CheckCircle size={11} /> In Cart — View</>
          ) : (
            <><ShoppingBag size={11} /> Add to Cart</>
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
    <section className="py-5 sm:py-7">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {category.image_url && (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-pink-200 flex-shrink-0">
                <Image src={category.image_url} alt={category.name}
                  width={32} height={32} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                {category.name}
              </h2>
              <p className="text-[10px] text-gray-400">{products.length} products</p>
            </div>
          </div>
          <Link href={href}
            className="flex items-center gap-1 text-xs text-pink-600 font-semibold hover:text-pink-700 transition-colors whitespace-nowrap border border-pink-200 rounded-full px-3 py-1 hover:bg-pink-50">
            View All <ArrowRight size={12} />
          </Link>
        </div>

        {/* Pink accent line */}
        <div className="h-px bg-gradient-to-r from-pink-500 via-pink-200 to-transparent mb-4" />

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
          {show.map((product) => (
            <HomeProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length > 8 && (
          <div className="mt-5 text-center">
            <Link href={href}
              className="inline-flex items-center gap-2 px-6 py-2 border-2 border-pink-500 text-pink-600 font-semibold text-sm rounded-full hover:bg-pink-600 hover:text-white transition-all">
              View All {category.name} <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeClient({ sections, carouselItems }: Props) {
  return (
    <div className="min-h-screen bg-pink-50">

      {/* Carousel or fallback banner */}
      {carouselItems.length > 0 ? (
        <HeroCarousel items={carouselItems} />
      ) : (
        <div className="bg-gradient-to-br from-pink-50 via-white to-rose-50 border-b border-pink-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
            <p className="text-xs font-bold text-pink-500 tracking-widest uppercase mb-2">
              Welcome to SKM Wardrobe
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Ethnic Wear for{" "}
              <span className="text-pink-600">Women & Kids</span>
            </h1>
            <p className="text-gray-400 mt-2 text-sm max-w-sm mx-auto">
              Add category images in admin to enable the hero carousel.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-5">
              <Link href="/women"
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-full transition-colors text-sm">
                Shop Women&apos;s
              </Link>
              <Link href="/kids"
                className="px-6 py-2.5 border-2 border-pink-600 text-pink-600 font-bold rounded-full hover:bg-pink-50 transition-colors text-sm">
                Shop Kids
              </Link>
            </div>
          </div>
        </div>
      )}


      {/* Product sections */}
      {sections.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-5xl mb-4">🛍️</p>
          <p className="text-gray-600 font-bold text-xl">No products yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Add products in the admin panel to see them here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-pink-100 bg-pink-50">
          {sections.map((section) => (
            <ProductSection key={section.category.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}