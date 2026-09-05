// نگاشت کدهای کشور به ISO2 (استاندارد یکسان برای فیلتر کشور در کل پروژه).
// HUDOC کد ISO3 برمی‌گرداند (مثلاً "ITA")، EUAA اسم کامل کشور به انگلیسی
// (مثلاً "Netherlands")، و ما در ingestion آلمان مستقیم "DE" ذخیره کرده‌ایم.
// این فایل همه را به یک فرمت (ISO2) تبدیل می‌کند تا فیلتر کشور در چت روی
// همه‌ی منابع یکسان کار کند.

export const ISO3_TO_ISO2: Record<string, string> = {
  DEU: "DE", FRA: "FR", ITA: "IT", ESP: "ES", NLD: "NL", AUT: "AT",
  BEL: "BE", SWE: "SE", DNK: "DK", FIN: "FI", POL: "PL", GRC: "GR",
  PRT: "PT", CZE: "CZ", HUN: "HU", ROU: "RO", BGR: "BG", HRV: "HR",
  SVK: "SK", SVN: "SI", LTU: "LT", LVA: "LV", EST: "EE", LUX: "LU",
  MLT: "MT", CYP: "CY", IRL: "IE", GBR: "GB", CHE: "CH", NOR: "NO",
  TUR: "TR", RUS: "RU", UKR: "UA", ALB: "AL", SRB: "RS", AZE: "AZ",
  ARM: "AM", GEO: "GE", MDA: "MD", BIH: "BA", MNE: "ME", MKD: "MK",
  ISL: "IS", LIE: "LI", AND: "AD", SMR: "SM", MCO: "MC", USA: "US",
};

export const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  germany: "DE", france: "FR", italy: "IT", spain: "ES", netherlands: "NL",
  austria: "AT", belgium: "BE", sweden: "SE", denmark: "DK", finland: "FI",
  poland: "PL", greece: "GR", portugal: "PT", "czech republic": "CZ", czechia: "CZ",
  hungary: "HU", romania: "RO", bulgaria: "BG", croatia: "HR", slovakia: "SK",
  slovenia: "SI", lithuania: "LT", latvia: "LV", estonia: "EE", luxembourg: "LU",
  malta: "MT", cyprus: "CY", ireland: "IE",
  switzerland: "CH", norway: "NO", "united kingdom": "GB",
  turkey: "TR", "türkiye": "TR", russia: "RU", serbia: "RS",
  albania: "AL", armenia: "AM", azerbaijan: "AZ",
};

export const COUNTRY_LABEL_FA: Record<string, string> = {
  US: "آمریکا", DE: "آلمان", FR: "فرانسه", IT: "ایتالیا", ES: "اسپانیا",
  NL: "هلند", AT: "اتریش", BE: "بلژیک", SE: "سوئد", DK: "دانمارک",
  FI: "فنلاند", PL: "لهستان", GR: "یونان", PT: "پرتغال", CZ: "چک",
  HU: "مجارستان", RO: "رومانی", BG: "بلغارستان", HR: "کرواسی", SK: "اسلواکی",
  SI: "اسلوونی", LT: "لیتوانی", LV: "لتونی", EE: "استونی", LU: "لوکزامبورگ",
  MT: "مالت", CY: "قبرس", IE: "ایرلند", GB: "بریتانیا", CH: "سوئیس",
  NO: "نروژ", TR: "ترکیه", RS: "صربستان", AZ: "آذربایجان", AM: "ارمنستان",
  AL: "آلبانی", RU: "روسیه", UA: "اوکراین", GE: "گرجستان", MD: "مولداوی",
  BA: "بوسنی و هرزگوین", ME: "مونته‌نگرو", MK: "مقدونیه شمالی", IS: "ایسلند",
  LI: "لیختن‌اشتاین",
};

/** فقط کشورهایی که واقعاً در دیتابیس داده دارند (برای دراپ‌داون انتخاب کشور در چت).
 * برای US/DE/NL/ES علاوه بر آرای قضایی، متن کامل قوانین ملی هم ایندکس شده. */
export const COUNTRIES_WITH_COVERAGE = [
  "US", "DE", "NL", "ES", "TR", "BG", "GR", "IT", "LT", "SE", "RU", "DK",
  "GB", "EE", "PL", "RS", "AZ", "SK", "FI", "BE", "AL", "AM", "FR", "IE",
  "HR", "HU", "CH", "AT", "LV", "CY", "SI", "NO",
];

export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed; // از قبل ISO2
  if (ISO3_TO_ISO2[trimmed.toUpperCase()]) return ISO3_TO_ISO2[trimmed.toUpperCase()];
  const byName = COUNTRY_NAME_TO_ISO2[trimmed.toLowerCase()];
  if (byName) return byName;
  return null; // ناشناخته — به‌جای حدس، خالی می‌ماند
}
