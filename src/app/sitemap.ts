import { createAdminClient } from "@/lib/supabase/admin";
import type { MetadataRoute } from "next";

const BASE = "https://skmwardrobe.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    admin
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true)
      .gt("stock", 0),
    admin
      .from("categories")
      .select("slug, gender, parent_id, updated_at")
      .eq("is_active", true),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/women`,   lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/kids`,    lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/accessories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/login`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/register`,lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url:             `${BASE}/products/${p.slug}`,
    lastModified:    new Date(p.updated_at),
    changeFrequency: "weekly",
    priority:        0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = (categories ?? [])
    .filter((c) => c.gender)
    .map((c) => ({
      url:             c.parent_id
        ? `${BASE}/${c.gender}/${c.slug}`
        : `${BASE}/${c.gender}`,
      lastModified:    new Date(c.updated_at),
      changeFrequency: "weekly" as const,
      priority:        0.7,
    }));

  return [...staticPages, ...productPages, ...categoryPages];
}