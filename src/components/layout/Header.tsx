"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Search, User, Menu, X,
  ChevronDown, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { NAV_LINKS } from "@/config/nav";
import toast from "react-hot-toast";

export default function Header() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const cartCount  = useCartStore((s) => s.count());
  const setCartOpen = useCartStore((s) => s.setOpen);

  const [activeMenu,   setActiveMenu]   = useState<string | null>(null);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const menuTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef   = useRef<HTMLInputElement>(null);
  const userBtnRef  = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ── Nav hover (with delay so it doesn't close immediately) ──
  const openMenu  = (label: string) => {
    if (menuTimer.current) clearTimeout(menuTimer.current);
    setActiveMenu(label);
  };
  const closeMenu = () => {
    menuTimer.current = setTimeout(() => setActiveMenu(null), 180);
  };

  // ── Search focus ──
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // ── Close user dropdown on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userBtnRef.current && !userBtnRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      setActiveMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    setUserMenuOpen(false);
    toast.success("Signed out");
    router.push("/");
  };

  const fetchSuggestions = async (q: string) => {
  if (!q.trim() || q.length < 2) { setSuggestions([]); return; }
  const res  = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=5`);
  const json = await res.json();
  if (json.success) {
    setSuggestions(json.data.products.map((p: any) => p.name));
   }
  };
  
  const displayName = profile?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || "Account";

  const initial = (profile?.full_name || user?.email || "U")
    .slice(0, 1)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-3">

          {/* Logo */}
          <Link
            href="/"
            className="text-xl sm:text-2xl font-bold text-pink-600 tracking-tight flex-shrink-0 mr-2"
          >
            SKM WARDROBE
          </Link>

          {/* Desktop nav — centre */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            {NAV_LINKS.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => openMenu(link.label)}
                onMouseLeave={closeMenu}
              >
                <Link
                  href={link.href}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors whitespace-nowrap"
                >
                  {link.label}
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${activeMenu === link.label ? "rotate-180" : ""}`}
                  />
                </Link>

                {/* Mega dropdown */}
                {activeMenu === link.label && link.categories.length > 0 && (
                  <div
                    className="absolute top-full left-0 pt-2 z-[100]"
                    onMouseEnter={() => openMenu(link.label)}
                    onMouseLeave={closeMenu}
                  >
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-5 w-[420px]">
                      <div className="grid grid-cols-3 gap-5">
                        {link.categories.map((cat) => (
                          <div key={cat.label}>
                            <Link
                              href={cat.href}
                              className="block text-sm font-bold text-gray-900 hover:text-pink-600 mb-2 transition-colors"
                            >
                              {cat.label}
                            </Link>
                            {cat.children.length > 0 && (
                              <ul className="space-y-1.5">
                                {cat.children.map((child) => (
                                  <li key={child.label}>
                                    <Link
                                      href={child.href}
                                      className="text-xs text-gray-500 hover:text-pink-600 transition-colors leading-tight block"
                                    >
                                      {child.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-1 ml-auto">

            {/* Search */}
{searchOpen ? (
  <div ref={searchContainerRef} className="relative flex items-center gap-2">
    <form onSubmit={handleSearch} className="flex items-center gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            fetchSuggestions(e.target.value);
            setShowSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search products..."
          className="w-40 sm:w-60 pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-[200] overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => {
                  setSearchQuery(s);
                  setShowSuggestions(false);
                  router.push(`/search?q=${encodeURIComponent(s)}`);
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 flex items-center gap-2 transition-colors"
              >
                <Search size={13} className="text-gray-400 flex-shrink-0" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button"
        onClick={() => { setSearchOpen(false); setSearchQuery(""); setSuggestions([]); }}
        className="p-1.5 text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </form>
  </div>
) : (
  <button onClick={() => setSearchOpen(true)}
    className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
    aria-label="Search">
    <Search size={20} />
  </button>
)}

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-pink-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {/* User */}
            {user ? (
              <div ref={userBtnRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-colors"
                >
                  <div className="w-6 h-6 bg-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[11px] font-bold leading-none">
                      {initial}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[90px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-gray-400 transition-transform duration-200 hidden sm:block ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* User dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-[100]">
                    {/* Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {profile?.full_name || displayName}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                      >
                        <User size={15} /> Profile
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                      >
                        <ShoppingBag size={15} /> My Orders
                      </Link>
                      {profile?.role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-pink-600 font-semibold hover:bg-pink-50 transition-colors"
                        >
                          <span>⚙️</span> Admin Panel
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-1 px-4 py-1.5 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-full transition-colors"
              >
                Login
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 text-gray-600 hover:text-pink-600 rounded-lg"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto">
          {NAV_LINKS.map((link) => (
            <div key={link.label}>
              <Link
                href={link.href}
                className="block px-3 py-2 text-sm font-semibold text-gray-800 hover:text-pink-600 hover:bg-pink-50 rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
              <div className="pl-3 space-y-0.5 mt-0.5">
                {link.categories.map((cat) => (
                  <div key={cat.label}>
                    <Link
                      href={cat.href}
                      className="block px-3 py-1.5 text-sm text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      {cat.label}
                    </Link>
                    {cat.children.length > 0 && (
                      <div className="pl-3 space-y-0.5">
                        {cat.children.map((child) => (
                          <Link
                            key={child.label}
                            href={child.href}
                            className="block px-3 py-1 text-xs text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-lg"
                            onClick={() => setMobileOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!user ? (
            <Link
              href="/login"
              className="block px-3 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg text-center mt-2"
              onClick={() => setMobileOpen(false)}
            >
              Login / Register
            </Link>
          ) : (
            <div className="border-t border-gray-100 pt-2 mt-2 space-y-0.5">
              <Link href="/account" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-pink-50 rounded-lg">
                <User size={15} /> Profile
              </Link>
              <Link href="/orders" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-pink-50 rounded-lg">
                <ShoppingBag size={15} /> My Orders
              </Link>
              <button onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}