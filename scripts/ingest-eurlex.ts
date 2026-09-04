import "./_env";
import { chunkText } from "../lib/chunk";
import { embedText } from "../lib/embeddings";
import { insertLegalDocument, documentAlreadyIngested } from "../lib/db";

const SPARQL_ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";

// کوئری واقعی SPARQL روی EUR-Lex Cellar: قوانین در حال اجرا (in force) که با
// دو Directory Code واقعی "Asylum policy" (191030) و
// "Immigration and the right of nationals of third countries" (191040) مرتبط‌اند.
// این دو کد از طریق کوئری اکتشافی روی skos:prefLabel واقعا در Cellar پیدا شدند.
const SPARQL_QUERY = `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?title WHERE {
  VALUES ?dir {
    <http://publications.europa.eu/resource/authority/dir-eu-legal-act/191030>
    <http://publications.europa.eu/resource/authority/dir-eu-legal-act/191040>
  }
  ?work cdm:resource_legal_is_about_concept_directory-code ?dir .
  ?work cdm:resource_legal_id_celex ?celex .
  ?work cdm:resource_legal_in-force ?inForce .
  ?expr cdm:expression_belongs_to_work ?work .
  ?expr cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
  ?expr cdm:expression_title ?title .
  FILTER(STRSTARTS(STR(?celex), "3"))
  FILTER(?inForce = true)
}
ORDER BY DESC(?celex)
LIMIT ${Number(process.env.EURLEX_LIMIT || 20)}
`;

interface EurlexWork {
  celex: string;
  title: string;
}

// «پیمان جدید مهاجرت و پناهندگی اتحادیه اروپا» (EU Pact on Migration and
// Asylum) — از ۱۲ ژوئن ۲۰۲۶ لازم‌الاجرا شده. برخی از این ۹ سند هنوز در Cellar
// با directory-code «Asylum policy»/«Immigration» برچسب‌گذاری نشده‌اند (تست
// واقعی SPARQL نشان داد Screening Regulation و Eurodac Regulation هیچ
// directory-code ثبت‌شده‌ای ندارند)، پس کوئری اکتشافی به‌تنهایی آن‌ها را از
// دست می‌دهد. به همین دلیل این لیست شناخته‌شده و پایدار (CELEX واقعی) همیشه
// جداگانه واکشی می‌شود تا پوشش کامل Pact تضمین شود.
const KNOWN_PACT_CELEX = [
  "32024R1347", // Qualification Regulation
  "32024R1348", // Asylum Procedure Regulation (APR)
  "32024R1349", // Return Border Procedure Regulation
  "32024R1350", // Union Resettlement Framework
  "32024R1351", // Asylum and Migration Management Regulation (AMMR)
  "32024R1356", // Screening Regulation
  "32024R1358", // Eurodac Regulation
  "32024R1359", // Crisis and Force Majeure Regulation
  "32024L1346", // Reception Conditions Directive (recast)
];

async function runSparql(query: string): Promise<any[]> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "application/sparql-results+json");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!res.ok) {
    throw new Error(`EUR-Lex SPARQL endpoint با خطای ${res.status} پاسخ داد`);
  }
  const data = await res.json();
  return data.results.bindings;
}

async function runSparqlQuery(): Promise<EurlexWork[]> {
  const bindings = await runSparql(SPARQL_QUERY);
  return bindings.map((b: any) => ({
    celex: b.celex.value as string,
    title: b.title.value as string,
  }));
}

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

async function fetchKnownPactWorks(): Promise<EurlexWork[]> {
  const works: EurlexWork[] = [];
  for (const celex of KNOWN_PACT_CELEX) {
    const title = await fetchTitleForCelex(celex);
    if (title) works.push({ celex, title });
    else console.warn(`  ⚠ عنوان برای CELEX شناخته‌شده ${celex} پیدا نشد (ممکن است هنوز در Cellar کامل نشده باشد)`);
  }
  return works;
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

async function fetchDocumentText(celex: string): Promise<string> {
  const url = `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celex}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const html = await res.text();
  return stripHtml(html);
}

async function main() {
  const dryRun = !process.env.HF_TOKEN || !process.env.DATABASE_URL;

  console.log("در حال اجرای کوئری واقعی SPARQL روی EUR-Lex Cellar...");
  const discovered = await runSparqlQuery();
  console.log(`  تعداد سند قانونی پیدا‌شده از کوئری directory-code: ${discovered.length}`);

  console.log("در حال واکشی تضمینی ۹ سند اصلی Pact on Migration and Asylum...");
  const pactWorks = await fetchKnownPactWorks();
  console.log(`  ${pactWorks.length} سند از Pact پیدا شد`);

  const byCelex = new Map<string, EurlexWork>();
  for (const w of [...discovered, ...pactWorks]) byCelex.set(w.celex, w);
  const works = Array.from(byCelex.values());
  console.log(`  مجموع اسناد یکتا برای پردازش: ${works.length}`);

  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN: HF_TOKEN و/یا DATABASE_URL تنظیم نشده‌اند — فقط کوئری SPARQL واقعی و واکشی متن انجام می‌شود، embedding/ذخیره رد می‌شود.\n"
    );
  }

  let totalChunks = 0;
  let totalStored = 0;

  for (const work of works) {
    const sourceUrl = `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${work.celex}`;
    if (!dryRun && (await documentAlreadyIngested("eurlex", sourceUrl))) {
      continue; // قبلاً ایندکس شده
    }

    console.log(`  CELEX ${work.celex}: ${work.title.slice(0, 70)}...`);
    const bodyText = await fetchDocumentText(work.celex);
    if (!bodyText || bodyText.length < 200) {
      console.warn(`    ⚠ متن کامل برای ${work.celex} پیدا نشد، رد شد`);
      continue;
    }
    const fullText = `${work.title}. ${bodyText}`;
    const chunks = chunkText(fullText, 500, 50);
    totalChunks += chunks.length;

    if (dryRun) continue;

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.text);
      await insertLegalDocument({
        source: "eurlex",
        jurisdiction: "EU",
        country: null,
        title: work.title,
        sectionReference: `CELEX ${work.celex}`,
        fullText: chunk.text,
        embedding,
        sourceUrl,
      });
      totalStored++;
    }
  }

  console.log("\n--- نتیجه واقعی ingestion از EUR-Lex ---");
  console.log(`اسناد پردازش‌شده: ${works.length}`);
  console.log(`chunkهای تولیدشده: ${totalChunks}`);
  if (dryRun) {
    console.log("رکوردی در دیتابیس ذخیره نشد (dry run).");
  } else {
    console.log(`رکوردهای ذخیره‌شده در legal_documents: ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("❌ ingestion EUR-Lex شکست خورد:", err);
  process.exit(1);
});
