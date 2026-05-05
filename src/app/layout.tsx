import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { headers } from "next/headers";
import AuthProvider from "@/components/providers/AuthProvider";
import HeaderServer from "@/components/layout/HeaderServer";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import "@/app/globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default:  "SKM Wardrobe — Ethnic Wear for Women & Kids",
    template: "%s | SKM Wardrobe",
  },
  description:
    "Shop women's sarees, kurtis, chudidars, kids ethnic wear and accessories at SKM Wardrobe. Quality ethnic clothing from Thanjavur. ₹40 flat shipping across India.",
  metadataBase: new URL("https://skmwardrobe.in"),
  keywords: [
    "sarees online", "kurtis online", "ethnic wear", "cotton sarees",
    "silk sarees", "kids ethnic wear", "women clothing india",
    "SKM Wardrobe", "Thanjavur sarees",
  ],
  openGraph: {
    siteName:    "SKM Wardrobe",
    type:        "website",
    locale:      "en_IN",
    url:         "https://skmwardrobe.in",
    title:       "SKM Wardrobe — Ethnic Wear for Women & Kids",
    description: "Quality sarees, kurtis and ethnic wear. Free shipping above ₹599.",
    images: [{ url: "/og-image.jpg", width: 1730, height: 909 }],
  },
  twitter: {
    card:  "summary_large_image",
    title: "SKM Wardrobe",
  },
  alternates: {
    canonical: "https://skmwardrobe.in",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAdmin  = pathname.startsWith("/admin");

  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen bg-pink-50 text-gray-900 antialiased flex flex-col">
        <AuthProvider>
          {/* Store chrome — hidden on all /admin/* pages */}
          {!isAdmin && <HeaderServer />}
          {!isAdmin && <CartDrawer />}

          <main className="flex-1">{children}</main>

          {!isAdmin && <Footer />}

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: "8px", fontSize: "14px" },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}