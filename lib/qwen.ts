const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL ||
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = process.env.QWEN_MODEL || "qwen3-max";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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

  const res = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
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
  });

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
