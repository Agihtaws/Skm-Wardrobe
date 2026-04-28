"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js"; // ✅ import types

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, setProfile, setLoading, clear } = useAuthStore();
  const { setItems, clear: clearCart } = useCartStore();

  useEffect(() => {
    const supabase = createClient();

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) setProfile(data);
    };

    const fetchCart = async (userId: string) => {
      const { data } = await supabase
        .from("cart")
        .select(
          "*, product:products(id,name,slug,sell_price,price,regular_price,stock,images,is_active)"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setItems(data);
      }
    };

    // ✅ type the user parameter
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id);
        fetchCart(user.id);
      }
      setLoading(false);
    });

    // ✅ type event and session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
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
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}