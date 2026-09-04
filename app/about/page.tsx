import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="container-narrow section">
      <span className="eyebrow">درباره ما</span>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "18px 0 14px" }}>
        SAMAI — Smart Attorney Mind
      </h1>
      <p style={{ color: "var(--text-dim)", fontSize: 15.5, lineHeight: 2, marginBottom: 36 }}>
        SAMAI با یک هدف ساده ساخته شده: دسترسی به قوانین مهاجرتی اروپا و آمریکا
        را برای فارسی‌زبانان شفاف، سریع و مستند کند — بدون واسطه‌ی ترجمه‌های
        ناقص یا اطلاعات پراکنده و قدیمی.
      </p>

      <div className="card" style={{ padding: 28, display: "flex", gap: 20, alignItems: "center", marginBottom: 40 }}>
        <Image
          src="/logo.png"
          alt="SAMAI"
          width={84}
          height={84}
          style={{ borderRadius: "50%", flexShrink: 0 }}
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Dr. S.A. Mousavi</div>
          <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2 }}>
            بنیان‌گذار و مسئول محتوای حقوقی SAMAI
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>چشم‌انداز</h2>
      <p style={{ color: "var(--text-dim)", fontSize: 14.5, lineHeight: 2, marginBottom: 28 }}>
        قوانین مهاجرتی معمولاً پیچیده، پراکنده در چند منبع رسمی، و به زبانی
        حقوقیِ سنگین نوشته شده‌اند. SAMAI با ترکیب بازیابی اطلاعات از متن
        اصلی قوانین (نه خلاصه یا حدس) و تولید پاسخ با هوش مصنوعی، تلاش می‌کند
        این فاصله را کم کند — همیشه با ارجاع شفاف به منبع رسمی هر پاسخ.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>اصول ما</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
        {[
          ["صداقت در عدم قطعیت", "اگر پاسخی در منابع رسمی پیدا نشود، SAMAI آن را صادقانه اعلام می‌کند و حدس نمی‌زند."],
          ["ارجاع‌پذیری", "هر ادعا باید به یک ماده، بخش یا رای قانونی مشخص قابل ردیابی باشد."],
          ["به‌روز بودن", "منابع مستقیماً از API های رسمی (نه آرشیوهای ثابت) خوانده و ایندکس می‌شوند."],
          ["نه جایگزین وکیل", "SAMAI ابزار اطلاع‌رسانی است، نه جایگزین مشاوره حقوقی رسمی."],
        ].map(([title, desc]) => (
          <div key={title} className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6, color: "var(--gold-light)" }}>
              {title}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.9 }}>{desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
