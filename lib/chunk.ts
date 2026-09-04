import { encode, decode } from "gpt-tokenizer";

export interface Chunk {
  text: string;
  tokenCount: number;
}

/**
 * متن را به تکه‌های واقعی ~chunkSize توکنی با overlap مشخص تقسیم می‌کند
 * (توکن‌شماری واقعی با gpt-tokenizer، نه تقریب کاراکتری).
 */
export function chunkText(
  text: string,
  chunkSize = 500,
  overlap = 50
): Chunk[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const tokens = encode(clean);
  if (tokens.length <= chunkSize) {
    return [{ text: clean, tokenCount: tokens.length }];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  const step = chunkSize - overlap;

  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length);
    const slice = tokens.slice(start, end);
    const chunkStr = decode(slice).trim();
    if (chunkStr) {
      chunks.push({ text: chunkStr, tokenCount: slice.length });
    }
    if (end === tokens.length) break;
    start += step;
  }

  return chunks;
}
