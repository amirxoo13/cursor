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
    desc: "مقررات و دستورالعمل‌های در حال اجرای اتحادیه اروپا درباره پناهندگی و مهاجرت (Directory codes 191030 و 191040).",
    url: "https://eur-lex.europa.eu",
    jurisdiction: "اتحادیه اروپا",
  },
];

const PIPELINE = [
  {
    title: "Ingestion",
    desc: "اسکریپت‌های اختصاصی هر منبع را به‌صورت واقعی فراخوانی می‌کنند: eCFR API (XML)، Federal Register API، CourtListener v4 و کوئری SPARQL روی EUR-Lex Cellar.",
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
          <li>پوشش کامل Title 8 eCFR در حال گسترش تدریجی است.</li>
          <li>متن کامل آرای CourtListener نیازمند توکن API است؛ بدون آن از خلاصه (snippet) استفاده می‌شود.</li>
          <li>SAMAI جایگزین مشاوره حقوقی رسمی نیست و برای تصمیم‌های حقوقی حتماً با وکیل مشورت کنید.</li>
        </ul>
      </div>
    </main>
  );
}
