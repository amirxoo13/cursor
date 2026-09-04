import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "SAMAI | Smart Attorney Mind — پرسش‌وپاسخ قوانین مهاجرتی",
  description:
    "SAMAI پلتفرم پرسش‌وپاسخ هوشمند قوانین مهاجرتی اتحادیه اروپا و آمریکا، بر پایه اسناد رسمی (eCFR، Federal Register، CourtListener، EUR-Lex) و هوش مصنوعی.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
