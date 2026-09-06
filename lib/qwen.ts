const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL ||
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = process.env.QWEN_MODEL || "qwen3-max";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// اگر endpoint/توکن Qwen (مثلاً بعد از تغییر به یک endpoint یا پلن جدید)
// واقعاً hang کند و هیچ پاسخی ندهد، fetch بدون timeout تا ابد منتظر می‌ماند و
// کاربر برای همیشه «در حال جست‌وجو...» می‌بیند. این تایم‌اوت واقعی (نه
// شبیه‌سازی‌شده) تضمین می‌کند حداکثر بعد از این مدت یک خطای صریح برگردد.
const QWEN_FETCH_TIMEOUT_MS = 25_000;

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * فراخوانی واقعی Qwen3.8-Max از طریق endpoint سازگار با OpenAI روی DashScope.
 * هیچ پاسخ ساختگی یا fallback شبیه‌سازی‌شده‌ای در صورت نبود کلید تولید نمی‌شود —
 * خطای صریح داده می‌شود.
 */
export async function qwenChat(
  messages: ChatMessage[],
  options: { temperature?: number } = {}
): Promise<string> {
  if (!QWEN_API_KEY) {
    throw new Error(
      "QWEN_API_KEY تنظیم نشده است. کلید را از کنسول Alibaba Cloud Model Studio " +
        "(DashScope) بگیر و در .env.local قرار بده — به .env.example نگاه کن."
    );
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${QWEN_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: QWEN_MODEL,
          messages,
          temperature: options.temperature ?? 0.3,
        }),
      },
      QWEN_FETCH_TIMEOUT_MS
    );
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        `Qwen API (${QWEN_BASE_URL}) بعد از ${QWEN_FETCH_TIMEOUT_MS / 1000} ثانیه پاسخ نداد — احتمالاً endpoint یا کلید اشتباه/غیرفعال است.`
      );
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Qwen API با خطا مواجه شد (status ${res.status}, model=${QWEN_MODEL}): ${body.slice(0, 500)}`
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(
      `پاسخ غیرمنتظره از Qwen API: ${JSON.stringify(data).slice(0, 300)}`
    );
  }
  return content;
}

/**
 * مثل qwenChat ولی به‌صورت استریم (SSE واقعی از DashScope) — برای اینکه کاربر
 * اولین تکه‌های پاسخ را طی ۱-۲ ثانیه ببیند، نه اینکه ~۱۵-۲۰ ثانیه صفحه خالی
 * بماند تا کل پاسخ آماده شود. تست واقعی نشان داد DashScope با stream:true یک
 * text/event-stream واقعی برمی‌گرداند (نه شبیه‌سازی‌شده در سمت ما).
 */
export async function qwenChatStream(
  messages: ChatMessage[],
  options: { temperature?: number } = {}
): Promise<ReadableStream<Uint8Array>> {
  if (!QWEN_API_KEY) {
    throw new Error(
      "QWEN_API_KEY تنظیم نشده است. کلید را از کنسول Alibaba Cloud Model Studio " +
        "(DashScope) بگیر و در .env.local قرار بده — به .env.example نگاه کن."
    );
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${QWEN_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: QWEN_MODEL,
          messages,
          temperature: options.temperature ?? 0.3,
          stream: true,
        }),
      },
      QWEN_FETCH_TIMEOUT_MS
    );
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        `Qwen API (${QWEN_BASE_URL}) بعد از ${QWEN_FETCH_TIMEOUT_MS / 1000} ثانیه شروع به پاسخ نکرد — احتمالاً endpoint یا کلید اشتباه/غیرفعال است.`
      );
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Qwen API با خطا مواجه شد (status ${res.status}, model=${QWEN_MODEL}): ${body.slice(0, 500)}`
    );
  }
  if (!res.body) {
    throw new Error("پاسخ استریم از Qwen API بدنه‌ای نداشت");
  }

  const upstreamReader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await upstreamReader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          // خط ناقص JSON بین دو chunk شبکه بریده شده — نادیده گرفته می‌شود،
          // چون بخش باقی‌مانده در buffer نگه داشته شده و در pull بعدی کامل می‌شود
        }
      }
    },
    cancel() {
      upstreamReader.cancel();
    },
  });
}

const QUERY_REWRITE_SYSTEM_PROMPT = `You rewrite a user's Persian immigration-law question into 2-3 short English
search phrases using the EXACT formal statutory/regulatory terminology that
would literally appear in the text of immigration regulations, statutes, or
case law — NOT colloquial terms and NOT a literal translation for a human
reader. For example, prefer "immigrant petition for alien relative",
"immediate relative classification", "family-sponsored preference immigrant",
"adjustment of status", "withholding of removal" over informal words like
"green card". Avoid the phrase "green card" entirely; use the precise legal
term instead. Each phrase should emphasize a different angle of the question
so that, together, they cover it well.
Output ONLY the phrases, one per line, nothing else (no numbering, no quotes).`;

/**
 * سؤال فارسی کاربر را به چند عبارت جست‌وجوی انگلیسی با اصطلاحات حقوقی رسمی
 * تبدیل می‌کند تا کیفیت جست‌وجوی برداری روی متن‌های انگلیسی (eCFR، EUR-Lex و...)
 * بهتر شود. تست واقعی نشان داد یک عبارت تنها کافی نیست (مثلاً «green card»
 * باعث گمراهی جست‌وجو می‌شود)، ولی ۲-۳ عبارت با اصطلاح دقیق قانونی و ترکیب
 * نتایجشان، سند صحیح را با فاصله‌ی خیلی بهتر (و رتبه ۱) پیدا می‌کند.
 * اگر این مرحله شکست بخورد، caller باید به جست‌وجوی مستقیم با متن فارسی
 * برگردد — نه به داده‌ی جعلی.
 */
export async function rewriteQueryForRetrieval(persianQuestion: string): Promise<string[]> {
  const raw = await qwenChat(
    [
      { role: "system", content: QUERY_REWRITE_SYSTEM_PROMPT },
      { role: "user", content: persianQuestion },
    ],
    { temperature: 0.1 }
  );
  const phrases = raw
    .split("\n")
    .map((line) => line.trim().replace(/^[\d.\-)\s]+/, "").replace(/^["'«]|["'»]$/g, ""))
    .filter(Boolean);
  if (phrases.length === 0) {
    throw new Error("بازنویسی کوئری چیزی برنگرداند");
  }
  return phrases;
}
