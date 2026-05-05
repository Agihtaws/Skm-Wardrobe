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
import toast from "react-hot-toast";
import Image from "next/image";
import type { NavSection } from "./HeaderServer";

// ── Avatar ────────────────────────────────────────────────────────────────────
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
  const altName   = profile?.full_name  || user.user_metadata?.full_name  || user.email || "avatar";

  if (avatarUrl && !imgError) {
    return (
      <Image src={avatarUrl} alt={altName} width={size} height={size}
        className="rounded-full flex-shrink-0 object-cover"
        onError={() => setImgError(true)} unoptimized />
    );
  }

  const seed = encodeURIComponent(user.email ?? "user");
  return (
    <Image
      src={`https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=db2777&textColor=ffffff&fontSize=40`}
      alt={altName} width={size} height={size}
      className="rounded-full flex-shrink-0" unoptimized />
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
interface HeaderProps {
  /** Dynamic nav sections built from DB categories (passed by HeaderServer) */
  navSections: NavSection[];
}

export default function Header({ navSections }: HeaderProps) {
  const router = useRouter();
  const { user, profile, clear }                                           = useAuthStore();
  const { count: cartCount, setOpen: setCartOpen, clear: clearCartStore } = useCartStore();

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current   && !userRef.current.contains(e.target as Node))   setUserMenuOpen(false);
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

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
    try { await createClient().auth.signOut(); } catch (_) { /* ignore */ }
    resetClient();
    clear();
    clearCartStore();
    setUserMenuOpen(false);
    setMobileOpen(false);
    toast.success("Signed out");
    router.refresh();
    router.push("/");
  };

  const displayName =
    profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Account";

  const isAdmin = mounted && (
    (profile as any)?.role === "admin" ||
    user?.user_metadata?.role === "admin" ||
    user?.app_metadata?.role  === "admin"
  );

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14 gap-4">

          {/* Logo */}
          <Link href="/"
            className="text-xl sm:text-2xl font-bold text-pink-600 tracking-tight flex-shrink-0 mr-3">
            SKM WARDROBE
          </Link>

          <div className="flex items-center gap-1 ml-auto">

            {/* Search */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="relative flex items-center gap-1">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef} type="text" value={searchQuery}
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
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 flex items-center gap-2 transition-colors">
                          <Search size={11} className="text-gray-400 flex-shrink-0" /> {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); setSuggestions([]); }}
                  className="p-2 text-gray-400 hover:text-gray-600"><X size={17} /></button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)}
                className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors" aria-label="Search">
                <Search size={19} />
              </button>
            )}

            {/* ── Desktop Nav (dynamic) ── */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navSections.map((section) => (
                <div key={section.gender} className="relative">
                  <button
                    onClick={() => setActiveMenu((p) => p === section.gender ? null : section.gender)}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      activeMenu === section.gender
                        ? "text-pink-600 bg-pink-50"
                        : "text-gray-700 hover:text-pink-600 hover:bg-pink-50"
                    }`}
                  >
                    {section.label}
                    <ChevronDown size={13} className={`transition-transform duration-200 ${activeMenu === section.gender ? "rotate-180 text-pink-600" : ""}`} />
                  </button>

                  {activeMenu === section.gender && section.categories.length > 0 && (
                    <div className="absolute top-full right-0 mt-1 z-[100] bg-white border border-gray-100 rounded-2xl shadow-xl p-4 w-[340px]">
                      <Link href={section.href} onClick={() => setActiveMenu(null)}
                        className="flex items-center justify-between w-full px-3 py-2 mb-2 text-sm font-bold text-pink-600 hover:bg-pink-50 rounded-xl transition-colors border border-pink-100">
                        View All {section.label}
                        <ChevronDown size={12} className="-rotate-90" />
                      </Link>
                      <div className="grid grid-cols-2 gap-1">
                        {section.categories.map((cat) => (
                          <div key={cat.slug}>
                            <Link href={cat.href} onClick={() => setActiveMenu(null)}
                              className="block px-3 py-2 text-sm font-bold text-gray-900 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors">
                              {cat.label}
                            </Link>
                            {cat.children.length > 0 && (
                              <div className="ml-2 mb-1">
                                {cat.children.map((child) => (
                                  <Link key={child.href} href={child.href} onClick={() => setActiveMenu(null)}
                                    className="block px-3 py-1 text-xs text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors">
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
            <button onClick={() => setCartOpen(true)}
              className="relative p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors" aria-label="Cart">
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
                <button onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-colors">
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
                      {isAdmin && (
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
              <Link href="/login"
                className="px-4 py-1.5 text-sm font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-full transition-colors">
                Login
              </Link>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 text-gray-600 hover:text-pink-600 rounded-lg" aria-label="Menu">
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Nav (dynamic) ── */}
      {mobileOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 border-t border-gray-100 bg-white max-h-[80vh] overflow-y-auto shadow-xl z-40">
          <div className="px-4 py-3 space-y-1">
            {navSections.map((section) => (
              <div key={section.gender}>
                <button
                  onClick={() => setMobileExpanded((p) => p === section.gender ? null : section.gender)}
                  className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold text-gray-800 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors">
                  {section.label}
                  <ChevronDown size={15} className={`transition-transform ${mobileExpanded === section.gender ? "rotate-180 text-pink-600" : "text-gray-400"}`} />
                </button>

                {mobileExpanded === section.gender && (
                  <div className="ml-3 mt-1 mb-2 space-y-0.5">
                    <Link href={section.href} onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-sm text-pink-600 font-semibold hover:bg-pink-50 rounded-xl">
                      View All {section.label}
                    </Link>
                    {section.categories.map((cat) => (
                      <div key={cat.slug}>
                        <Link href={cat.href} onClick={() => setMobileOpen(false)}
                          className="block px-3 py-2 text-sm font-semibold text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-xl">
                          {cat.label}
                        </Link>
                        {cat.children.map((child) => (
                          <Link key={child.href} href={child.href} onClick={() => setMobileOpen(false)}
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

            {!user && (
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