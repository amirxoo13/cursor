# پلتفرم پرسش‌وپاسخ قوانین مهاجرتی (اروپا + آمریکا)

پلتفرم RAG (بازیابی سپس تولید) برای پاسخ‌دهی به فارسی به سؤالات درباره قوانین
مهاجرتی اتحادیه اروپا و آمریکا، بر اساس اسناد رسمی و مدل Qwen3.8-Max.

## استک فنی

- **Next.js 14 (App Router)** — فرانت‌اند و API route چت
- **Neon Postgres + pgvector** — ذخیره‌سازی اسناد قانونی و embeddingها
- **Hugging Face Inference API (`BAAI/bge-m3`)** — embedding چندزبانه (فارسی/انگلیسی)
- **Qwen3.8-Max (DashScope)** — تولید پاسخ نهایی

## منابع داده (همه واقعی، بدون شبیه‌سازی)

| منبع | حوزه | کلید لازم؟ |
|---|---|---|
| [eCFR API](https://ecfr.federalregister.gov/developers/documentation/api/v1) — Title 8 | آمریکا | خیر |
| [Federal Register API](https://www.federalregister.gov/developers/documentation/api/v1) | آمریکا | خیر |
| [CourtListener API v4](https://www.courtlistener.com/help/api/rest/) | آمریکا (آرای دادگاه/BIA) | اختیاری (برای متن کامل رای) |
| [EUR-Lex Cellar SPARQL](https://publications.europa.eu/webapi/rdf/sparql) + [EUR-Lex TXT](https://eur-lex.europa.eu/) | اتحادیه اروپا | خیر |

## ⚠️ وضعیت تست در این محیط توسعه — مهم بخوان

طبق قانون طلایی پروژه، هیچ داده یا پاسخ جعلی/شبیه‌سازی‌شده در کد وجود ندارد.
همه چیز با API واقعی نوشته شده. اما در محیطی که این پروژه ساخته شد **هیچ‌کدام
از کلیدهای API (`DATABASE_URL` نئون، `HF_TOKEN`، `QWEN_API_KEY`) در دسترس
نبودند**، بنابراین:

✅ **واقعاً تست و تایید شد (خروجی واقعی از API واقعی گرفته شد):**
- واکشی و پارس XML واقعی از eCFR API (`scripts/ingest-ecfr.ts`) — مثلاً روی
  Part 204 و 208 اجرا شد و ۵۶ بخش قانونی واقعی با موفقیت استخراج شد.
- واکشی اسناد واقعی از Federal Register API (`scripts/ingest-federal-register.ts`).
- جست‌وجوی واقعی در CourtListener v4 (`scripts/ingest-courtlistener.ts`).
- اجرای واقعی کوئری SPARQL روی EUR-Lex Cellar و واکشی متن کامل مقررات از
  eur-lex.europa.eu (`scripts/ingest-eurlex.ts`).
- `npm run build` با موفقیت کامل (شامل type-check) اجرا شد.
- سرور واقعاً بالا آمد و `POST /api/chat` واقعاً فراخوانی شد؛ چون `HF_TOKEN`
  نبود، پاسخ یک خطای صریح و درست بود (نه پاسخ جعلی) — دقیقاً رفتار مورد
  انتظار طبق قانون طلایی.
- صفحه اصلی با RTL و فونت Vazirmatn درست رندر شد.

❌ **قابل تست نبود (چون کلید/دیتابیس نداشتم) و باید خودت تست کنی:**
- محاسبه واقعی embedding از HF Inference API (نیاز به `HF_TOKEN`)
- اجرای migration و ذخیره رکورد در Neon (نیاز به `DATABASE_URL`)
- فراخوانی واقعی Qwen3.8-Max برای تولید پاسخ نهایی (نیاز به `QWEN_API_KEY`)
- ingestion کامل (end-to-end با ذخیره در دیتابیس)

هیچ‌کدام از این بخش‌ها با کد جعلی جایگزین نشده‌اند — فقط تا وقتی کلید واقعی
ندهی، با خطای صریح متوقف می‌شوند (نگاه کن به `lib/embeddings.ts`, `lib/qwen.ts`,
`lib/db.ts`).

## راه‌اندازی Local

### ۱. نصب وابستگی‌ها

```bash
npm install
```

### ۲. ساخت `.env.local`

```bash
cp .env.example .env.local
```

مقادیر زیر را پر کن (توضیح کامل هرکدام در `.env.example` است):

- `DATABASE_URL` — از [Neon](https://neon.tech) یا Vercel Marketplace یک
  دیتابیس Postgres بساز.
- `HF_TOKEN` — از [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
- `QWEN_API_KEY` — از کنسول DashScope (Alibaba Cloud Model Studio)
- `COURTLISTENER_TOKEN` — اختیاری، برای متن کامل آرای دادگاه

### ۳. اجرای migration

```bash
npm run migrate
```

این دستور extension `vector` را فعال می‌کند و جدول `legal_documents` +
ایندکس HNSW را می‌سازد (`db/migrations/001_init.sql`).

### ۴. ingestion داده (پر کردن دیتابیس)

```bash
npm run ingest:ecfr              # کل Title 8 eCFR (ممکن است طولانی باشد؛
                                  # برای تست سریع: ECFR_PARTS=204,208 npm run ingest:ecfr)
npm run ingest:federal-register  # بخشنامه‌های DHS/USCIS/ICE/EOIR
npm run ingest:courtlistener     # آرای BIA و دادگاه‌های فدرال
npm run ingest:eurlex            # مقررات اتحادیه اروپا (Cellar SPARQL)

# یا همه با هم:
npm run ingest:all
```

اگر `HF_TOKEN` یا `DATABASE_URL` را تنظیم نکرده باشی، اسکریپت‌ها به‌صورت
**dry run** اجرا می‌شوند: واکشی و پارس واقعی انجام می‌شود ولی چیزی در
دیتابیس ذخیره نمی‌شود — همراه با پیام هشدار صریح.

### ۵. اجرای dev server

```bash
npm run dev
```

به `http://localhost:3000` برو و سؤالت را بپرس.

## دیپلوی روی Vercel

1. ریپو را به Vercel وصل کن.
2. از Vercel Marketplace یک دیتابیس **Neon Postgres** اضافه کن (یا
   `DATABASE_URL` خودت را دستی در Environment Variables بگذار).
3. متغیرهای محیطی `HF_TOKEN`, `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL`,
   `COURTLISTENER_TOKEN` را در تنظیمات پروژه در Vercel اضافه کن.
4. Deploy کن.
5. migration و ingestion را یک‌بار از local (با همان `DATABASE_URL` پروداکشن)
   اجرا کن، یا آن‌ها را به‌صورت یک اسکریپت جدا در CI/cron اجرا کن (به‌خصوص
   `ingest:eurlex` که batch است، نه real-time).

## ساختار پروژه

```
app/
  layout.tsx          # layout با RTL + فونت Vazirmatn
  page.tsx             # UI چت
  api/chat/route.ts    # RAG API: embed سؤال → جست‌وجوی pgvector → Qwen
  globals.css
lib/
  db.ts                # اتصال Neon (HTTP driver) + insert/search
  embeddings.ts         # HF Inference API (BAAI/bge-m3)
  qwen.ts               # Qwen3.8-Max (DashScope, سازگار با OpenAI)
  chunk.ts              # chunking واقعی توکن‌محور (gpt-tokenizer)
db/migrations/001_init.sql
scripts/
  run-migration.ts
  ingest-ecfr.ts
  ingest-federal-register.ts
  ingest-courtlistener.ts
  ingest-eurlex.ts
```

## محدودیت‌های شناخته‌شده

- ingestion کامل Title 8 eCFR شامل ۱۳۲ part و صدها section است — اجرای کامل
  آن (با embedding واقعی) ممکن است زمان‌بر باشد و به quota واقعی HF Inference
  API نیاز دارد.
- بدون `COURTLISTENER_TOKEN`، فقط snippet کوتاه رای‌ها (نه متن کامل) ایندکس
  می‌شود.
- نام دقیق مدل روی حساب Qwen شما ممکن است با `qwen3-max` پیش‌فرض فرق داشته
  باشد — با `QWEN_MODEL` در `.env.local` قابل تنظیم است.
