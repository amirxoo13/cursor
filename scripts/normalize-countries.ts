import "./_env";
import { sql } from "../lib/db";
import { normalizeCountry } from "../lib/countries";

/**
 * اجرای یک‌باره: مقدار ستون country برای رکوردهای از‌پیش‌ایندکس‌شده‌ی hudoc
 * (کد ISO3 مثل "ITA") و euaa (اسم کامل کشور مثل "Netherlands") را به ISO2
 * یکسان تبدیل می‌کند تا فیلتر کشور در چت روی همه‌ی منابع یکنواخت کار کند.
 */
async function main() {
  const rows = (await sql(
    "SELECT DISTINCT source, country FROM legal_documents WHERE source IN ('hudoc','euaa') AND country IS NOT NULL"
  )) as unknown as { source: string; country: string }[];

  console.log(`${rows.length} مقدار یکتای country برای نرمال‌سازی پیدا شد`);

  let updated = 0;
  for (const row of rows) {
    const normalized = normalizeCountry(row.country);
    if (!normalized || normalized === row.country) continue;
    const result = (await sql(
      "UPDATE legal_documents SET country = $1 WHERE source = $2 AND country = $3",
      [normalized, row.source, row.country]
    )) as unknown as any;
    console.log(`  ${row.source}: "${row.country}" -> "${normalized}"`);
    updated++;
  }

  console.log(`\n✅ ${updated} مقدار کشور نرمال‌سازی شد.`);
}

main().catch((err) => {
  console.error("❌ نرمال‌سازی کشورها شکست خورد:", err);
  process.exit(1);
});
