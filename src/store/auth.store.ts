import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useStore } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  _hasHydrated: boolean;           // ← add this
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (v: boolean) => void;
  setHasHydrated: (v: boolean) => void;  // ← add this
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: true,
      _hasHydrated: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      clear: () => set({ user: null, profile: null, isLoading: false }),
    }),
    {
      name: "skm-auth",
      partialize: (state) => ({ profile: state.profile }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);   // ← fires after localStorage loads
      },
    }
  )
);