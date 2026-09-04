import "dotenv/config";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument } from "../lib/db";

const API_BASE = "https://www.federalregister.gov/api/v1/documents.json";

// آژانس‌های مرتبط با مهاجرت (طبق agencies.json واقعیِ Federal Register)
const IMMIGRATION_AGENCY_SLUGS = [
  "u-s-citizenship-and-immigration-services",
  "u-s-immigration-and-customs-enforcement",
  "executive-office-for-immigration-review",
  "homeland-security-department",
];

interface FRDocument {
  title: string;
  abstract: string | null;
  body_html_url: string;
  html_url: string;
  document_number: string;
  publication_date: string;
  type: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchDocuments(perPage: number, maxPages: number): Promise<FRDocument[]> {
  const docs: FRDocument[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams();
    params.append("conditions[term]", "immigration");
    for (const slug of IMMIGRATION_AGENCY_SLUGS) {
      params.append("conditions[agencies][]", slug);
    }
    params.append("order", "newest");
    params.append("per_page", String(perPage));
    params.append("page", String(page));
    for (const f of [
      "title",
      "abstract",
      "body_html_url",
      "html_url",
      "document_number",
      "publication_date",
      "type",
    ]) {
      params.append("fields[]", f);
    }

    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (!res.ok) {
      console.warn(`  ⚠ صفحه ${page} با خطای ${res.status} رد شد`);
      break;
    }
    const data = await res.json();
    const results: FRDocument[] = data.results || [];
    if (results.length === 0) break;
    docs.push(...results);
    if (page >= (data.total_pages || 1)) break;
  }
  return docs;
}

async function fetchBodyText(doc: FRDocument): Promise<string> {
  const res = await fetch(doc.body_html_url);
  if (!res.ok) return doc.abstract || "";
  const html = await res.text();
  const text = stripHtml(html);
  return text.length > (doc.abstract?.length || 0) ? text : doc.abstract || text;
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;
  const maxPages = Number(process.env.FR_MAX_PAGES || 2);
  const perPage = Number(process.env.FR_PER_PAGE || 10);

  console.log(
    `در حال واکشی واقعی اسناد Federal Register مرتبط با مهاجرت (آژانس‌ها: ${IMMIGRATION_AGENCY_SLUGS.join(", ")})...`
  );
  const docs = await fetchDocuments(perPage, maxPages);
  console.log(`  تعداد سند پیدا‌شده: ${docs.length}`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند — فقط واکشی و پارس واقعی انجام می‌شود، embedding/ذخیره در دیتابیس رد می‌شود.\n"
    );
  }

  let totalChunks = 0;
  let totalStored = 0;

  for (const doc of docs) {
    console.log(`  سند: ${doc.title.slice(0, 70)}... (${doc.document_number})`);
    const bodyText = await fetchBodyText(doc);
    const fullText = `${doc.title}. ${bodyText}`;
    const chunks = chunkText(fullText, 500, 50);
    totalChunks += chunks.length;

    if (dryRun) continue;

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.text);
      await insertLegalDocument({
        source: "federal_register",
        jurisdiction: "US",
        country: "US",
        title: doc.title,
        sectionReference: `Federal Register No. ${doc.document_number} (${doc.publication_date})`,
        fullText: chunk.text,
        embedding,
        sourceUrl: doc.html_url,
      });
      totalStored++;
    }
  }

  console.log("\n--- نتیجه واقعی ingestion از Federal Register ---");
  console.log(`اسناد پردازش‌شده: ${docs.length}`);
  console.log(`chunkهای تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log("رکوردی در دیتابیس ذخیره نشد (dry run).");
  } else {
    console.log(`رکوردهای ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion Federal Register شکست خورد:", err);
  process.exit(1);
});
