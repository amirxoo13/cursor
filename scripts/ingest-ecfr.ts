import "dotenv/config";
import { XMLParser } from "fast-xml-parser";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument } from "../lib/db";

const VERSIONER_BASE = "https://ecfr.federalregister.gov/api/versioner/v1";

interface StructureNode {
  identifier: string;
  type: string;
  label?: string;
  children?: StructureNode[];
}

interface ParsedSection {
  sectionNumber: string;
  heading: string;
  text: string;
}

async function getTitle8Date(): Promise<string> {
  const res = await fetch(`${VERSIONER_BASE}/titles.json`);
  if (!res.ok) throw new Error(`eCFR titles.json failed: ${res.status}`);
  const data = await res.json();
  const title8 = data.titles.find((t: any) => t.number === 8);
  if (!title8) throw new Error("Title 8 در پاسخ eCFR پیدا نشد");
  return title8.latest_issue_date as string;
}

async function getPartIdentifiers(): Promise<string[]> {
  const res = await fetch(`${VERSIONER_BASE}/structure/current/title-8.json`);
  if (!res.ok) throw new Error(`eCFR structure failed: ${res.status}`);
  const root: StructureNode = await res.json();
  const parts: string[] = [];
  function walk(node: StructureNode) {
    if (node.type === "part") parts.push(node.identifier);
    if (node.children) for (const child of node.children) walk(child);
  }
  walk(root);
  return parts;
}

function stripXmlText(node: any): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(stripXmlText).join(" ");
  if (typeof node === "object") {
    return Object.entries(node)
      .filter(([key]) => key !== ":@" && !key.startsWith("@_"))
      .map(([, value]) => stripXmlText(value))
      .join(" ");
  }
  return "";
}

function collectSections(node: any, out: ParsedSection[]) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) collectSections(item, out);
    return;
  }
  if (typeof node !== "object") return;

  if (node.DIV8 !== undefined) {
    const attrs = node[":@"] || {};
    const sectionNumber: string = attrs["@_N"] || "";
    const children = node.DIV8 as any[];
    const headingNode = children.find((c) => c.HEAD !== undefined);
    const heading = headingNode ? stripXmlText(headingNode.HEAD).trim() : "";
    const bodyNodes = children.filter((c) => c.HEAD === undefined);
    const body = stripXmlText(bodyNodes).trim();
    out.push({ sectionNumber, heading, text: `${heading} ${body}`.trim() });
    return; // داخل این DIV8 دیگر بازگشتی لازم نیست
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === ":@") continue;
    collectSections(value, out);
  }
}

async function fetchPartSections(date: string, part: string): Promise<ParsedSection[]> {
  const url = `${VERSIONER_BASE}/full/${date}/title-8.xml?part=${encodeURIComponent(part)}`;
  const res = await fetch(url, { headers: { "Accept-Encoding": "gzip" } });
  if (!res.ok) {
    console.warn(`  ⚠ part ${part} با خطای ${res.status} رد شد`);
    return [];
  }
  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: true,
    processEntities: true,
    htmlEntities: true,
  });
  const parsed = parser.parse(xml);
  const sections: ParsedSection[] = [];
  collectSections(parsed, sections);
  return sections.filter((s) => s.sectionNumber && s.text.length > 20);
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;
  const onlyParts = process.env.ECFR_PARTS
    ? process.env.ECFR_PARTS.split(",").map((p) => p.trim())
    : null;

  console.log("در حال گرفتن تاریخ آخرین نسخه‌ی Title 8 از eCFR...");
  const date = await getTitle8Date();
  console.log(`  تاریخ نسخه: ${date}`);

  console.log("در حال گرفتن ساختار Title 8 (لیست کامل Partها)...");
  let parts = await getPartIdentifiers();
  if (onlyParts) parts = parts.filter((p) => onlyParts.includes(p));
  console.log(`  تعداد Part برای ایندکس: ${parts.length}`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند، بنابراین embedding و ذخیره در دیتابیس " +
        "انجام نمی‌شود. فقط واکشی واقعی و پارس کردن XML از eCFR API اجرا می‌شود تا صحت منطق fetch/parse تایید شود.\n"
    );
  }

  let totalSections = 0;
  let totalChunks = 0;
  let totalStored = 0;

  for (const part of parts) {
    const sections = await fetchPartSections(date, part);
    totalSections += sections.length;
    if (sections.length === 0) continue;

    console.log(`  part ${part}: ${sections.length} بخش (section)`);

    for (const section of sections) {
      const chunks = chunkText(section.text, 500, 50);
      totalChunks += chunks.length;

      if (dryRun) continue;

      for (const chunk of chunks) {
        const embedding = await embedText(chunk.text);
        await insertLegalDocument({
          source: "ecfr",
          jurisdiction: "US",
          country: "US",
          title: `8 CFR Part ${part}`,
          sectionReference: `8 CFR § ${section.sectionNumber}`,
          fullText: chunk.text,
          embedding,
          sourceUrl: `https://www.ecfr.gov/current/title-8/section-${section.sectionNumber}`,
        });
        totalStored++;
      }
    }
  }

  console.log("\n--- نتیجه واقعی ingestion از eCFR ---");
  console.log(`Partهای پردازش‌شده: ${parts.length}`);
  console.log(`بخش‌های (section) واقعی استخراج‌شده: ${totalSections}`);
  console.log(`chunkهای تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log(
      "رکوردی در دیتابیس ذخیره نشد (dry run). برای ایندکس کامل، HF_TOKEN و DATABASE_URL را تنظیم کن و دوباره اجرا کن."
    );
  } else {
    console.log(`رکوردهای ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion eCFR شکست خورد:", err);
  process.exit(1);
});
