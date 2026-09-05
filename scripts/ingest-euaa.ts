import "./_env";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument, documentAlreadyIngested } from "../lib/db";

const BASE = "https://caselaw.euaa.europa.eu";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

interface EuaaCase {
  id: number;
  title: string;
  text: string;
  ecli: string | null;
  country: string | null;
}

/**
 * پایگاه Case Law اروپایی پناهندگی (EUAA) یک سایت SharePoint است. API رسمی
 * REST آن (_api/search, _api/web/lists) برای کاربران anonymous غیرفعال است
 * (تست واقعی: خطای ۴۰۳/۵۰۰)، اما صفحات نمایش هر رای (viewcaselaw.aspx) عمومی
 * و قابل واکشی‌اند. چون هیچ API فهرست‌گیری در دسترس نیست، شناسه‌های عددی
 * CaseLawID به‌صورت پیوسته اسکن می‌شوند — شناسه‌های معتبر HTML واقعی
 * (~۹۰-۱۰۰ کیلوبایت) برمی‌گردانند و شناسه‌های نامعتبر با خطای ۵۰۰ و صفحه‌ی
 * کوچک ثابت (~۶ کیلوبایت) مشخص می‌شوند.
 */
async function fetchCase(id: number): Promise<EuaaCase | null> {
  const url = `${BASE}/pages/viewcaselaw.aspx?CaseLawID=${id}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return null;
  const html = await res.text();
  if (html.length < 20000) return null; // صفحه خطای کوچک ثابت برای IDهای نامعتبر

  const text = stripHtml(html);
  const marker = text.indexOf("Page Content");
  const body = (marker >= 0 ? text.slice(marker + "Page Content".length) : text).slice(0, 3000).trim();
  if (body.length < 200) return null;

  const titleMatch = text.match(/Submit New Case\s+(.+?)\s+Page Content/);
  const title = titleMatch ? titleMatch[1].trim() : `EUAA Case ${id}`;

  const ecliMatch = text.match(/ECLI:[A-Z]{2}:[A-Za-z0-9.]+:\d{4}:\d+/);
  const referenceMatch = text.match(/Reference\s+([A-Za-zÀ-ÿ]+),/);

  return {
    id,
    title,
    text: `${title}. ${body}`,
    ecli: ecliMatch ? ecliMatch[0] : null,
    country: referenceMatch ? referenceMatch[1] : null,
  };
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;
  const rangeStart = Number(process.env.EUAA_ID_START || 6100);
  const rangeEnd = Number(process.env.EUAA_ID_END || 6180);

  console.log(`در حال اسکن واقعی EUAA Case Law Database (CaseLawID ${rangeStart}..${rangeEnd})...`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند — فقط واکشی واقعی انجام می‌شود، embedding/ذخیره رد می‌شود.\n"
    );
  }

  let found = 0;
  let totalChunks = 0;
  let totalStored = 0;

  for (let id = rangeEnd; id >= rangeStart; id--) {
    const sourceUrl = `${BASE}/pages/viewcaselaw.aspx?CaseLawID=${id}`;
    if (!dryRun && (await documentAlreadyIngested("euaa", sourceUrl))) continue;

    const c = await fetchCase(id);
    if (!c) continue;
    found++;
    console.log(`  #${id}: ${c.title.slice(0, 70)} ${c.ecli ? `(${c.ecli})` : ""}`);

    const chunks = chunkText(c.text, 500, 50);
    totalChunks += chunks.length;
    if (dryRun) continue;

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.text);
      await insertLegalDocument({
        source: "euaa",
        jurisdiction: "EU",
        country: c.country,
        title: c.title,
        sectionReference: c.ecli || `EUAA Case Law #${c.id}`,
        fullText: chunk.text,
        embedding,
        sourceUrl,
      });
      totalStored++;
    }
  }

  console.log("\n--- نتیجه واقعی ingestion از EUAA Case Law Database ---");
  console.log(`آرای پیدا‌شده: ${found}`);
  console.log(`chunkهای تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log("رکوردی در دیتابیس ذخیره نشد (dry run).");
  } else {
    console.log(`رکوردهای ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion EUAA شکست خورد:", err);
  process.exit(1);
});
