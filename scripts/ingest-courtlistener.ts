import "dotenv/config";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument } from "../lib/db";

const SEARCH_URL = "https://www.courtlistener.com/api/rest/v4/search/";
const OPINION_URL = (id: number) =>
  `https://www.courtlistener.com/api/rest/v4/opinions/${id}/`;

// کوئری‌های واقعی برای پوشش رای‌های مهاجرتی (BIA و دادگاه‌های تجدیدنظر فدرال)
const QUERIES = [
  "immigration removal proceedings",
  "asylum withholding of removal",
  "board of immigration appeals",
];

const USER_AGENT = "immigration-law-qa-platform/1.0 (research; contact via repo owner)";

interface SearchOpinion {
  id: number;
  download_url?: string;
  snippet?: string;
}

interface SearchResult {
  caseName: string;
  citation: string[];
  court: string;
  dateFiled: string;
  absolute_url: string;
  cluster_id: number;
  opinions: SearchOpinion[];
}

async function searchCourtListener(query: string, pages: number): Promise<SearchResult[]> {
  const out: SearchResult[] = [];
  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      q: query,
      type: "o",
      order_by: "dateFiled desc",
      page: String(page),
    });
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      console.warn(`  ⚠ جست‌وجوی "${query}" صفحه ${page} با خطای ${res.status} رد شد`);
      break;
    }
    const data = await res.json();
    const results: SearchResult[] = data.results || [];
    if (results.length === 0) break;
    out.push(...results);
  }
  return out;
}

async function fetchOpinionFullText(opinionId: number, token?: string): Promise<string | null> {
  if (!token) return null;
  const res = await fetch(OPINION_URL(opinionId), {
    headers: {
      "User-Agent": USER_AGENT,
      Authorization: `Token ${token}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const raw: string | undefined =
    data.plain_text || data.html_with_citations || data.html || data.html_lawbox || data.html_columbia;
  if (!raw) return null;
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;
  const token = process.env.COURTLISTENER_TOKEN || undefined;
  const pages = Number(process.env.CL_PAGES || 1);

  if (!token) {
    console.log(
      "ℹ️  COURTLISTENER_TOKEN تنظیم نشده — از snippet واقعی برگشتی از search API استفاده می‌شود " +
        "(کوتاه‌تر از متن کامل رای). برای متن کامل، توکن رایگان از " +
        "https://www.courtlistener.com/help/api/rest/ بگیر.\n"
    );
  }

  const allResults: SearchResult[] = [];
  for (const q of QUERIES) {
    console.log(`در حال جست‌وجوی واقعی CourtListener برای: "${q}"...`);
    const results = await searchCourtListener(q, pages);
    console.log(`  ${results.length} رای پیدا شد`);
    allResults.push(...results);
  }

  // حذف موارد تکراری بر اساس cluster_id
  const seen = new Set<number>();
  const uniqueResults = allResults.filter((r) => {
    if (seen.has(r.cluster_id)) return false;
    seen.add(r.cluster_id);
    return true;
  });
  console.log(`مجموع آرای یکتا: ${uniqueResults.length}`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند — فقط جست‌وجوی واقعی انجام می‌شود، embedding/ذخیره رد می‌شود.\n"
    );
  }

  let totalChunks = 0;
  let totalStored = 0;

  for (const result of uniqueResults) {
    const opinion = result.opinions?.[0];
    if (!opinion) continue;

    const fullText = (await fetchOpinionFullText(opinion.id, token)) || opinion.snippet || "";
    if (!fullText || fullText.length < 50) continue;

    const citation = result.citation?.[0] || "";
    const header = `${result.caseName} (${result.court}, ${result.dateFiled})${citation ? `, ${citation}` : ""}`;
    const text = `${header}. ${fullText}`;

    console.log(`  رای: ${result.caseName.slice(0, 60)} — ${result.dateFiled}`);

    const chunks = chunkText(text, 500, 50);
    totalChunks += chunks.length;

    if (dryRun) continue;

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.text);
      await insertLegalDocument({
        source: "courtlistener",
        jurisdiction: "US",
        country: "US",
        title: result.caseName,
        sectionReference: citation || result.court,
        fullText: chunk.text,
        embedding,
        sourceUrl: `https://www.courtlistener.com${result.absolute_url}`,
      });
      totalStored++;
    }
  }

  console.log("\n--- نتیجه واقعی ingestion از CourtListener ---");
  console.log(`آرای پردازش‌شده: ${uniqueResults.length}`);
  console.log(`chunkهای تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log("رکوردی در دیتابیس ذخیره نشد (dry run).");
  } else {
    console.log(`رکوردهای ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion CourtListener شکست خورد:", err);
  process.exit(1);
});
