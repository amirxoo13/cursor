import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "❌ DATABASE_URL تنظیم نشده است. به .env.example نگاه کن و یک دیتابیس Neon " +
        "(با پشتیبانی pgvector) بساز، سپس DATABASE_URL را در .env.local قرار بده."
    );
    process.exit(1);
  }

  const sql = neon(connectionString);
  const migrationPath = path.join(
    process.cwd(),
    "db/migrations/001_init.sql"
  );
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  const statements = migrationSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`در حال اجرای migration روی Neon Postgres (${statements.length} دستور)...`);
  for (const statement of statements) {
    console.log(`  ▶ ${statement.slice(0, 80).replace(/\s+/g, " ")}...`);
    await sql(statement);
  }
  console.log("✅ migration با موفقیت اجرا شد: جدول legal_documents و ایندکس hnsw ساخته شدند.");
}

main().catch((err) => {
  console.error("❌ اجرای migration شکست خورد:", err);
  process.exit(1);
});
