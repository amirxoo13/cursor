import "./_env";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument, documentAlreadyIngested } from "../lib/db";
import { normalizeCountry } from "../lib/countries";

const QUERY_ENDPOINT = "https://hudoc.echr.coe.int/app/query/results";
const CONTENT_ENDPOINT = "https://hudoc.echr.coe.int/app/conversion/docx/html/body";
const CASE_PAGE = (itemid: string) => `https://hudoc.echr.coe.int/eng?i=${itemid}`;

// کوئری واقعی HUDOC: آرای قطعی (HEJUD) به انگلیسی که به اخراج، دیپورت،
// پناهندگی، اصل non-refoulement یا بازداشت مهاجرتی مربوط‌اند — دقیقاً همان
// موضوعاتی که پروژه EMN/EUAA به‌عنوان حیاتی برای حقوق مهاجرت اروپا معرفی کرد.
const HUDOC_QUERY =
  'contentsitename=ECHR AND (doctype=HEJUD) AND (languageisocode=ENG) AND ' +
  '(expulsion OR deportation OR asylum OR "non-refoulement" OR "immigration detention")';

interface HudocResult {
  itemid: string;
  docname: string;
  kpdate: string;
  article?: string;
  respondent?: string;
}

async function searchHudoc(start: number, length: number): Promise<{ total: number; results: HudocResult[] }> {
  const url = new URL(QUERY_ENDPOINT);
  url.searchParams.set("query", HUDOC_QUERY);
  url.searchParams.set("select", "itemid,docname,kpdate,article,respondent");
  url.searchParams.set("sort", "kpdate Descending");
  url.searchParams.set("start", String(start));
  url.searchParams.set("length", String(length));

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HUDOC query API با خطای ${res.status} پاسخ داد`);
  const data = await res.json();
  return {
    total: data.resultcount,
    results: (data.results || []).map((r: any) => r.columns as HudocResult),
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#xa0;/gi, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJudgmentText(itemid: string): Promise<string> {
  const url = `${CONTENT_ENDPOINT}?library=ECHR&id=${itemid}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const html = await res.text();
  return stripHtml(html);
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;
  const maxResults = Number(process.env.HUDOC_MAX || 30);

  console.log(`در حال جست‌وجوی واقعی HUDOC (آرای دادگاه اروپایی حقوق بشر مرتبط با مهاجرت/اخراج/پناهندگی)...`);
  const { total, results } = await searchHudoc(0, maxResults);
  console.log(`  تعداد کل نتایج واقعی در HUDOC: ${total} — پردازش ${results.length} مورد جدیدترین`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند — فقط جست‌وجوی واقعی انجام می‌شود، embedding/ذخیره رد می‌شود.\n"
    );
  }

  let totalChunks = 0;
  let totalStored = 0;

  for (const r of results) {
    const sourceUrl = CASE_PAGE(r.itemid);
    if (!dryRun && (await documentAlreadyIngested("hudoc", sourceUrl))) {
      continue; // قبلاً ایندکس شده
    }

    console.log(`  رای: ${r.docname} (${r.respondent || "?"}, ${r.kpdate.slice(0, 10)})`);
    const bodyText = await fetchJudgmentText(r.itemid);
    if (!bodyText || bodyText.length < 200) {
      console.warn(`    ⚠ متن کامل برای ${r.itemid} پیدا نشد، رد شد`);
      continue;
    }

    const header = `${r.docname} (ECHR, ${r.kpdate.slice(0, 10)}${r.article ? `, Articles ${r.article.replace(/;/g, ", ")}` : ""})`;
    const fullText = `${header}. ${bodyText}`;
    const chunks = chunkText(fullText, 500, 50);
    totalChunks += chunks.length;

    if (dryRun) continue;

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.text);
      await insertLegalDocument({
        source: "hudoc",
        jurisdiction: "EU",
        country: normalizeCountry(r.respondent),
        title: r.docname,
        sectionReference: `ECHR ${r.article ? `Art. ${r.article.split(";")[0]}` : ""} — ${r.kpdate.slice(0, 10)}`.trim(),
        fullText: chunk.text,
        embedding,
        sourceUrl,
      });
      totalStored++;
    }
  }

  console.log("\n--- نتیجه واقعی ingestion از HUDOC ---");
  console.log(`آرای پردازش‌شده: ${results.length}`);
  console.log(`chunkهای تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log("رکوردی در دیتابیس ذخیره نشد (dry run).");
  } else {
    console.log(`رکوردهای ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion HUDOC شکست خورد:", err);
  process.exit(1);
});
