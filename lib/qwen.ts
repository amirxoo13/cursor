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
