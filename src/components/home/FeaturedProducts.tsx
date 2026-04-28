import Link from "next/link";
import ProductCard from "@/components/ui/ProductCard";
import type { Product } from "@/types/database";

interface Props {
  products: Product[];
}

export default function FeaturedProducts({ products }: Props) {
  if (!products.length) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">New Arrivals</h2>
        <Link
          href="/women"
          className="text-sm text-pink-600 hover:text-pink-700 font-medium hover:underline"
        >
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 4} />
        ))}
      </div>
    </section>
  );
}