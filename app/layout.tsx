import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "SAMAI | Smart Attorney Mind — پرسش‌وپاسخ قوانین مهاجرتی",
  description:
    "SAMAI پلتفرم پرسش‌وپاسخ هوشمند قوانین مهاجرتی اتحادیه اروپا و آمریکا، بر پایه اسناد رسمی (eCFR، Federal Register، CourtListener، EUR-Lex) و هوش مصنوعی.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SAMAI",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <PWARegister />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
