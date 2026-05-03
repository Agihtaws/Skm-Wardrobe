import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow:     "/",
        disallow:  ["/admin", "/admin/", "/checkout", "/orders", "/account", "/cart", "/api/"],
      },
    ],
    sitemap: "https://skmwardrobe.in/sitemap.xml",
  };
}