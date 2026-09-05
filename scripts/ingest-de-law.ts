import "./_env";
import AdmZip from "adm-zip";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument, documentAlreadyIngested } from "../lib/db";

const execFileAsync = promisify(execFile);

const BASE = "https://www.gesetze-im-internet.de";

// قوانین ملی مهاجرتی آلمان — slug ها و آدرس‌های واقعی از طریق نمایه رسمی
// gii-toc.xml و بررسی مستقیم صفحات پیدا و تایید شدند.
const GERMAN_LAWS = [
  { slug: "aufenthg_2004", shortName: "AufenthG", fullName: "Aufenthaltsgesetz (قانون اقامت آلمان)" },
  { slug: "asylvfg_1992", shortName: "AsylG", fullName: "Asylgesetz (قانون پناهندگی آلمان)" },
  { slug: "stag", shortName: "StAG", fullName: "Staatsangehörigkeitsgesetz (قانون تابعیت آلمان)" },
  { slug: "freiz_gg_eu_2004", shortName: "FreizügG/EU", fullName: "Freizügigkeitsgesetz/EU (قانون آزادی رفت‌وآمد اتباع اتحادیه اروپا)" },
  { slug: "aufenthv", shortName: "AufenthV", fullName: "Aufenthaltsverordnung (آیین‌نامه اجرایی اقامت)" },
  { slug: "beschv_2013", shortName: "BeschV", fullName: "Beschäftigungsverordnung (آیین‌نامه اشتغال اتباع خارجی)" },
];

interface Section {
  enbez: string; // مثلا "§ 4" یا "§ 4a"
  titel: string;
  text: string;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(xml: string): string {
  return decodeXmlEntities(xml.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

async function downloadZipViaFetch(slug: string): Promise<Buffer> {
  const res = await fetch(`${BASE}/${slug}/xml.zip`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Accept: "*/*",
    },
  });
  if (!res.ok) throw new Error(`fetch با status ${res.status} برگشت`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * gesetze-im-internet.de (سرور دولت آلمان) گاهی به fetch بومی Node.js با خطای
 * ۵۰۳ "upstream connect error" پاسخ می‌دهد در حالی که همان درخواست از طریق
 * curl (با همان پراکسی شبکه) موفق است — به‌احتمال زیاد به‌خاطر تفاوت
 * fingerprint سطح HTTP/TLS بین undici و curl، نه یک محدودیت واقعی روی داده.
 * چون curl تقریباً روی هر محیط لینوکسی/مک/CI (و اکثر ویندوزها) موجود است، به
 *‌عنوان fallback واقعی (نه داده جعلی) استفاده می‌شود.
 */
async function downloadZipViaCurl(slug: string): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "gii-"));
  const filePath = path.join(dir, `${slug}.zip`);
  try {
    await execFileAsync("curl", [
      "-sSL",
      "-m", "30",
      "-A", "Mozilla/5.0",
      "-o", filePath,
      `${BASE}/${slug}/xml.zip`,
    ]);
    return await readFile(filePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function downloadAndExtractXml(slug: string): Promise<string> {
  let buffer: Buffer;
  try {
    buffer = await downloadZipViaFetch(slug);
  } catch (fetchErr) {
    console.warn(`  ⚠ دانلود مستقیم برای ${slug} شکست خورد (${(fetchErr as Error).message})، تلاش با curl...`);
    buffer = await downloadZipViaCurl(slug);
  }
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter((e) => e.entryName.endsWith(".xml"));
  if (entries.length === 0) throw new Error(`هیچ فایل XML در zip مربوط به ${slug} پیدا نشد`);
  return entries[0].getData().toString("utf-8");
}

function parseSections(xml: string): Section[] {
  const normBlocks = xml.match(/<norm[ >][\s\S]*?<\/norm>/g) || [];
  const sections: Section[] = [];

  for (const block of normBlocks) {
    const enbezMatch = block.match(/<enbez>(.*?)<\/enbez>/);
    if (!enbezMatch) continue;
    const enbez = decodeXmlEntities(enbezMatch[1]).trim();
    if (!enbez.startsWith("§")) continue; // فقط مواد قانونی واقعی، نه فهرست مطالب/مقدمه/امضا

    const titelMatch = block.match(/<titel[^>]*>([\s\S]*?)<\/titel>/);
    const titel = titelMatch ? stripTags(titelMatch[1]) : "";

    const textMatch = block.match(/<textdaten>([\s\S]*?)<\/textdaten>/);
    const bodyText = textMatch ? stripTags(textMatch[1]) : "";
    if (bodyText.length < 20) continue;

    sections.push({ enbez, titel, text: `${enbez} ${titel}. ${bodyText}` });
  }
  return sections;
}

function sectionUrlSlug(enbez: string): string {
  // "§ 4" -> "4"  |  "§ 4a" -> "4a"
  return enbez.replace(/^§\s*/, "").trim();
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;
  const onlyLaws = process.env.DE_LAWS ? process.env.DE_LAWS.split(",") : null;
  const laws = onlyLaws ? GERMAN_LAWS.filter((l) => onlyLaws.includes(l.slug)) : GERMAN_LAWS;

  console.log(`در حال ایندکس ${laws.length} قانون ملی آلمان از gesetze-im-internet.de...`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند — فقط واکشی و پارس واقعی XML انجام می‌شود، embedding/ذخیره رد می‌شود.\n"
    );
  }

  let totalSections = 0;
  let totalChunks = 0;
  let totalStored = 0;

  for (const law of laws) {
    console.log(`\nقانون: ${law.fullName} (${law.slug})`);
    const xml = await downloadAndExtractXml(law.slug);
    const sections = parseSections(xml);
    console.log(`  ${sections.length} ماده (§) واقعی استخراج شد`);
    totalSections += sections.length;

    for (const section of sections) {
      const sourceUrl = `${BASE}/${law.slug}/__${sectionUrlSlug(section.enbez)}.html`;
      if (!dryRun && (await documentAlreadyIngested("de_law", sourceUrl))) {
        continue; // قبلاً ایندکس شده
      }

      const chunks = chunkText(section.text, 500, 50);
      totalChunks += chunks.length;

      if (dryRun) continue;

      for (const chunk of chunks) {
        const embedding = await embedText(chunk.text);
        await insertLegalDocument({
          source: "de_law",
          jurisdiction: "EU",
          country: "DE",
          title: law.fullName,
          sectionReference: `${law.shortName} ${section.enbez}`,
          fullText: chunk.text,
          embedding,
          sourceUrl,
        });
        totalStored++;
      }
    }
  }

  console.log("\n--- نتیجه واقعی ingestion قوانین ملی آلمان ---");
  console.log(`قوانین پردازش‌شده: ${laws.length}`);
  console.log(`مواد (§) واقعی استخراج‌شده: ${totalSections}`);
  console.log(`chunkهای تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log("رکوردی در دیتابیس ذخیره نشد (dry run).");
  } else {
    console.log(`رکوردهای ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion قوانین آلمان شکست خورد:", err);
  process.exit(1);
});
