import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// neon() یک تابع sql tagged-template برمی‌گرداند که روی HTTP کار می‌کند،
// بنابراین هم در API routeهای Vercel و هم در اسکریپت‌های ingestion (Node) بدون
// نیاز به connection pooling جداگانه کار می‌کند. مقداردهی به‌صورت lazy انجام
// می‌شود تا importکردن این فایل (مثلاً در dry-run) بدون DATABASE_URL خطا ندهد؛
// خطای واقعی فقط زمانی داده می‌شود که واقعاً بخواهیم کوئری بزنیم.
let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  // یکپارچه‌سازی Vercel Marketplace با Neon گاهی به‌جای DATABASE_URL نام‌های
  // دیگری مثل DATABASE_URL_UNPOOLED یا POSTGRES_URL می‌سازد؛ چون درایور HTTP
  // این پکیج نیازی به connection pooling ندارد، هرکدام که موجود باشد کار می‌کند.
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL تنظیم نشده است. یک دیتابیس Neon Postgres بساز (با pgvector فعال) " +
        "و مقدارش را در .env.local قرار بده — به .env.example نگاه کن."
    );
  }
  _sql = neon(connectionString);
  return _sql;
}

export const sql: NeonQueryFunction<false, false> = ((...args: any[]) =>
  (getSql() as any)(...args)) as unknown as NeonQueryFunction<false, false>;

export type LegalSource =
  | "ecfr"
  | "federal_register"
  | "courtlistener"
  | "eurlex"
  | "hudoc"
  | "euaa"
  | "de_law"
  | "emn"
  | "nl_law"
  | "es_law";

export type Jurisdiction = "US" | "EU";

export interface LegalDocumentRow {
  id: number;
  source: LegalSource;
  jurisdiction: Jurisdiction;
  country: string | null;
  title: string | null;
  section_reference: string | null;
  full_text: string;
  source_url: string | null;
  last_updated: string;
  distance?: number;
}

export interface InsertLegalDocument {
  source: LegalSource;
  jurisdiction: Jurisdiction;
  country?: string | null;
  title?: string | null;
  sectionReference?: string | null;
  fullText: string;
  embedding: number[];
  sourceUrl?: string | null;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function insertLegalDocument(doc: InsertLegalDocument) {
  const vectorLiteral = toVectorLiteral(doc.embedding);
  await sql`
    INSERT INTO legal_documents
      (source, jurisdiction, country, title, section_reference, full_text, embedding, source_url)
    VALUES
      (${doc.source}, ${doc.jurisdiction}, ${doc.country ?? null}, ${doc.title ?? null},
       ${doc.sectionReference ?? null}, ${doc.fullText}, ${vectorLiteral}::vector, ${doc.sourceUrl ?? null})
  `;
}

/**
 * قبل از embedding/insert چک می‌کند که آیا این سند (بر اساس source + source_url)
 * قبلاً ایندکس شده یا نه — تا اجرای دوباره‌ی اسکریپت‌های ingestion (مثلاً بعد از
 * قطعی موقت HF API) باعث تکرار رکورد نشود و embedding call بیخودی هدر نرود.
 */
export async function documentAlreadyIngested(
  source: string,
  sourceUrl: string | null | undefined
): Promise<boolean> {
  if (!sourceUrl) return false;
  const rows = (await sql`
    SELECT 1 FROM legal_documents WHERE source = ${source} AND source_url = ${sourceUrl} LIMIT 1
  `) as unknown as any[];
  return rows.length > 0;
}

export interface SearchFilters {
  jurisdiction?: Jurisdiction;
  /** کد ISO2 کشور (مثلاً "DE")؛ null صریح یعنی فقط اسناد بدون کشور خاص (مثل مقررات عمومی EU) */
  country?: string | null;
}

export async function searchSimilarDocuments(
  embedding: number[],
  limit = 8,
  filters: SearchFilters = {}
): Promise<LegalDocumentRow[]> {
  const vectorLiteral = toVectorLiteral(embedding);
  const conditions: string[] = [];
  const params: any[] = [vectorLiteral];

  if (filters.jurisdiction) {
    params.push(filters.jurisdiction);
    conditions.push(`jurisdiction = $${params.length}`);
  }
  if (filters.country === null) {
    conditions.push("country IS NULL");
  } else if (filters.country) {
    params.push(filters.country);
    conditions.push(`country = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit);

  const query = `
    SELECT id, source, jurisdiction, country, title, section_reference, full_text,
           source_url, last_updated,
           embedding <=> $1::vector AS distance
    FROM legal_documents
    ${whereClause}
    ORDER BY embedding <=> $1::vector
    LIMIT $${params.length}
  `;

  const rows = (await sql(query, params)) as unknown as LegalDocumentRow[];
  return rows;
}
