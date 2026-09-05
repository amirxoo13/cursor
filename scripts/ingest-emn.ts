import "./_env";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument, documentAlreadyIngested } from "../lib/db";

const execFileAsync = promisify(execFile);

// گزارش شورای مهاجرت اروپا (EMN) — سند واقعی PDF ۹۷ صفحه‌ای، منتشرشده ژوئیه
// ۲۰۲۶، شامل تحولات قانونی/سیاستی ۲۰۲۵ اتحادیه اروپا درباره مهاجرت و
// پناهندگی (از جمله اجرای Pact on Migration and Asylum). لینک از صفحه رسمی
// EMN Annual Reports کمیسیون اروپا واقعاً تایید و دانلود شد.
const EMN_REPORTS = [
  {
    title: "EMN Asylum and Migration Overview 2025",
    url: "https://home-affairs.ec.europa.eu/document/download/f3cc31c3-f636-455e-a5c0-71a1634b9303_en?filename=2025_EMN_AMO.pdf",
  },
];

async function downloadPdf(url: string): Promise<Buffer> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`fetch با status ${res.status} برگشت`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.warn(`  ⚠ دانلود مستقیم شکست خورد (${(err as Error).message})، تلاش با curl...`);
    const dir = await mkdtemp(path.join(tmpdir(), "emn-"));
    const filePath = path.join(dir, "report.pdf");
    try {
      await execFileAsync("curl", ["-sSL", "-m", "60", "-A", "Mozilla/5.0", "-o", filePath, url]);
      return await readFile(filePath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

interface PdfPage {
  page: number;
  text: string;
}

function splitIntoPages(fullText: string, totalPages: number): PdfPage[] {
  const parts = fullText.split(/--\s*(\d+)\s*of\s*\d+\s*--/);
  // parts: [textBeforePage1, "1", textOfPage1AndBeforePage2, "2", textOfPage2..., ...]
  const pages: PdfPage[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const pageNum = Number(parts[i]);
    const text = (parts[i + 1] || "").trim();
    if (text.length > 30) pages.push({ page: pageNum, text });
  }
  if (pages.length === 0 && parts[0]) {
    pages.push({ page: 1, text: parts[0].trim() });
  }
  return pages;
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;

  console.log(`در حال ایندکس ${EMN_REPORTS.length} گزارش واقعی EMN...`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند — فقط دانلود و استخراج واقعی PDF انجام می‌شود، embedding/ذخیره رد می‌شود.\n"
    );
  }

  let totalPages = 0;
  let totalChunks = 0;
  let totalStored = 0;

  for (const report of EMN_REPORTS) {
    console.log(`\nگزارش: ${report.title}`);
    const buffer = await downloadPdf(report.url);
    console.log(`  دانلود شد: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    console.log(`  ${result.total} صفحه واقعی PDF استخراج شد`);

    const pages = splitIntoPages(result.text, result.total);
    totalPages += pages.length;

    for (const p of pages) {
      const sourceUrl = `${report.url}#page=${p.page}`;
      if (!dryRun && (await documentAlreadyIngested("emn", sourceUrl))) continue;

      const chunks = chunkText(`${report.title} — page ${p.page}. ${p.text}`, 500, 50);
      totalChunks += chunks.length;
      if (dryRun) continue;

      for (const chunk of chunks) {
        const embedding = await embedText(chunk.text);
        await insertLegalDocument({
          source: "emn",
          jurisdiction: "EU",
          country: null,
          title: report.title,
          sectionReference: `${report.title}, p. ${p.page}`,
          fullText: chunk.text,
          embedding,
          sourceUrl,
        });
        totalStored++;
      }
    }
  }

  console.log("\n--- نتیجه واقعی ingestion از EMN ---");
  console.log(`صفحات پردازش‌شده: ${totalPages}`);
  console.log(`chunkهای تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log("رکوردی در دیتابیس ذخیره نشد (dry run).");
  } else {
    console.log(`رکوردهای ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion EMN شکست خورد:", err);
  process.exit(1);
});
