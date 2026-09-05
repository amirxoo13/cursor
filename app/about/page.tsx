import Image from "next/image";
import SocialIcons from "@/components/SocialIcons";
import { LAWYER, CONTACT_LINKS } from "@/lib/contact";

export default function AboutPage() {
  return (
    <main className="container-narrow section">
      <span className="eyebrow">درباره ما</span>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "18px 0 14px" }}>
        SAMAI — Smart Attorney Mind
      </h1>
      <p style={{ color: "var(--text-dim)", fontSize: 15.5, lineHeight: 2, marginBottom: 36 }}>
        SAMAI برای رفاه حال هموطنان عزیزمان ساخته شده — تا هرکس که سؤالی
        درباره‌ی اقامت، ویزا، پناهندگی یا هر موضوع دیگری در حوزه‌ی مهاجرت
        اروپا و آمریکا دارد، بتواند در کوتاه‌ترین زمان و به زبان فارسیِ روان،
        پاسخی دقیق و مستند به منابع رسمی دریافت کند؛ بدون واسطه‌ی ترجمه‌های
        ناقص یا اطلاعات پراکنده و قدیمی.
      </p>

      <div className="card" style={{ padding: 28, marginBottom: 40 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <Image
            src="/logo.png"
            alt="SAMAI"
            width={84}
            height={84}
            style={{ borderRadius: "50%", flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: 19 }}>{LAWYER.fullNameFa}</div>
            <div style={{ fontSize: 13.5, color: "var(--gold-light)", marginTop: 4 }}>
              {LAWYER.title}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 6 }} dir="ltr">
              {LAWYER.fullNameEn}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 14,
            paddingTop: 18,
            borderTop: "1px solid var(--border)",
            marginBottom: 18,
          }}
        >
          <InfoItem label="شماره پروانه" value={LAWYER.licenseNumber} />
          <InfoItem label="نام" value={LAWYER.firstNameFa} />
          <InfoItem label="نام خانوادگی" value={LAWYER.lastNameFa} />
          <InfoItem label="کانون وکلا" value="مرکز" />
        </div>

        <div style={{ paddingTop: 4 }}>
          <SocialIcons />
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>چشم‌انداز</h2>
      <p style={{ color: "var(--text-dim)", fontSize: 14.5, lineHeight: 2, marginBottom: 28 }}>
        قوانین مهاجرتی معمولاً پیچیده، پراکنده در چند منبع رسمی، و به زبانی
        حقوقیِ سنگین نوشته شده‌اند. SAMAI با ترکیب بازیابی اطلاعات از متن
        اصلی قوانین (نه خلاصه یا حدس) و تولید پاسخ با هوش مصنوعی، زیر نظارت
        مستقیم {LAWYER.fullNameFa}، تلاش می‌کند این فاصله را کم کند — همیشه
        با ارجاع شفاف به منبع رسمی هر پاسخ.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>اصول ما</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
        {[
          ["صداقت در عدم قطعیت", "اگر پاسخی در منابع رسمی پیدا نشود، SAMAI آن را صادقانه اعلام می‌کند و حدس نمی‌زند."],
          ["ارجاع‌پذیری", "هر ادعا باید به یک ماده، بخش یا رای قانونی مشخص قابل ردیابی باشد."],
          ["به‌روز بودن", "منابع مستقیماً از API های رسمی (نه آرشیوهای ثابت) خوانده و ایندکس می‌شوند."],
          ["همراهی واقعی", "برای پرونده‌های خاص و پیچیده، همیشه یک تیم حقوقی واقعی پشت SAMAI آماده‌ی کمک است."],
        ].map(([title, desc]) => (
          <div key={title} className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6, color: "var(--gold-light)" }}>
              {title}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.9 }}>{desc}</div>
          </div>
        ))}
      </div>

      <div
        className="card"
        style={{
          padding: 24,
          background: "linear-gradient(135deg, rgba(217,178,92,0.1), rgba(52,214,232,0.06))",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 14.5, color: "var(--text)", lineHeight: 2, marginBottom: 16 }}>
          برای مشاوره تخصصی و بررسی دقیق پرونده‌ی مهاجرتی‌ات، همین حالا با
          ما در ارتباط باش.
        </p>
        <a href={CONTACT_LINKS.whatsapp} target="_blank" rel="noreferrer" className="btn btn-primary">
          شروع گفت‌وگو در واتس‌اپ ←
        </a>
      </div>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{value}</div>
    </div>
  );
}
