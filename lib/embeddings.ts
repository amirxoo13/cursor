const HF_TOKEN = process.env.HF_TOKEN;
const HF_EMBEDDING_MODEL = process.env.HF_EMBEDDING_MODEL || "BAAI/bge-m3";
const HF_ENDPOINT = `https://router.huggingface.co/hf-inference/models/${HF_EMBEDDING_MODEL}/pipeline/feature-extraction`;

export const EMBEDDING_DIMENSIONS = 1024;

// سرویس رایگان HF Inference API گاهی cold-start دارد (تست واقعی تا ~۷ ثانیه
// دیده شده)؛ این تایم‌اوت سقفی واقعی می‌گذارد تا اگر سرویس کاملاً hang کرد،
// کاربر برای همیشه منتظر نماند و خطای صریح ببیند.
const HF_FETCH_TIMEOUT_MS = 30_000;

/**
 * embedding واقعی یک متن را از HF Inference API می‌گیرد (بدون هیچ داده‌ی جعلی
 * یا شبیه‌سازی‌شده). اگر HF_TOKEN تنظیم نشده باشد، خطای صریح می‌دهد.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!HF_TOKEN) {
    throw new Error(
      "HF_TOKEN تنظیم نشده است. یک توکن از https://huggingface.co/settings/tokens " +
        "بساز و در .env.local قرار بده — بدون آن امکان محاسبه embedding واقعی وجود ندارد."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HF_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(HF_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`HF Inference API بعد از ${HF_FETCH_TIMEOUT_MS / 1000} ثانیه پاسخ نداد.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `HF Inference API با خطا مواجه شد (status ${res.status}): ${body.slice(0, 500)}`
    );
  }

  const data = await res.json();
  return normalizeEmbeddingResponse(data);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embedText(text));
  }
  return results;
}

/**
 * HF feature-extraction برای مدل‌های sentence-embedding مثل bge-m3 معمولاً یک
 * بردار pooled شده (آرایه‌ی یک‌بعدی از اعداد) برمی‌گرداند، اما بسته به backend
 * ممکن است آرایه‌ی token-level (دوبعدی) برگردد که باید mean-pool شود. هر دو
 * حالت واقعی را هندل می‌کنیم (نه فرضی — طبق مستندات HF feature-extraction API).
 */
function normalizeEmbeddingResponse(data: unknown): number[] {
  if (Array.isArray(data) && typeof data[0] === "number") {
    return data as number[];
  }

  if (Array.isArray(data) && Array.isArray(data[0])) {
    const matrix = data as number[][];
    if (typeof matrix[0][0] === "number") {
      return meanPool(matrix);
    }
    // حالت [ [ [..], [..] ] ] برای بعضی backendها با batch dimension اضافه
    if (Array.isArray(matrix[0][0])) {
      return meanPool((matrix[0] as unknown) as number[][]);
    }
  }

  throw new Error(
    `پاسخ غیرمنتظره از HF Inference API دریافت شد: ${JSON.stringify(data).slice(0, 300)}`
  );
}

function meanPool(tokenVectors: number[][]): number[] {
  const dims = tokenVectors[0].length;
  const sums = new Array(dims).fill(0);
  for (const vec of tokenVectors) {
    for (let i = 0; i < dims; i++) sums[i] += vec[i];
  }
  return sums.map((s) => s / tokenVectors.length);
}
