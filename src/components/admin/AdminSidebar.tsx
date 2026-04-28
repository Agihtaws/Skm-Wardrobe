"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, FolderTree,
  Tag, ShoppingBag, LogOut, ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard",   href: "/admin",            icon: LayoutDashboard },
  { label: "Products",    href: "/admin/products",    icon: Package },
  { label: "Categories",  href: "/admin/categories",  icon: FolderTree },
  { label: "Attributes",  href: "/admin/attributes",  icon: Tag },
  { label: "Orders",      href: "/admin/orders",      icon: ShoppingBag },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="font-bold text-pink-600 text-lg leading-none">SKM Admin</p>
        <p className="text-[11px] text-gray-400 mt-1">Wardrobe Management</p>
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
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-0.5">
        <Link href="/" target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
        >
          <ExternalLink size={17} /> View Store
        </Link>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50"
        >
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </aside>
  );
}