import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    title: "بازیابی از اسناد رسمی",
    desc: "پاسخ‌ها بر پایه متن واقعی eCFR، Federal Register، آرای CourtListener و مقررات EUR-Lex ساخته می‌شوند، نه حدس مدل زبانی.",
    icon: "📚",
  },
  {
    title: "ارجاع دقیق به ماده قانونی",
    desc: "زیر هر پاسخ، مستقیم به شماره ماده یا بخش قانونی منبع (مثلاً 8 CFR § 204.1) اشاره می‌شود تا قابل بررسی باشد.",
    icon: "§",
  },
  {
    title: "فارسیِ روان، نه ترجمه ماشینی",
    desc: "خروجی نهایی با Qwen3.8-Max به فارسیِ طبیعی و قابل‌فهم نوشته می‌شود، متناسب با لحن رسمی یا محاوره‌ای سؤال شما.",
    icon: "🗣️",
  },
  {
    title: "پوشش دو حوزه قضایی",
    desc: "هم قوانین مهاجرتی فدرال آمریکا و هم مقررات اتحادیه اروپا در یک پلتفرم، با تفکیک شفاف حوزه قضایی هر پاسخ.",
    icon: "🌍",
  },
  {
    title: "جست‌وجوی برداری واقعی",
    desc: "embedding چندزبانه (BAAI/bge-m3) و جست‌وجوی شباهت برداری روی pgvector، نه جست‌وجوی کلیدواژه‌ای ساده.",
    icon: "🧭",
  },
  {
    title: "شفافیت کامل",
    desc: "اگر اطلاعات کافی در منابع بازیابی‌شده نباشد، SAMAI صادقانه می‌گوید و حدس نمی‌زند.",
    icon: "🛡️",
  },
];

const STEPS = [
  {
    n: "۱",
    title: "بازیابی",
    desc: "سؤال شما embed می‌شود و مرتبط‌ترین بخش‌های قانونی از میان اسناد ایندکس‌شده پیدا می‌شوند.",
  },
  {
    n: "۲",
    title: "تحلیل",
    desc: "متن‌های بازیابی‌شده همراه با سؤال شما در اختیار Qwen3.8-Max قرار می‌گیرد.",
  },
  {
    n: "۳",
    title: "پاسخ مستند",
    desc: "پاسخی کامل، دقیق و به فارسی روان تولید می‌شود؛ همراه با لینک مستقیم به منبع رسمی هر ادعا.",
  },
];

const SOURCES = ["eCFR", "Federal Register", "CourtListener", "EUR-Lex"];

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="section" style={{ paddingTop: 72 }}>
        <div className="container hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "center" }}>
          <div>
            <span className="eyebrow">⚖️ دستیار حقوقی هوشمند مهاجرت</span>
            <h1
              style={{
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 800,
                lineHeight: 1.25,
                margin: "22px 0 18px",
              }}
            >
              <span className="gradient-text">SAMAI</span> — ذهن هوشمند وکالت
              <br />
              برای قوانین مهاجرتی اروپا و آمریکا
            </h1>
            <p style={{ color: "var(--text-dim)", fontSize: 17, lineHeight: 2, maxWidth: 540 }}>
              سؤال‌های خودت را درباره گرین کارت، پناهندگی، ویزا و آیین دادرسی
              مهاجرت به فارسی بپرس. SAMAI با جست‌وجو در متن واقعی قوانین رسمی
              اتحادیه اروپا و آمریکا، پاسخی دقیق و مستند به تو می‌دهد.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
              <Link href="/chat" className="btn btn-primary">
                شروع پرسش ←
              </Link>
              <Link href="/sources" className="btn btn-ghost">
                مشاهده منابع رسمی
              </Link>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 40, flexWrap: "wrap" }}>
              {SOURCES.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-faint)",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "6px 14px",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle, rgba(52,214,232,0.18), transparent 65%)",
                filter: "blur(10px)",
              }}
            />
            <Image
              src="/logo.png"
              alt="SAMAI — Smart Attorney Mind"
              width={340}
              height={340}
              style={{
                position: "relative",
                borderRadius: "50%",
                boxShadow: "0 0 0 1px rgba(217,178,92,0.35), 0 30px 80px -20px rgba(0,0,0,0.7)",
              }}
              priority
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="eyebrow">چرا SAMAI</span>
            <h2 style={{ fontSize: 30, fontWeight: 800, marginTop: 16 }}>
              دستیاری که مستند صحبت می‌کند
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
            className="feature-grid"
          >
            {FEATURES.map((f) => (
              <div key={f.title} className="card" style={{ padding: 26 }}>
                <div style={{ fontSize: 26, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.9 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="eyebrow">روش کار</span>
            <h2 style={{ fontSize: 30, fontWeight: 800, marginTop: 16 }}>
              از سؤال تا پاسخِ مستند، در سه گام
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="feature-grid">
            {STEPS.map((s) => (
              <div key={s.n} style={{ position: "relative", padding: "0 4px" }}>
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 900,
                    color: "transparent",
                    WebkitTextStroke: "1.5px var(--gold-dim)",
                    marginBottom: 10,
                  }}
                >
                  {s.n}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.9 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div
          className="container"
          style={{
            background: "linear-gradient(135deg, rgba(217,178,92,0.12), rgba(52,214,232,0.08))",
            border: "1px solid var(--border)",
            borderRadius: 26,
            padding: "56px 40px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 14 }}>
            سؤال حقوقی مهاجرتی داری؟
          </h2>
          <p style={{ color: "var(--text-dim)", marginBottom: 28, fontSize: 15 }}>
            همین حالا از SAMAI بپرس و پاسخ مستند به منابع رسمی را دریافت کن.
          </p>
          <Link href="/chat" className="btn btn-primary">
            رفتن به پرسش‌وپاسخ ←
          </Link>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .feature-grid { grid-template-columns: 1fr !important; }
          .hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
