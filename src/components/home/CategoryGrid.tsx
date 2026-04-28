import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/types/database";

const CATEGORY_META: Record<string, { emoji: string; bg: string; desc: string }> = {
  women:       { emoji: "👗", bg: "bg-pink-50 hover:bg-pink-100 border-pink-100",   desc: "Sarees, Kurtis, Chudidars & more" },
  kids:        { emoji: "🧒", bg: "bg-blue-50 hover:bg-blue-100 border-blue-100",   desc: "Boys & Girls ethnic wear" },
  accessories: { emoji: "👜", bg: "bg-amber-50 hover:bg-amber-100 border-amber-100", desc: "Umbrellas, Purses & Handbags" },
};

interface Props {
  categories: Category[];
}

export default function CategoryGrid({ categories }: Props) {
  if (!categories.length) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat.gender ?? ""] ?? {
            emoji: "🛍️",
            bg: "bg-gray-50 hover:bg-gray-100 border-gray-100",
            desc: "",
          };
          return (
            <Link
              key={cat.id}
              href={`/${cat.slug}`}
              className={`flex items-center justify-between p-6 rounded-2xl border transition-all group ${meta.bg}`}
            >
              <div>
                <span className="text-3xl">{meta.emoji}</span>
                <p className="mt-3 font-semibold text-gray-900 text-lg">{cat.name}</p>
                <p className="text-sm text-gray-500 mt-1">{meta.desc}</p>
              </div>
              <ArrowRight
                size={20}
                className="text-gray-400 group-hover:text-gray-700 group-hover:translate-x-1 transition-all flex-shrink-0"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}