import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { searchSimilarDocuments, type LegalDocumentRow } from "@/lib/db";
import { qwenChat, rewriteQueryForRetrieval } from "@/lib/qwen";

export const runtime = "nodejs";

const SYSTEM_PROMPT_TEMPLATE = `تو یک دستیار متخصص قوانین مهاجرت اتحادیه اروپا و آمریکا هستی.
فقط بر اساس متن‌های زیر (که از منابع رسمی بازیابی شده‌اند) به سؤال کاربر جواب بده.
اگر متن‌های داده‌شده برای پاسخ کافی نبود، صادقانه بگو که اطلاعات کافی در دسترس نیست
و حدس نزن.

قوانین پاسخ‌دهی:
- پاسخ را کاملاً به زبان فارسیِ روان و محاوره‌ای بنویس، نه ترجمه‌ی ماشینیِ خشک
- پاسخ باید کامل و دقیق باشد، جزئیات مهم (شرایط، مهلت‌ها، استثناها) را حذف نکن
- زیر هر ادعا، به شماره ماده/بخش قانونی منبع اشاره کن (مثلاً «طبق 8 CFR § 204.1»)
- در پایان پاسخ، یک خط یادآوری بنویس که این پاسخ جایگزین مشاوره حقوقی رسمی نیست

متن‌های بازیابی‌شده:
{{RETRIEVED_CHUNKS}}

سؤال کاربر: {{USER_QUESTION}}`;

interface ChatRequestBody {
  question?: string;
  jurisdiction?: "US" | "EU";
}

export interface ChatResponseSource {
  id: number;
  source: string;
  jurisdiction: string;
  title: string | null;
  sectionReference: string | null;
  sourceUrl: string | null;
  distance: number | null;
}

function formatRetrievedChunks(docs: LegalDocumentRow[]): string {
  if (docs.length === 0) {
    return "(هیچ سند مرتبطی در پایگاه داده پیدا نشد)";
  }
  return docs
    .map((doc, i) => {
      const ref = doc.section_reference || doc.title || "منبع نامشخص";
      return `[سند ${i + 1} — ${ref}]\n${doc.full_text}`;
    })
    .join("\n\n---\n\n");
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست باید JSON معتبر باشد" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "فیلد question الزامی است" }, { status: 400 });
  }
  const jurisdiction = body.jurisdiction === "US" || body.jurisdiction === "EU" ? body.jurisdiction : undefined;

  try {
    // منابع (eCFR، Federal Register، EUR-Lex و...) همه به انگلیسی‌اند. جست‌وجوی
    // برداری مستقیم با سؤال محاوره‌ای فارسی معمولاً نتایج ضعیف‌تری می‌دهد (تست
    // واقعی نشان داد رتبه‌ی سند صحیح می‌تواند از رتبه ۱۸ به رتبه ۱ برسد). به
    // همین دلیل سؤال به چند عبارت جست‌وجوی انگلیسی با اصطلاحات حقوقی رسمی
    // بازنویسی می‌شود (هر عبارت زاویه‌ی متفاوتی از سؤال را پوشش می‌دهد) و
    // نتایج جست‌وجوی همه‌ی عبارت‌ها با هم ترکیب می‌شوند. اگر بازنویسی (که خودش
    // یک فراخوانی واقعی Qwen است) شکست بخورد، به جست‌وجوی مستقیم با متن فارسی
    // برمی‌گردیم — نه به داده‌ی جعلی.
    let retrievalQueries: string[] = [question];
    try {
      retrievalQueries = await rewriteQueryForRetrieval(question);
    } catch (rewriteErr) {
      console.warn("بازنویسی کوئری برای جست‌وجو شکست خورد، از متن فارسی اصلی استفاده می‌شود:", rewriteErr);
    }

    const bestDistanceById = new Map<number, LegalDocumentRow>();
    for (const query of retrievalQueries) {
      const embedding = await embedText(query);
      const results = await searchSimilarDocuments(embedding, 8, jurisdiction);
      for (const doc of results) {
        const existing = bestDistanceById.get(doc.id);
        if (!existing || (doc.distance ?? Infinity) < (existing.distance ?? Infinity)) {
          bestDistanceById.set(doc.id, doc);
        }
      }
    }
    const retrievedDocs = Array.from(bestDistanceById.values())
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      .slice(0, 10);

    const prompt = SYSTEM_PROMPT_TEMPLATE.replace(
      "{{RETRIEVED_CHUNKS}}",
      formatRetrievedChunks(retrievedDocs)
    ).replace("{{USER_QUESTION}}", question);

    const answer = await qwenChat([{ role: "system", content: prompt }]);

    const sources: ChatResponseSource[] = retrievedDocs.map((doc) => ({
      id: doc.id,
      source: doc.source,
      jurisdiction: doc.jurisdiction,
      title: doc.title,
      sectionReference: doc.section_reference,
      sourceUrl: doc.source_url,
      distance: doc.distance ?? null,
    }));

    return NextResponse.json({ answer, sources });
  } catch (err: any) {
    console.error("خطا در پردازش /api/chat:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "خطای غیرمنتظره در پردازش سؤال. تنظیمات .env.local (DATABASE_URL, HF_TOKEN, QWEN_API_KEY) را بررسی کن.",
      },
      { status: 500 }
    );
  }
}
