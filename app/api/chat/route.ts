import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { searchSimilarDocuments, type LegalDocumentRow } from "@/lib/db";
import { qwenChatStream, rewriteQueryForRetrieval } from "@/lib/qwen";
import { COUNTRY_LABEL_FA } from "@/lib/countries";

export const runtime = "nodejs";
// بدون این تنظیم، Vercel از حداکثر زمان اجرای پیش‌فرض (که می‌تواند تا ۱۰-۱۵
// ثانیه کم باشد) استفاده می‌کند و تابع را وسط کار Kill می‌کند. Qwen3.8-Max
// یک مدل thinking-only است (فاز فکرکردنش قابل خاموش‌شدن نیست) و حتی با
// reasoning_effort="low" ممکن است مجموع فکرکردن+بازیابی+پاسخ به ۱۵۰-۱۸۰
// ثانیه برسد؛ این عدد را از ۱۲۰ به ۲۴۰ افزایش دادیم تا حتی سؤال‌های سنگین‌تر
// وسط استریم قطع نشوند (سقف واقعی و مجاز روی پلن Pro).
export const maxDuration = 240;

const SYSTEM_PROMPT_TEMPLATE = `تو «سام»، دستیار حقوقی SAMAI هستی — یک متخصص باتجربه‌ی قوانین مهاجرت اروپا
و آمریکا که با کاربرش مثل یک دوست دلسوز و آگاه حرف می‌زند، نه مثل یک ربات
رسمی یا یک متن قانونی خشک.

فقط بر اساس متن‌های زیر (که از منابع رسمی بازیابی شده‌اند) جواب بده. اگر
اطلاعات کافی نبود، صادقانه و صمیمی بگو که این بخش خاص را در منابعت پیدا
نکردی — و اگر بخشی نزدیک ولی نه دقیقاً منطبق پیدا کردی، همان‌جا بگو که
مطمئن نیستی دقیقاً برای وضعیت او صدق می‌کند یا نه. هرگز حدس نزن و هرگز
چیزی را که در متن‌ها نیست به‌عنوان قطعیت جا نزن.

لحن و سبک نوشتن:
- عامیانه، گرم و دوستانه بنویس؛ انگار داری برای یک دوست یا آشنا توضیح
  می‌دهی، نه یک گزارش اداری. از جمله‌های کوتاه و طبیعی فارسی محاوره‌ای
  استفاده کن (نه ترجمه‌ی ماشینیِ رسمی، نه لحن حقوقیِ سنگین)
- می‌توانی از عبارت‌هایی مثل «خب بذار برات بگم»، «نکته‌ی مهمش اینه که»،
  «یه چیزی که خیلیا نمی‌دونن» استفاده کنی — تا حس کند با یک آدم واقعی و
  مطلع صحبت می‌کند
- با این حال، هرگز به‌خاطر لحن دوستانه از دقت و کامل بودن کم نکن: همه‌ی
  شرایط، مهلت‌ها و استثناهای مهم را واضح بگو
- زیر هر ادعا، طبیعی و در دل جمله به ماده/بخش قانونی منبع اشاره کن (مثلاً
  «طبق ماده ۲۰۴.۱ قانون مهاجرت آمریکا...» یا «قانون اقامت آلمان، ماده ۹،
  می‌گه که...») — نیازی نیست خشک و لیست‌وار بنویسی
- پاسخ را با ساختار خوانا (تیتر، بولت در صورت نیاز) سازمان بده، ولی حس
  گفت‌وگو را حفظ کن
- در پایان، اگر موضوع پیچیده بود یا نیاز به بررسی دقیق پرونده‌ی شخصی داشت،
  خیلی طبیعی و دوستانه (نه با لحن هشدار یا دیسکلایمر) پیشنهاد بده که برای
  بررسی دقیق‌تر با تیم حقوقی SAMAI (صفحه تماس با ما) در ارتباط باشد — طوری
  که حس ترغیب‌کننده و مفید بدهد، نه یک جمله‌ی تکراری قانونی
{{COUNTRY_CONTEXT}}
متن‌های بازیابی‌شده:
{{RETRIEVED_CHUNKS}}

سؤال کاربر: {{USER_QUESTION}}`;

interface ChatRequestBody {
  question?: string;
  jurisdiction?: "US" | "EU";
  country?: string;
}

function formatRetrievedChunks(docs: LegalDocumentRow[]): string {
  if (docs.length === 0) {
    return "(هیچ سند مرتبطی در پایگاه داده پیدا نشد)";
  }
  return docs
    .map((doc, i) => {
      const ref = doc.section_reference || doc.title || "منبع نامشخص";
      const countryTag = doc.country ? ` — کشور: ${doc.country}` : "";
      return `[سند ${i + 1} — ${ref}${countryTag}]\n${doc.full_text}`;
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
  // country: کد ISO2 مشخص (مثلاً "DE") یا رشته خاص "EU_GENERAL" برای فقط
  // اسناد عمومی اتحادیه اروپا بدون کشور خاص (مثل EUR-Lex/EMN).
  const rawCountry = body.country?.trim();
  const countryFilter: string | null | undefined =
    rawCountry === "EU_GENERAL" ? null : rawCountry && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : undefined;
  const countryLabel = rawCountry && rawCountry !== "EU_GENERAL" ? COUNTRY_LABEL_FA[rawCountry] : undefined;

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

    // بازیابی هر عبارت (embed + جست‌وجوی برداری) مستقل از بقیه است، پس به‌صورت
    // موازی اجرا می‌شود نه پشت‌سرهم — تست واقعی نشان داد این تغییر بازیابی
    // ۳ عبارت را از ~۸ ثانیه (sequential) به کمتر از ۱ ثانیه می‌رساند.
    const perQueryResults = await Promise.all(
      retrievalQueries.map(async (query) => {
        const embedding = await embedText(query);
        return searchSimilarDocuments(embedding, 8, {
          jurisdiction,
          country: countryFilter,
        });
      })
    );

    const bestDistanceById = new Map<number, LegalDocumentRow>();
    for (const results of perQueryResults) {
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

    const countryContext = countryLabel
      ? `\nکاربر گفته کشور موردنظرش «${countryLabel}» است — اگر منبع پیدا‌شده مربوط به کشور دیگری بود، این را شفاف بگو و مشخص کن که این اطلاعات دقیقاً برای همان کشور نیست.\n`
      : "";

    const prompt = SYSTEM_PROMPT_TEMPLATE.replace("{{COUNTRY_CONTEXT}}", countryContext)
      .replace("{{RETRIEVED_CHUNKS}}", formatRetrievedChunks(retrievedDocs))
      .replace("{{USER_QUESTION}}", question);

    // پاسخ نهایی به‌صورت استریم NDJSON برگردانده می‌شود (نه متن خام، نه یک‌جا
    // در انتها) — هر خط یک شیء {"t":"r"|"c","d":"..."} است: "r" تکه‌ای از
    // فکرکردنِ زنده‌ی مدل (که در UI باید جدا و به‌شکل «در حال فکر کردن...»
    // نمایش داده شود)، "c" تکه‌ای از جواب نهایی. جزئیات در lib/qwen.ts.
    const stream = await qwenChatStream([{ role: "system", content: prompt }]);
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
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
