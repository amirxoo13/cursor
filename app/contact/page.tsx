export default function ContactPage() {
  return (
    <main className="container-narrow section">
      <span className="eyebrow">تماس با ما</span>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "18px 0 14px" }}>
        در تماس باشید
      </h1>
      <p style={{ color: "var(--text-dim)", fontSize: 15.5, lineHeight: 2, marginBottom: 32 }}>
        برای گزارش خطا در پاسخ‌ها، پیشنهاد منبع قانونی جدید، یا هر سؤال دیگری
        درباره SAMAI، از راه زیر با ما در تماس باش.
      </p>

      <div className="card" style={{ padding: 26, marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 6 }}>ایمیل</div>
        <a href="mailto:contact@samai.legal" style={{ fontSize: 18, fontWeight: 700, color: "var(--cyan)" }}>
          contact@samai.legal
        </a>
      </div>

      <div className="card" style={{ padding: 22, background: "rgba(217,178,92,0.06)", borderColor: "var(--gold-dim)" }}>
        <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 2, margin: 0 }}>
          ⚠️ توجه: SAMAI یک پلتفرم اطلاع‌رسانی مبتنی بر هوش مصنوعی است و
          پاسخ‌های آن جایگزین مشاوره حقوقی رسمی نیست. برای تصمیم‌گیری در
          پرونده‌های واقعی مهاجرتی حتماً با وکیل مهاجرت مشورت کنید.
        </p>
      </div>
    </main>
  );
}
