"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, FolderTree,
  Tag, ShoppingBag, LogOut, ExternalLink, RotateCcw, Menu, X,
} from "lucide-react";
import { createClient, resetClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const NAV = [
  { label: "Dashboard",  href: "/admin",            icon: LayoutDashboard },
  { label: "Products",   href: "/admin/products",   icon: Package         },
  { label: "Categories", href: "/admin/categories", icon: FolderTree      },
  { label: "Attributes", href: "/admin/attributes", icon: Tag             },
  { label: "Orders",     href: "/admin/orders",     icon: ShoppingBag     },
  { label: "Returns",    href: "/admin/returns",    icon: RotateCcw       },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { clear }            = useAuthStore();
  const { clear: clearCart } = useCartStore();
  const [open, setOpen]      = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSignOut = async () => {
    try {
      await createClient().auth.signOut();
    } catch (_) {
      // ignore — clear local state regardless
    }
    resetClient();    // reset singleton so next createClient() is fresh
    clear();
    clearCart();
    router.refresh(); // bust Next.js server component cache
    router.push("/login");
  };

  const SidebarContent = () => (
    <>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="font-bold text-pink-600 text-lg leading-none">SKM Admin</p>
          <p className="text-[11px] text-gray-400 mt-1">Wardrobe Management</p>
        </div>
        <button onClick={() => setOpen(false)} className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon size={17} />{label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-0.5">
        <Link href="/" target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
          <ExternalLink size={17} /> View Store
        </Link>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50">
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
        <button onClick={() => setOpen(true)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <p className="font-bold text-pink-600 text-base">SKM Admin</p>
      </header>

      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />}

      <aside className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col shadow-xl transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      <aside className="hidden lg:flex w-60 flex-shrink-0 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
        <SidebarContent />
      </aside>
    </>
  );
}