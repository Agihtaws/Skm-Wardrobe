import { create } from "zustand";
import type { CartItem } from "@/types/database";

interface CartState {
  items:      CartItem[];
  isOpen:     boolean;
  isLoading:  boolean;
  setItems:   (items: CartItem[]) => void;
  addItem:    (item: CartItem) => void;
  removeItem: (productId: string) => void;
  setOpen:    (v: boolean) => void;
  setLoading: (v: boolean) => void;
  clear:      () => void;
  total:      () => number;
  count:      () => number;
  inStockItems: () => CartItem[];
}

export const useCartStore = create<CartState>()((set, get) => ({
  items:     [],
  isOpen:    false,
  isLoading: false,

  setItems: (items) => set({ items }),

  addItem: (item) =>
    set((s) => {
      const exists = s.items.find((i) => i.product_id === item.product_id);
      if (exists) {
        return {
          items: s.items.map((i) =>
            i.product_id === item.product_id ? { ...i, quantity: item.quantity } : i
          ),
        };
      }
      return { items: [...s.items, item] };
    }),

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.product_id !== productId) })),

  setOpen:    (isOpen)    => set({ isOpen }),
  setLoading: (isLoading) => set({ isLoading }),
  clear:      ()          => set({ items: [], isOpen: false }),

  inStockItems: () =>
    get().items.filter((i) => (i.product?.stock ?? 0) > 0),

  total: () =>
    get()
      .inStockItems()
      .reduce((sum, i) => sum + ((i.product as any)?.sell_price ?? (i.product as any)?.price ?? 0) * i.quantity, 0),

  count: () =>
    get().items.length,
}));