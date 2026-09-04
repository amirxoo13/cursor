import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Next.js به‌طور پیش‌فرض .env.local را می‌خواند، اما پکیج dotenv فقط .env را
// می‌خواند مگر مسیر صریح بدهیم. این فایل هر دو را (با اولویت .env.local) لود
// می‌کند تا اسکریپت‌های ingestion هم دقیقاً همان متغیرهایی را ببینند که در
// .env.local برای dev/deploy تنظیم شده‌اند.
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
