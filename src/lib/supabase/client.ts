import { createBrowserClient } from "@supabase/ssr";

let supabaseClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (supabaseClient) return supabaseClient;
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
        flowType:           "pkce",
      },
    }
  );
  return supabaseClient;
}

// Call this on sign out to reset singleton
export function resetClient() {
  supabaseClient = undefined;
}