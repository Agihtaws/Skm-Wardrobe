import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | SKM Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      {/* pt-14 = height of mobile top bar; md:pt-0 = desktop has no top bar */}
      <main className="flex-1 min-w-0 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}