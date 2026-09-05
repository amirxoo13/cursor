const SOURCES = [
  {
    name: "eCFR",
    full: "Electronic Code of Federal Regulations — Title 8 (Aliens and Nationality)",
    desc: "متن رسمی و به‌روزِ مقررات فدرال مهاجرت آمریکا. آپدیت‌شونده روزانه و منبع اصلیِ استنادهای «8 CFR §».",
    url: "https://ecfr.federalregister.gov",
    jurisdiction: "آمریکا",
  },
  {
    name: "Federal Register",
    full: "روزنامه رسمی دولت فدرال آمریکا",
    desc: "بخشنامه‌ها، قوانین جدید و اطلاعیه‌های DHS، USCIS، ICE و EOIR درباره مهاجرت.",
    url: "https://www.federalregister.gov",
    jurisdiction: "آمریکا",
  },
  {
    name: "CourtListener",
    full: "بانک آرای قضایی دادگاه‌های فدرال آمریکا و Board of Immigration Appeals",
    desc: "آرای واقعی BIA و دادگاه‌های تجدیدنظر فدرال درباره پرونده‌های پناهندگی و اخراج.",
    url: "https://www.courtlistener.com",
    jurisdiction: "آمریکا",
  },
  {
    name: "EUR-Lex",
    full: "پایگاه رسمی حقوق اتحادیه اروپا (از طریق Cellar SPARQL endpoint)",
    desc: "مقررات و دستورالعمل‌های در حال اجرای اتحادیه اروپا درباره پناهندگی و مهاجرت، شامل هر ۹ سند «پیمان جدید مهاجرت و پناهندگی» (لازم‌الاجرا از ۱۲ ژوئن ۲۰۲۶).",
    url: "https://eur-lex.europa.eu",
    jurisdiction: "اتحادیه اروپا",
  },
  {
    name: "HUDOC (ECHR)",
    full: "بانک آرای دادگاه اروپایی حقوق بشر",
    desc: "آرای واقعی مرتبط با اخراج، دیپورت، پناهندگی و بازداشت مهاجرتی (مواد ۳، ۵، ۸ و ۱۳ کنوانسیون اروپایی حقوق بشر).",
    url: "https://hudoc.echr.coe.int",
    jurisdiction: "اتحادیه اروپا",
  },
  {
    name: "EUAA Case Law Database",
    full: "پایگاه آرای قضایی ملی کشورهای عضو درباره پناهندگی (European Union Agency for Asylum)",
    desc: "خلاصه انگلیسی آرای دادگاه‌های ملی (آلمان، هلند، فرانسه، اسپانیا، لهستان و...) درباره اجرای مقررات جدید پناهندگی اتحادیه اروپا.",
    url: "https://caselaw.euaa.europa.eu",
    jurisdiction: "اتحادیه اروپا",
  },
  {
    name: "Gesetze im Internet",
    full: "پایگاه رسمی قوانین فدرال آلمان (وزارت دادگستری آلمان)",
    desc: "متن کامل Aufenthaltsgesetz (قانون اقامت)، Asylgesetz (قانون پناهندگی)، Staatsangehörigkeitsgesetz (قانون تابعیت) و سایر مقررات ملی آلمان.",
    url: "https://www.gesetze-im-internet.de",
    jurisdiction: "آلمان",
  },
  {
    name: "EMN",
    full: "شبکه مهاجرت اروپا (European Migration Network) — کمیسیون اروپا",
    desc: "گزارش «Asylum and Migration Overview 2025» — تحلیل جامع تحولات قانونی و سیاستی مهاجرت و پناهندگی اتحادیه اروپا در سال ۲۰۲۵.",
    url: "https://home-affairs.ec.europa.eu/networks/european-migration-network-emn_en",
    jurisdiction: "اتحادیه اروپا",
  },
  {
    name: "wetten.overheid.nl",
    full: "پایگاه رسمی قوانین هلند (دولت هلند)",
    desc: "متن کامل Vreemdelingenwet 2000 (قانون اتباع بیگانه)، Vreemdelingenbesluit 2000 (آیین‌نامه اجرایی) و Rijkswet op het Nederlanderschap (قانون تابعیت هلند).",
    url: "https://wetten.overheid.nl",
    jurisdiction: "هلند",
  },
  {
    name: "BOE",
    full: "روزنامه رسمی دولت اسپانیا (Boletín Oficial del Estado)",
    desc: "متن کامل Ley Orgánica 4/2000 (قانون حقوق اتباع بیگانه اسپانیا) و آیین‌نامه اجرایی آن (Real Decreto 557/2011).",
    url: "https://www.boe.es",
    jurisdiction: "اسپانیا",
  },
];

const PIPELINE = [
  {
    title: "Ingestion",
    desc: "اسکریپت‌های اختصاصی هر منبع را به‌صورت واقعی فراخوانی می‌کنند: eCFR API (XML)، Federal Register API، CourtListener v4، کوئری SPARQL روی EUR-Lex Cellar، HUDOC، EUAA، قوانین رسمی XML آلمان، و استخراج متن PDF گزارش‌های EMN.",
  },
  {
    title: "Chunking",
    desc: "متن هر سند به قطعات ~۵۰۰ توکنی با هم‌پوشانی ۵۰ توکن تقسیم می‌شود (توکن‌شماری واقعی، نه تقریبی).",
  },
  {
    title: "Embedding",
    desc: "هر قطعه با مدل چندزبانه BAAI/bge-m3 (از طریق Hugging Face Inference API) به بردار ۱۰۲۴‌بعدی تبدیل می‌شود.",
  },
  {
    title: "ذخیره‌سازی",
    desc: "بردارها در Neon Postgres با extension pgvector و ایندکس HNSW ذخیره می‌شوند.",
  },
  {
    title: "بازیابی + تولید",
    desc: "در زمان سؤال، مرتبط‌ترین قطعات با جست‌وجوی شباهت کسینوسی پیدا شده و همراه سؤال به Qwen3.8-Max داده می‌شود تا پاسخ نهایی فارسی تولید شود.",
  },
];

export default function SourcesPage() {
  return (
    <main className="container-narrow section">
      <span className="eyebrow">روش‌شناسی</span>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "18px 0 14px" }}>
        منابع رسمی و نحوه کار SAMAI
      </h1>
      <p style={{ color: "var(--text-dim)", fontSize: 15.5, lineHeight: 2, marginBottom: 40 }}>
        SAMAI هیچ پاسخی را از حافظه مدل زبانی حدس نمی‌زند. هر پاسخ نتیجه‌ی
        جست‌وجوی واقعی در متن قوانین رسمی زیر است (معماری RAG — بازیابی سپس
        تولید).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 56 }}>
        {SOURCES.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="card"
            style={{ padding: 22, display: "block" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: "var(--gold-light)" }}>{s.name}</span>
              <span
                style={{
                  fontSize: 11.5,
                  color: "var(--cyan)",
                  border: "1px solid var(--cyan-dim)",
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
              >
                {s.jurisdiction}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 4 }}>{s.full}</div>
            <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 10, lineHeight: 1.9 }}>{s.desc}</p>
          </a>
        ))}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>پایپ‌لاین فنی</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 40 }}>
        {PIPELINE.map((p, i) => (
          <div key={p.title} style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "1.5px solid var(--gold-dim)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--gold-light)",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              {i < PIPELINE.length - 1 && (
                <div style={{ width: 1.5, flex: 1, background: "var(--border)", margin: "4px 0" }} />
              )}
            </div>
            <div style={{ paddingBottom: 28 }}>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 6 }}>{p.title}</h3>
              <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.9 }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 22, background: "rgba(217,178,92,0.06)", borderColor: "var(--gold-dim)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "var(--gold-light)" }}>
          محدودیت‌های شناخته‌شده
        </h3>
        <ul style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 2, paddingRight: 18, margin: 0 }}>
          <li>متن کامل آرای CourtListener نیازمند توکن API است؛ بدون آن از خلاصه (snippet) استفاده می‌شود.</li>
          <li>
            متن کامل قوانین ملی فعلاً فقط برای آلمان، هلند و اسپانیا ایندکس شده
            (بقیه‌ی کشورهای عضو فقط از طریق آرای HUDOC/EUAA پوشش دارند، نه متن
            کامل قانون). فرانسه به‌خاطر محافظت ضدربات Cloudflare سایت رسمی‌اش
            فعلاً قابل ایندکس خودکار نیست.
          </li>
          <li>پایگاه EUAA به‌دلیل نبود API عمومی، از طریق اسکن شناسه سند اسکن می‌شود و فقط بازه‌ای از جدیدترین آرا را پوشش می‌دهد.</li>
          <li>برای پرونده‌های پیچیده یا تصمیم‌های حساس، <a href="/contact" style={{ color: "var(--gold-light)" }}>مشاوره تخصصی با تیم حقوقی SAMAI</a> بهترین قدم بعدی است.</li>
        </ul>
      </div>
    </main>
  );
}
