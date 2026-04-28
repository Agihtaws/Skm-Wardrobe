import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "react-hot-toast";
import AuthProvider from "@/components/providers/AuthProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import "@/app/globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default:  "SKM Wardrobe",
    template: "%s | SKM Wardrobe",
  },
  description:
    "Shop women's sarees, kurtis, kids wear and accessories at SKM Wardrobe.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://skmwardrobe.in"
  ),
  openGraph: {
    siteName: "SKM Wardrobe",
    type:     "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AuthProvider>
          <Header />
          <CartDrawer />
          <main>{children}</main>
          <Footer />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: "8px",
                fontSize:     "14px",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}