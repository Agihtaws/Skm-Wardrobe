"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, CheckCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import type { Product } from "@/types/database";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: Props) {
  const router         = useRouter();
  const { user }       = useAuthStore();
  const { addItem, items } = useCartStore();
  const [imgIdx,  setImgIdx]  = useState(0);
  const [adding,  setAdding]  = useState(false);

  const inCart     = items.some((i) => i.product_id === product.id);
  const outOfStock = product.stock === 0;
  const sellPrice  = product.sell_price ?? product.price ?? 0;
  const regular    = product.regular_price ?? 0;
  const hasDiscount  = regular > 0 && regular > sellPrice;
  const hasMultiple  = product.images.length > 1;

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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCart) {
      router.push("/cart");
      return;
    }
    if (!user) {
      toast("Please login to add to cart", { icon: "🔐" });
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
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-pink-100 transition-all duration-200"
    >
      {/* Image */}
      <div
        className="relative bg-gray-50 overflow-hidden"
        style={{ aspectRatio: "3/4" }}
      >
        <Image
          src={product.images[imgIdx] ?? "/placeholder.png"}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
          priority={priority}
        />

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
              Out of stock
            </span>
          </div>
        )}

        {/* Arrow buttons — show on hover */}
        {hasMultiple && (
          <>
            <button
  onClick={prevImg}
  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-all z-10"
>
  <ChevronLeft size={14} className="text-gray-600" />
</button>
<button
  onClick={nextImg}
  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-all z-10"
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

        {/* Price */}
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

        {/* Cart button */}
        <button
          onClick={handleAddToCart}
          disabled={outOfStock || adding}
          className={cn(
            "mt-1 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold transition-all",
            outOfStock
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : inCart
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