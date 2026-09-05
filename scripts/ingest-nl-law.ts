import "./_env";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument, documentAlreadyIngested } from "../lib/db";

const BASE = "https://wetten.overheid.nl";

// قوانین ملی مهاجرتی هلند — شناسه‌های واقعی BWB (Basis Wetten Bestand) که
// مستقیماً روی wetten.overheid.nl بررسی و تایید شدند.
const DUTCH_LAWS = [
  { bwbId: "BWBR0011823", shortName: "Vw2000", fullName: "Vreemdelingenwet 2000 (قانون اتباع بیگانه هلند)" },
  { bwbId: "BWBR0011825", shortName: "Vb2000", fullName: "Vreemdelingenbesluit 2000 (آیین‌نامه اجرایی قانون اتباع بیگانه)" },
  { bwbId: "BWBR0003738", shortName: "RWN", fullName: "Rijkswet op het Nederlanderschap (قانون تابعیت هلند)" },
];

// عبارت‌های ثابت رابط کاربری (منوی اکشن هر ماده روی wetten.overheid.nl) —
// بخشی از متن قانونی نیستند و باید حذف شوند (تایید شده با بررسی HTML واقعی).
const UI_NOISE = [
  "Toon relaties in LiDO",
  "Maak een permanente link",
  "Toon wetstechnische informatie",
  "Vergelijk met andere versie tekst regeling",
  "Druk het regelingonderdeel af",
  "Sla het regelingonderdeel op",
  "Druk de regeling af",
  "Sla de regeling op",
];

interface Section {
  label: string; // مثلا "Artikel 1"
  text: string;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(html: string): string {
  let cleaned = html.replace(/<div class="article__header--law artikel">[\s\S]*?<\/ul>\s*<\/div>/, " ");
  cleaned = cleaned.replace(/<[^>]+>/g, " ");
  cleaned = decodeHtmlEntities(cleaned);
  for (const noise of UI_NOISE) cleaned = cleaned.split(noise).join(" ");
  return cleaned.replace(/\.\.\./g, " ").replace(/\s+/g, " ").trim();
}

function parseSections(html: string): Section[] {
  const markerRegex = /<div class="artikel" id="[^"]*">/g;
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRegex.exec(html))) starts.push(m.index);

  const sections: Section[] = [];
  for (let i = 0; i < starts.length; i++) {
    const chunkHtml = html.slice(starts[i], starts[i + 1] ?? starts[i] + 20000);
    const labelMatch = chunkHtml.match(/<h4[^>]*>([^<]*)<\/h4>/);
    const label = labelMatch ? decodeHtmlEntities(labelMatch[1]).trim() : `Artikel ${i + 1}`;
    const body = stripTags(chunkHtml);
    if (body.length < 40) continue; // مواد خیلی کوتاه/منسوخ (Vervallen) رد می‌شوند
    sections.push({ label, text: `${label}. ${body}` });
  }
  return sections;
}

async function fetchLawHtml(bwbId: string): Promise<string> {
  const res = await fetch(`${BASE}/${bwbId}`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`دانلود ${bwbId} شکست خورد: ${res.status}`);
  return res.text();
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;
  const onlyLaws = process.env.NL_LAWS ? process.env.NL_LAWS.split(",") : null;
  const laws = onlyLaws ? DUTCH_LAWS.filter((l) => onlyLaws.includes(l.bwbId)) : DUTCH_LAWS;

  console.log(`در حال ایندکس ${laws.length} قانون ملی هلند از wetten.overheid.nl...`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند — فقط واکشی و پارس واقعی HTML انجام می‌شود.\n"
    );
  }

  let totalSections = 0;
  let totalChunks = 0;
  let totalStored = 0;

  for (const law of laws) {
    console.log(`\nقانون: ${law.fullName} (${law.bwbId})`);
    const html = await fetchLawHtml(law.bwbId);
    const sections = parseSections(html);
    console.log(`  ${sections.length} ماده واقعی استخراج شد`);
    totalSections += sections.length;

    for (const section of sections) {
      const sourceUrl = `${BASE}/${law.bwbId}#${section.label.replace(/\s+/g, "")}`;
      if (!dryRun && (await documentAlreadyIngested("nl_law", sourceUrl))) continue;

      const chunks = chunkText(section.text, 500, 50);
      totalChunks += chunks.length;
      if (dryRun) continue;

      for (const chunk of chunks) {
        const embedding = await embedText(chunk.text);
        await insertLegalDocument({
          source: "nl_law",
          jurisdiction: "EU",
          country: "NL",
          title: law.fullName,
          sectionReference: `${law.shortName} ${section.label}`,
          fullText: chunk.text,
          embedding,
          sourceUrl,
        });
        totalStored++;
      }
    }
  }

  console.log("\n--- نتیجه واقعی ingestion قوانین ملی هلند ---");
  console.log(`قوانین پردازش‌شده: ${laws.length}`);
  console.log(`مواد واقعی استخراج‌شده: ${totalSections}`);
  console.log(`chunkهای تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log("رکوردی در دیتابیس ذخیره نشد (dry run).");
  } else {
    console.log(`رکوردهای ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion قوانین هلند شکست خورد:", err);
  process.exit(1);
});
