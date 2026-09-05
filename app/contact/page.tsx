import { LAWYER, CONTACT_LINKS } from "@/lib/contact";

const CHANNELS = [
  {
    label: "تماس تلفنی",
    value: LAWYER.phone,
    href: CONTACT_LINKS.phone,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4.1c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.3 1.1L6.6 10.8Z" />
      </svg>
    ),
  },
  {
    label: "واتس‌اپ",
    value: LAWYER.phone,
    href: CONTACT_LINKS.whatsapp,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.47 1.29 4.93L2 22l5.29-1.39a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.79 14.07c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.81-.11-.42-.13-.95-.31-1.63-.6-2.87-1.24-4.74-4.15-4.88-4.34-.14-.19-1.17-1.55-1.17-2.96s.72-2.1.98-2.39c.26-.29.56-.36.75-.36s.38 0 .54.01c.18.01.4-.07.63.48.24.58.81 2 .88 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.13.57.17.29.75 1.24 1.61 2.01 1.11.99 2.04 1.3 2.33 1.44.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.63-.14.26.1 1.65.78 1.93.92.29.14.48.22.55.34.07.13.07.72-.17 1.4Z" />
      </svg>
    ),
  },
  {
    label: "ایمیل",
    value: LAWYER.email,
    href: CONTACT_LINKS.email,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  {
    label: "اینستاگرام",
    value: "s.a.mousavi56@",
    href: CONTACT_LINKS.instagram,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function ContactPage() {
  return (
    <main className="container-narrow section">
      <span className="eyebrow">تماس با ما</span>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "18px 0 14px" }}>
        در تماس باشید
      </h1>
      <p style={{ color: "var(--text-dim)", fontSize: 15.5, lineHeight: 2, marginBottom: 32 }}>
        SAMAI برای پاسخ‌های سریع و اولیه به سؤالات مهاجرتی‌ات ساخته شده، اما
        هیچ ابزاری جای بررسی دقیق پرونده‌ی شخصی تو را نمی‌گیرد. اگر می‌خواهی
        موضوعت را با یک وکیل واقعی و باتجربه مطرح کنی، از هرکدام از راه‌های
        زیر می‌توانی مستقیم با {LAWYER.fullNameFa} ({LAWYER.title}، شماره
        پروانه {LAWYER.licenseNumber}) در ارتباط باشی.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
        {CHANNELS.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target={c.href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="card"
            style={{
              padding: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "rgba(217,178,92,0.1)",
                border: "1px solid var(--gold-dim)",
                color: "var(--gold-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {c.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-faint)" }}>{c.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }} dir="ltr">
                {c.value}
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="card" style={{ padding: 22, background: "rgba(52,214,232,0.06)", borderColor: "var(--cyan-dim)" }}>
        <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 2, margin: 0 }}>
          💬 پرونده‌ت فوری است یا نیاز به بررسی حقوقی دقیق داری؟ همین حالا از
          طریق واتس‌اپ یا تماس تلفنی وقت مشاوره بگیر — پاسخ‌گویی سریع و
          تخصصی، دقیقاً برای وضعیت خودت.
        </p>
      </div>
    </main>
  );
}
