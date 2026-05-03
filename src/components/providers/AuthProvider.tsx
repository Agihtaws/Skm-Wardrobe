"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading, clear } = useAuthStore();
  const { setItems, clear: clearCart }             = useCartStore();

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("skm-auth");
    }

    const supabase = createClient();

    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        if (error) {
          console.error("[AuthProvider] profile fetch error:", error.message, error.code);
          return;
        }
        if (data) {
          console.log("[AuthProvider] profile loaded:", data);
          setProfile(data);
        }
      } catch (e) {
        console.error("[AuthProvider] profile fetch threw:", e);
      }
    };

    const fetchCart = async (userId: string) => {
      try {
        const { data } = await supabase
          .from("cart")
          .select("*, product:products(id,name,slug,sell_price,price,regular_price,stock,images,is_active)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (data && data.length > 0) setItems(data);
      } catch (e) {
        console.error("[AuthProvider] cart fetch threw:", e);
      }
    };

    // onAuthStateChange fires INITIAL_SESSION immediately on mount —
    // no need for a separate getUser() call.
    // Having BOTH causes two concurrent fetchProfile calls which deadlocks
    // the Supabase browser client.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log("[AuthProvider] onAuthStateChange event:", event, "user:", session?.user?.id ?? null);

        const user = session?.user ?? null;
        setUser(user);

        if (user) {
          await fetchProfile(user.id);
          await fetchCart(user.id);
        } else {
          clear();
          clearCart();
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}