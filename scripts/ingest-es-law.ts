import "./_env";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument, documentAlreadyIngested } from "../lib/db";

const BASE = "https://www.boe.es";

// قوانین ملی مهاجرتی اسپانیا — شناسه‌های واقعی BOE که مستقیماً بررسی و
// تایید شدند (endpoint رسمی XML دولت اسپانیا: diario_boe/xml.php).
const SPANISH_LAWS = [
  {
    boeId: "BOE-A-2000-544",
    shortName: "LOEX",
    fullName: "Ley Orgánica 4/2000 (قانون حقوق و آزادی‌های اتباع بیگانه در اسپانیا)",
  },
  {
    boeId: "BOE-A-2011-7703",
    shortName: "RD 557/2011",
    fullName: "Real Decreto 557/2011 (آیین‌نامه اجرایی قانون اتباع بیگانه اسپانیا)",
  },
];

interface Section {
  label: string;
  text: string;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * تگ <texto> در XML رسمی BOE هم برای متن اصلی سند و هم برای خلاصه‌ی
 * تغییرات مرتبط (بلوک‌های <anterior>/<posterior>) استفاده می‌شود. متن اصلی
 * سند همیشه بسیار بزرگ‌تر است، پس بزرگ‌ترین <texto> واقعی متن سند است
 * (تایید شده با بررسی XML واقعی BOE-A-2000-544).
 */
function extractMainBody(xml: string): string {
  const regex = /<texto[^>]*>([\s\S]*?)<\/texto>/g;
  let best = "";
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml))) {
    if (m[1].length > best.length) best = m[1];
  }
  return best;
}

function parseSections(bodyXml: string): Section[] {
  const markerRegex = /<p class="articulo">/g;
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRegex.exec(bodyXml))) starts.push(m.index);

  const sections: Section[] = [];
  for (let i = 0; i < starts.length; i++) {
    const chunkXml = bodyXml.slice(starts[i], starts[i + 1] ?? bodyXml.length);
    const labelMatch = chunkXml.match(/<p class="articulo">(.*?)<\/p>/);
    const label = labelMatch ? stripTags(labelMatch[1]) : `Artículo ${i + 1}`;
    const body = stripTags(chunkXml);
    if (body.length < 40) continue;
    sections.push({ label, text: body });
  }
  return sections;
}

async function fetchLawXml(boeId: string): Promise<string> {
  const res = await fetch(`${BASE}/diario_boe/xml.php?id=${boeId}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`دانلود ${boeId} شکست خورد: ${res.status}`);
  return res.text();
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;
  const onlyLaws = process.env.ES_LAWS ? process.env.ES_LAWS.split(",") : null;
  const laws = onlyLaws ? SPANISH_LAWS.filter((l) => onlyLaws.includes(l.boeId)) : SPANISH_LAWS;

  console.log(`در حال ایندکس ${laws.length} قانون ملی اسپانیا از BOE...`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند — فقط واکشی و پارس واقعی XML انجام می‌شود.\n"
    );
  }

  let totalSections = 0;
  let totalChunks = 0;
  let totalStored = 0;

  for (const law of laws) {
    console.log(`\nقانون: ${law.fullName} (${law.boeId})`);
    const xml = await fetchLawXml(law.boeId);
    const body = extractMainBody(xml);
    const sections = parseSections(body);
    console.log(`  ${sections.length} ماده واقعی استخراج شد`);
    totalSections += sections.length;

    for (const section of sections) {
      const sourceUrl = `${BASE}/buscar/act.php?id=${law.boeId}`;
      if (!dryRun && (await documentAlreadyIngested("es_law", `${sourceUrl}#${section.label}`))) continue;

      const chunks = chunkText(section.text, 500, 50);
      totalChunks += chunks.length;
      if (dryRun) continue;

      for (const chunk of chunks) {
        const embedding = await embedText(chunk.text);
        await insertLegalDocument({
          source: "es_law",
          jurisdiction: "EU",
          country: "ES",
          title: law.fullName,
          sectionReference: `${law.shortName}, ${section.label}`,
          fullText: chunk.text,
          embedding,
          sourceUrl: `${sourceUrl}#${section.label}`,
        });
        totalStored++;
      }
    }
  }

  console.log("\n--- نتیجه واقعی ingestion قوانین ملی اسپانیا ---");
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
  console.error("❌ ingestion قوانین اسپانیا شکست خورد:", err);
  process.exit(1);
});
