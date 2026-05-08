"use client";

import { Fragment } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) => {
        const prev = pages[i - 1];
        return (
          // key must be on Fragment, not on children inside it
          <Fragment key={p}>
            {prev && p - prev > 1 && (
              <span className="px-2 text-gray-400 text-sm">…</span>
            )}
            <button
              onClick={() => onPageChange(p)}
              className={cn(
                "w-9 h-9 rounded-lg text-sm font-medium transition-colors",
                p === page
                  ? "bg-pink-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {p}
            </button>
          </Fragment>
        );
      })}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}