// components/HeaderServer.tsx  (Server Component)
import { createClient } from "@/lib/supabase/server";
import Header from "./Header";
import type { Category } from "@/types/database";

export type NavChild   = { label: string; href: string };
export type NavCat     = { label: string; href: string; slug: string; children: NavChild[] };
export type NavSection = { label: string; href: string; gender: string; categories: NavCat[] };

function buildNav(categories: Category[]): NavSection[] {
  // All genders present in DB, in display order
  const GENDER_ORDER = ["women", "kids", "accessories"] as const;
  const GENDER_LABELS: Record<string, string> = {
    women:       "Women",
    kids:        "Kids",
    accessories: "Accessories",
  };

  const sections: NavSection[] = [];

  for (const gender of GENDER_ORDER) {
    const rootCats = categories
      .filter((c) => c.gender === gender && !c.parent_id && c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (rootCats.length === 0) continue;

    const navCats: NavCat[] = rootCats.map((root) => {
      const children = categories
        .filter((c) => c.parent_id === root.id && c.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((child) => ({
          label: child.name,
          href:  `/${gender}/${root.slug}/${child.slug}`,
        }));

      return {
        label:    root.name,
        href:     `/${gender}/${root.slug}`,
        slug:     root.slug,
        children,
      };
    });

    sections.push({
      label:      GENDER_LABELS[gender] ?? gender,
      href:       `/${gender}`,
      gender,
      categories: navCats,
    });
  }

  return sections;
}

export default async function HeaderServer() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  const navSections = buildNav((categories as Category[]) ?? []);

  return <Header navSections={navSections} />;
}