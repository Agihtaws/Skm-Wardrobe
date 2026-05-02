"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, FolderTree,
  Tag, ShoppingBag, RotateCcw,
  LogOut, ExternalLink, Menu, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard",  href: "/admin",            icon: LayoutDashboard },
  { label: "Products",   href: "/admin/products",   icon: Package          },
  { label: "Categories", href: "/admin/categories", icon: FolderTree       },
  { label: "Attributes", href: "/admin/attributes", icon: Tag              },
  { label: "Orders",     href: "/admin/orders",     icon: ShoppingBag      },
  { label: "Returns",    href: "/admin/returns",    icon: RotateCcw        },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      {NAV.map(({ label, href, icon: Icon }) => {
        const active =
          href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-pink-50 text-pink-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function BottomLinks({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };
  return (
    <div className="p-3 border-t border-gray-100 space-y-0.5">
      <Link
        href="/"
        target="_blank"
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
      >
        <ExternalLink size={17} /> View Store
      </Link>
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50"
      >
        <LogOut size={17} /> Sign out
      </button>
    </div>
  );
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-white border-r border-gray-200 sticky top-0 h-screen z-30">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-pink-600 text-lg leading-none">SKM Admin</p>
          <p className="text-[11px] text-gray-400 mt-1">Wardrobe Management</p>
        </div>
        <NavLinks />
        <BottomLinks />
      </aside>

      {/* Mobile top bar — only on small screens */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-200">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <p className="font-bold text-pink-600 text-base leading-none">SKM Admin</p>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-pink-600 text-lg leading-none">SKM Admin</p>
            <p className="text-[11px] text-gray-400 mt-1">Wardrobe Management</p>
          </div>
          <button
            onClick={close}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <NavLinks onNavigate={close} />
        <BottomLinks onNavigate={close} />
      </aside>
    </>
  );
}