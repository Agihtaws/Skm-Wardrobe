"use client";

import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

interface Props {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
}

export default function FilterSidebar({ categories, selectedCategory, onCategoryChange }: Props) {
  if (!categories.length) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Category
        </p>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => onCategoryChange("")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                !selectedCategory
                  ? "bg-pink-50 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              All
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => onCategoryChange(cat.id === selectedCategory ? "" : cat.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  cat.id === selectedCategory
                    ? "bg-pink-50 text-pink-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}