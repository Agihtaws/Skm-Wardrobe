"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
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
          console.error("[AuthProvider] profile fetch error:", error.message);
          return;
        }
        if (data) setProfile(data);
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

    // ── Initial load ──
    // CRITICAL: await both fetches before setLoading(false) so the Header
    // renders with profile.role already set — otherwise isAdmin is false
    // on first render and sometimes never flips to true.
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: User | null } }) => {
      setUser(user);
      if (user) {
        await fetchProfile(user.id);
        await fetchCart(user.id);
      }
      setLoading(false);  // ← now fires AFTER profile is in the store
    });

    // ── Ongoing auth changes ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
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