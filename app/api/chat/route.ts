import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { searchSimilarDocuments, type LegalDocumentRow } from "@/lib/db";
import { qwenChat } from "@/lib/qwen";

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

  try {
    const questionEmbedding = await embedText(question);
    const retrievedDocs = await searchSimilarDocuments(questionEmbedding, 8);

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
