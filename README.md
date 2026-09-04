# SAMAI — Smart Attorney Mind

پلتفرم پرسش‌وپاسخ هوشمند قوانین مهاجرتی اتحادیه اروپا و آمریکا. معماری RAG
(بازیابی سپس تولید): سؤال فارسی کاربر → جست‌وجوی برداری در متن واقعی قوانین
رسمی → تولید پاسخ فارسیِ روان و مستند با Qwen3.8-Max.

## استک فنی

- **Next.js 14 (App Router)** — سایت چندصفحه‌ای (خانه، چت، منابع، درباره، تماس)
- **Neon Postgres + pgvector** — ذخیره‌سازی اسناد قانونی و embeddingها
- **Hugging Face Inference API (`BAAI/bge-m3`)** — embedding چندزبانه ۱۰۲۴‌بعدی
- **Qwen3.8-Max (DashScope)** — تولید پاسخ نهایی فارسی

## منابع داده (همه واقعی، بدون شبیه‌سازی)

| منبع | حوزه | کلید لازم؟ |
|---|---|---|
| [eCFR API](https://ecfr.federalregister.gov/developers/documentation/api/v1) — Title 8 | آمریکا | خیر |
| [Federal Register API](https://www.federalregister.gov/developers/documentation/api/v1) | آمریکا | خیر |
| [CourtListener API v4](https://www.courtlistener.com/help/api/rest/) | آمریکا (آرای دادگاه/BIA) | اختیاری (برای متن کامل رای) |
| [EUR-Lex Cellar SPARQL](https://publications.europa.eu/webapi/rdf/sparql) + [EUR-Lex TXT](https://eur-lex.europa.eu/) | اتحادیه اروپا | خیر |

## ✅ وضعیت تست — پایپ‌لاین کامل با کلید واقعی تست شده

برخلاف نسخه اولیه، این پروژه با `DATABASE_URL` (Neon واقعی)، `HF_TOKEN` و
`QWEN_API_KEY` واقعی به‌صورت end-to-end تست شده است:

- `npm run migrate` واقعاً روی Neon اجرا شد و جدول `legal_documents` ساخته شد.
- هر ۴ اسکریپت ingestion واقعاً اجرا شدند و رکورد واقعی در دیتابیس ذخیره کردند
  (eCFR، Federal Register، CourtListener، EUR-Lex).
- `POST /api/chat` با سؤال واقعی فارسی («شرایط گرین کارت خانوادگی چیه؟» و
  «شرایط پناهندگی در اتحادیه اروپا طبق مقررات جدید چیست؟») تست شد و پاسخ
  دقیق، مستند و با ارجاع صحیح به ماده قانونی (مثلاً `8 CFR § 204.1` و
  `Regulation (EU) 2024/1347`) تولید شد.
- `npm run build` با موفقیت کامل (شامل type-check) روی تمام صفحات اجرا شد.

اگر کلیدها را در `.env.local` نگذاری، همه‌چیز باز هم اجرا می‌شود ولی به‌جای
پاسخ جعلی، خطای صریح می‌دهد (نگاه کن به `lib/embeddings.ts`, `lib/qwen.ts`,
`lib/db.ts`) و اسکریپت‌های ingestion به حالت dry-run می‌روند (واکشی و پارس
واقعی، بدون ذخیره).

## ساختار سایت

| مسیر | توضیح |
|---|---|
| `/` | صفحه اصلی (لندینگ) — معرفی SAMAI، ویژگی‌ها، نحوه کار |
| `/chat` | پرسش‌وپاسخ با فیلتر حوزه قضایی (آمریکا / اتحادیه اروپا / همه) |
| `/sources` | منابع رسمی و توضیح شفاف pipeline فنی RAG |
| `/about` | درباره پلتفرم و اصول کاری |
| `/contact` | راه ارتباطی |

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
  دیتابیس Postgres بساز. اگر Vercel اسمش را `DATABASE_URL_UNPOOLED` یا
  `POSTGRES_URL` گذاشت، کد به‌صورت خودکار همان را هم قبول می‌کند.
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
npm run ingest:ecfr              # کل Title 8 eCFR (طولانی است؛
                                  # برای تست سریع: ECFR_PARTS=204,208 npm run ingest:ecfr)
npm run ingest:federal-register  # بخشنامه‌های DHS/USCIS/ICE/EOIR
npm run ingest:courtlistener     # آرای BIA و دادگاه‌های فدرال
npm run ingest:eurlex            # مقررات اتحادیه اروپا (Cellar SPARQL)

# یا همه با هم:
npm run ingest:all
```

اسکریپت‌ها idempotent هستند (چک `documentAlreadyIngested`) — اجرای دوباره‌شان
باعث تکرار رکورد نمی‌شود، فقط اسناد جدید را اضافه می‌کنند.

### ۵. اجرای dev server

```bash
npm run dev
```

به `http://localhost:3000` برو.

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
  layout.tsx           # Navbar + Footer مشترک، RTL، فونت Vazirmatn
  page.tsx              # صفحه اصلی (لندینگ)
  chat/page.tsx          # UI پرسش‌وپاسخ + فیلتر حوزه قضایی
  sources/page.tsx       # منابع و روش‌شناسی
  about/page.tsx         # درباره ما
  contact/page.tsx       # تماس
  api/chat/route.ts      # RAG API: embed سؤال → جست‌وجوی pgvector → Qwen
  icon.png                # فاوآیکون SAMAI
  globals.css
components/
  Navbar.tsx
  Footer.tsx
lib/
  db.ts                 # اتصال Neon (HTTP driver) + insert/search/idempotency
  embeddings.ts          # HF Inference API (BAAI/bge-m3)
  qwen.ts                # Qwen3.8-Max (DashScope, سازگار با OpenAI)
  chunk.ts               # chunking واقعی توکن‌محور (gpt-tokenizer)
db/migrations/001_init.sql
scripts/
  _env.ts                # لود .env.local برای اسکریپت‌های CLI
  run-migration.ts
  ingest-ecfr.ts
  ingest-federal-register.ts
  ingest-courtlistener.ts
  ingest-eurlex.ts
public/
  logo.png                # لوگوی رسمی SAMAI
```

## محدودیت‌های شناخته‌شده

- ingestion کامل Title 8 eCFR شامل ۱۳۲ part است — اجرای کامل آن با embedding
  واقعی زمان‌بر است (اجرای پیوسته در پس‌زمینه توصیه می‌شود).
- بدون `COURTLISTENER_TOKEN`، فقط snippet کوتاه رای‌ها (نه متن کامل) ایندکس
  می‌شود.
- نام دقیق مدل روی حساب Qwen شما ممکن است با `qwen3-max` پیش‌فرض فرق داشته
  باشد — با `QWEN_MODEL` در `.env.local` قابل تنظیم است.
- SAMAI جایگزین مشاوره حقوقی رسمی نیست.
