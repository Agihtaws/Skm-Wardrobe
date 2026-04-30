import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

interface AuthState {
  user:       User | null;
  profile:    Profile | null;
  isLoading:  boolean;
  setUser:    (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (v: boolean) => void;
  clear:      () => void;
}

// No persist — removed to fix stale admin role surviving logout
export const useAuthStore = create<AuthState>()((set) => ({
  user:       null,
  profile:    null,
  isLoading:  true,
  setUser:    (user)      => set({ user }),
  setProfile: (profile)   => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, profile: null, isLoading: false }),
}));