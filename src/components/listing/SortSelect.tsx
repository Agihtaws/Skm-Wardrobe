"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const OPTIONS = [
  { label: "New Arrivals",      value: "created_at-desc" },
  { label: "Oldest First",      value: "created_at-asc"  },
  { label: "Price: Low to High",value: "sell_price-asc"  },
  { label: "Price: High to Low",value: "sell_price-desc" },
];

export default function SortSelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}