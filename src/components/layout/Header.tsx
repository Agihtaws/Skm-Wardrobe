"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Search, Menu, X,
  ChevronDown, LogOut, User, Package,
} from "lucide-react";
import { createClient, resetClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { NAV_LINKS } from "@/config/nav";
import toast from "react-hot-toast";
import Image from "next/image";

function UserAvatar({
  user,
  profile,
  size = 28,
}: {
  user: { email?: string | null; user_metadata?: { avatar_url?: string; full_name?: string } };
  profile?: { avatar_url?: string | null; full_name?: string | null } | null;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;
  const altName   = profile?.full_name || user.user_metadata?.full_name || user.email || "avatar";

  if (avatarUrl && !imgError) {
    return (
      <Image src={avatarUrl} alt={altName} width={size} height={size}
        className="rounded-full flex-shrink-0 object-cover"
        onError={() => setImgError(true)} unoptimized />
    );
  }

  const seed = encodeURIComponent(user.email ?? "user");
  const src  = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=db2777&textColor=ffffff&fontSize=40`;
  return <Image src={src} alt={altName} width={size} height={size} className="rounded-full flex-shrink-0" unoptimized />;
}

export default function Header() {
  const router = useRouter();
  const { user, profile, isLoading, clear }                                 = useAuthStore();
  const { count: cartCount, setOpen: setCartOpen, clear: clearCartStore }   = useCartStore();

  const [mounted,        setMounted]        = useState(false);
  const [activeMenu,     setActiveMenu]     = useState<string | null>(null);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [suggestions,    setSuggestions]    = useState<{ name: string; slug: string }[]>([]);
  const [showSug,        setShowSug]        = useState(false);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const userRef   = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);

  // ─── DEBUG: log every time user/profile/isLoading changes ───────────────
  useEffect(() => {
    console.log("[Header] state snapshot:", {
      mounted,
      isLoading,
      userId:      user?.id ?? null,
      userEmail:   user?.email ?? null,
      userMeta:    user?.user_metadata ?? null,
      appMeta:     user?.app_metadata ?? null,
      profileId:   profile?.id ?? null,
      profileRole: (profile as any)?.role ?? null,
      profileFull: profile,
    });
  }, [mounted, user, profile, isLoading]);
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery("");
    setSuggestions([]);
  };

  const fetchSuggestions = async (q: string) => {
    if (!q.trim() || q.length < 2) { setSuggestions([]); return; }
    const res  = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=6`);
    const json = await res.json();
    if (json.success)
      setSuggestions(json.data.products.map((p: any) => ({ name: p.name, slug: p.slug })));
  };

  const handleSignOut = async () => {
    console.log("[Header] handleSignOut called");
    try {
      await createClient().auth.signOut();
      console.log("[Header] supabase signOut done");
    } catch (e) {
      console.error("[Header] supabase signOut error:", e);
    }
    resetClient();
    clear();
    clearCartStore();
    setUserMenuOpen(false);
    setMobileOpen(false);
    toast.success("Signed out");
    // Hard redirect — most reliable way to clear all RSC cache & state
    window.location.href = "/";
  };

  const displayName =
    profile?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Account";

  // Triple-check: DB profile role, Supabase user_metadata, app_metadata
  const profileRole   = (profile as any)?.role;
  const metaRole      = user?.user_metadata?.role;
  const appMetaRole   = user?.app_metadata?.role;
  const isAdmin       = mounted && !isLoading && (
    profileRole === "admin" ||
    metaRole    === "admin" ||
    appMetaRole === "admin"
  );

  // DEBUG log whenever isAdmin value changes
  useEffect(() => {
    if (mounted) {
      console.log("[Header] isAdmin =", isAdmin, "| profileRole:", profileRole, "| metaRole:", metaRole, "| appMetaRole:", appMetaRole);
    }
  }, [isAdmin, mounted]);

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14 gap-4">

          <Link href="/" className="text-xl sm:text-2xl font-bold text-pink-600 tracking-tight flex-shrink-0 mr-3">
            SKM WARDROBE
          </Link>

          <div className="flex items-center gap-1 ml-auto">

            {/* Search */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="relative flex items-center gap-1">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input ref={searchRef} type="text" value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); fetchSuggestions(e.target.value); setShowSug(true); }}
                    onBlur={() => setTimeout(() => setShowSug(false), 200)}
                    onFocus={() => suggestions.length > 0 && setShowSug(true)}
                    onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                    placeholder="Search products..."
                    className="w-36 sm:w-56 pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                  {showSug && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-[200] overflow-hidden">
                      {suggestions.map((s, i) => (
                        <button key={i} type="button"
                          onMouseDown={() => { router.push(`/products/${s.slug}`); setSearchOpen(false); setSearchQuery(""); setSuggestions([]); }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 flex items-center gap-2">
                          <Search size={11} className="text-gray-400 flex-shrink-0" /> {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); setSuggestions([]); }} className="p-2 text-gray-400 hover:text-gray-600">
                  <X size={17} />
                </button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors" aria-label="Search">
                <Search size={19} />
              </button>
            )}

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {NAV_LINKS.map((link) => (
                <div key={link.label} className="relative">
                  <button
                    onClick={() => setActiveMenu((p) => p === link.label ? null : link.label)}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${activeMenu === link.label ? "text-pink-600 bg-pink-50" : "text-gray-700 hover:text-pink-600 hover:bg-pink-50"}`}
                  >
                    {link.label}
                    <ChevronDown size={13} className={`transition-transform duration-200 ${activeMenu === link.label ? "rotate-180 text-pink-600" : ""}`} />
                  </button>
                  {activeMenu === link.label && link.categories.length > 0 && (
                    <div className="absolute top-full right-0 mt-1 z-[100] bg-white border border-gray-100 rounded-2xl shadow-xl p-4 w-[340px]">
                      <Link href={link.href} onClick={() => setActiveMenu(null)}
                        className="flex items-center justify-between w-full px-3 py-2 mb-2 text-sm font-bold text-pink-600 hover:bg-pink-50 rounded-xl border border-pink-100">
                        View All {link.label} <ChevronDown size={12} className="-rotate-90" />
                      </Link>
                      <div className="grid grid-cols-2 gap-1">
                        {link.categories.map((cat) => (
                          <div key={cat.label}>
                            <Link href={cat.href} onClick={() => setActiveMenu(null)}
                              className="block px-3 py-2 text-sm font-bold text-gray-900 hover:text-pink-600 hover:bg-pink-50 rounded-xl">
                              {cat.label}
                            </Link>
                            {cat.children.length > 0 && (
                              <div className="ml-2 mb-1">
                                {cat.children.map((child) => (
                                  <Link key={child.label} href={child.href} onClick={() => setActiveMenu(null)}
                                    className="block px-3 py-1 text-xs text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-lg">
                                    → {child.label}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Cart */}
            <button onClick={() => setCartOpen(true)} className="relative p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors" aria-label="Cart">
              <ShoppingBag size={19} />
              {cartCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-pink-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount() > 9 ? "9+" : cartCount()}
                </span>
              )}
            </button>

            {/* User / Login */}
            {user ? (
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-colors"
                >
                  <UserAvatar user={user} profile={profile} size={26} />
                  <span className="hidden sm:block text-xs font-semibold text-gray-700 max-w-[72px] truncate">{displayName}</span>
                  <ChevronDown size={11} className={`text-gray-400 hidden sm:block transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-[100]">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                      <UserAvatar user={user} profile={profile} size={34} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{profile?.full_name || displayName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        {/* DEBUG badge — shows role visually, remove after fix */}
                        <p className="text-[10px] text-orange-500 font-mono">
                          role: {(profile as any)?.role ?? "null"} | isAdmin: {String(isAdmin)}
                        </p>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link href="/account" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors">
                        <User size={14} /> Profile
                      </Link>
                      <Link href="/orders" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors">
                        <ShoppingBag size={14} /> My Orders
                      </Link>
                      {/* ALWAYS show Admin Panel if role is admin, even during loading — belt-and-suspenders */}
                      {((profile as any)?.role === "admin" || isAdmin) && (
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-pink-600 font-semibold hover:bg-pink-50 transition-colors">
                          <Package size={14} /> Admin Panel
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-gray-100 pt-1">
                      <button onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="px-4 py-1.5 text-sm font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-full transition-colors">
                Login
              </Link>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen((v) => !v)} className="md:hidden p-2 text-gray-600 hover:text-pink-600 rounded-lg" aria-label="Menu">
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <div key={link.label}>
                <button
                  onClick={() => setMobileExpanded((p) => p === link.label ? null : link.label)}
                  className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold text-gray-800 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors">
                  {link.label}
                  <ChevronDown size={15} className={`transition-transform ${mobileExpanded === link.label ? "rotate-180 text-pink-600" : "text-gray-400"}`} />
                </button>
                {mobileExpanded === link.label && (
                  <div className="ml-3 mt-1 mb-2 space-y-0.5">
                    <Link href={link.href} onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-sm text-pink-600 font-semibold hover:bg-pink-50 rounded-xl">
                      View All {link.label}
                    </Link>
                    {link.categories.map((cat) => (
                      <div key={cat.label}>
                        <Link href={cat.href} onClick={() => setMobileOpen(false)}
                          className="block px-3 py-2 text-sm font-semibold text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-xl">
                          {cat.label}
                        </Link>
                        {cat.children.map((child) => (
                          <Link key={child.label} href={child.href} onClick={() => setMobileOpen(false)}
                            className="block px-5 py-1.5 text-xs text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-xl">
                            → {child.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {user ? (
              <div className="border-t border-gray-100 pt-3 mt-2 space-y-1">
                <Link href="/account" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-pink-50 rounded-xl">
                  <User size={15} /> Profile
                </Link>
                <Link href="/orders" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-pink-50 rounded-xl">
                  <ShoppingBag size={15} /> My Orders
                </Link>
                {((profile as any)?.role === "admin" || isAdmin) && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-pink-600 font-semibold hover:bg-pink-50 rounded-xl">
                    <Package size={15} /> Admin Panel
                  </Link>
                )}
                <button onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-bold text-white bg-pink-600 rounded-xl text-center mt-3">
                Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}