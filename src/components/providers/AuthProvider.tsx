"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setProfile, setLoading, clear } = useAuthStore();
  const { setItems, clear: clearCart }                   = useCartStore();

  // ── Step 1: Listen for auth changes — ONLY set user, never query DB here.
  // Making supabase.from() calls inside onAuthStateChange deadlocks the client
  // because the auth handler holds an internal lock.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("skm-auth");
    }

    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log("[AuthProvider] auth event:", event, session?.user?.id ?? null);
        const nextUser = session?.user ?? null;
        if (!nextUser) {
          clear();
          clearCart();
          setLoading(false);
        } else {
          setUser(nextUser);
          // Do NOT fetch profile here — Step 2 handles it
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 2: React to user changes and fetch profile + cart separately.
  // This runs OUTSIDE the auth lock, so DB queries work fine.
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    const load = async () => {
      console.log("[AuthProvider] fetching profile for:", user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[AuthProvider] profile error:", error.message, error.code);
      } else if (profile) {
        console.log("[AuthProvider] profile loaded:", profile);
        setProfile(profile);
      }

      const { data: cartItems } = await supabase
        .from("cart")
        .select("*, product:products(id,name,slug,sell_price,price,regular_price,stock,images,is_active)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cartItems && cartItems.length > 0) setItems(cartItems);

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // ← only re-run when user ID actually changes

  return <>{children}</>;
}