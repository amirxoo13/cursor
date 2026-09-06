import "./_env";
import fs from "node:fs";
import readline from "node:readline";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument, documentAlreadyIngested } from "../lib/db";

const SPARQL_ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";

// این اسکریپت یک فایل JSONL فیلترشده را می‌خواند که از قبل با پردازش واقعی
// دیتاست coastalcph/multi_eurlex (~65 هزار سند قانونی اتحادیه اروپا در ۲۳
// زبان، از Zenodo/HF) تولید شده — فقط اسنادی که در فیلد واقعی
// eurovoc_concepts.all_levels حداقل یکی از ۹ شناسه واقعی و تأییدشده EuroVoc
// زیر را دارند (تأیید شده با کوئری SPARQL روی publications.europa.eu روی
// اسناد شناخته‌شده‌ی پناهندگی مثل Dublin III که واقعاً همین شناسه‌ها را دارند):
// immigration(1302)، free movement of persons(1633)، migration control(185)،
// illegal migration(1915)، refugee(2986)، aid to refugees(3075)،
// right of asylum(5597)، EU migration policy(6541)، emigration(724).
// نکته مهم: eurovoc_concepts.level_3 (که در متادیتای کلاس‌بندی دیتاست است)
// این شناسه‌ها را شامل نمی‌شود — فقط all_levels شامل تگ واقعی کامل سند است؛
// این با بررسی مستقیم چند سند شناخته‌شده پناهندگی (Dublin III, Qualification
// Directive) روی داده خام تأیید شد، نه حدس.
interface MultiEurlexRecord {
  celex_id: string;
  text: string;
  labels: string[];
  split: string;
}

async function runSparql(query: string): Promise<any[]> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "application/sparql-results+json");
  const res = await fetch(url.toString(), { headers: { Accept: "application/sparql-results+json" } });
  if (!res.ok) throw new Error(`SPARQL endpoint با خطای ${res.status} پاسخ داد`);
  const data = await res.json();
  return data.results.bindings;
}

// عنوان رسمی هر سند از طریق CELEX واقعاً از Cellar (همان منبعی که
// ingest-eurlex.ts استفاده می‌کند) واکشی می‌شود — هرگز حدس زده نمی‌شود.
async function fetchTitleForCelex(celex: string): Promise<string | null> {
  const query = `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT ?title WHERE {
  ?work cdm:resource_legal_id_celex ?celex .
  FILTER(STR(?celex) = "${celex}")
  ?expr cdm:expression_belongs_to_work ?work .
  ?expr cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
  ?expr cdm:expression_title ?title .
}
LIMIT 1
`;
  const bindings = await runSparql(query);
  return bindings[0]?.title?.value ?? null;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error("استفاده: tsx scripts/ingest-multi-eurlex.ts <path-to-filtered-jsonl>");
    process.exit(1);
  }

  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;
  if (dryRun) {
    console.log("⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده — فقط شمارش و واکشی عنوان واقعی انجام می‌شود، embedding/ذخیره رد می‌شود.\n");
  }

  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  const byCelex = new Map<string, MultiEurlexRecord>();
  for await (const line of rl) {
    if (!line.trim()) continue;
    const rec = JSON.parse(line) as MultiEurlexRecord;
    if (!byCelex.has(rec.celex_id)) byCelex.set(rec.celex_id, rec);
  }
  const records = Array.from(byCelex.values());
  console.log(`اسناد یکتای فیلترشده (migration/asylum, en) از multi_eurlex: ${records.length}`);

  let processed = 0;
  let skippedDup = 0;
  let skippedNoTitle = 0;
  let totalChunks = 0;
  let totalStored = 0;

  for (const rec of records) {
    const sourceUrl = `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${rec.celex_id}`;

    // همان source_url که ingest-eurlex.ts هم استفاده می‌کند — یعنی اگر این سند
    // قبلاً از طریق SPARQL مستقیم ایندکس شده باشد، اینجا خودکار رد می‌شود.
    if (!dryRun && (await documentAlreadyIngested("eurlex", sourceUrl))) {
      skippedDup++;
      continue;
    }

    const title = await fetchTitleForCelex(rec.celex_id);
    if (!title) {
      skippedNoTitle++;
      console.warn(`  ⚠ عنوان واقعی برای CELEX ${rec.celex_id} در Cellar پیدا نشد، رد شد`);
      continue;
    }

    processed++;
    console.log(`  [${processed}/${records.length}] CELEX ${rec.celex_id}: ${title.slice(0, 75)}`);

    const fullText = `${title}. ${rec.text}`;
    const chunks = chunkText(fullText, 500, 50);
    totalChunks += chunks.length;

    if (dryRun) continue;

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.text);
      await insertLegalDocument({
        source: "eurlex",
        jurisdiction: "EU",
        country: null,
        title,
        sectionReference: `CELEX ${rec.celex_id} (MultiEURLEX)`,
        fullText: chunk.text,
        embedding,
        sourceUrl,
      });
      totalStored++;
    }
  }

  console.log("\n--- نتیجه واقعی ingestion از MultiEURLEX ---");
  console.log(`اسناد یکتا در فایل فیلترشده: ${records.length}`);
  console.log(`رد شده (قبلاً از طریق EUR-Lex مستقیم ایندکس شده بود): ${skippedDup}`);
  console.log(`رد شده (عنوان رسمی در Cellar پیدا نشد): ${skippedNoTitle}`);
  console.log(`اسناد واقعاً پردازش‌شده: ${processed}`);
  console.log(`chunk تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log("رکوردی در دیتابیس ذخیره نشد (dry run).");
  } else {
    console.log(`رکورد ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion MultiEURLEX شکست خورد:", err);
  process.exit(1);
});
