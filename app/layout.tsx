import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "پرسش‌وپاسخ قوانین مهاجرتی | اروپا و آمریکا",
  description:
    "پلتفرم پرسش‌وپاسخ درباره قوانین مهاجرتی اتحادیه اروپا و آمریکا، بر پایه اسناد رسمی و هوش مصنوعی",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
